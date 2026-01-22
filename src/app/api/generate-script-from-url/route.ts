import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer-core";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// For Vercel/Lambda deployment
const CHROMIUM_URL = "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

interface ScrapedContent {
    title: string;
    description: string;
    mainContent: string;
    headings: string[];
    url: string;
}

async function getBrowser() {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
        // Local development: use local Chrome
        const possiblePaths = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ];

        let executablePath = "";
        for (const p of possiblePaths) {
            try {
                const fs = await import("fs");
                if (fs.existsSync(p)) {
                    executablePath = p;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!executablePath) {
            throw new Error("Chrome not found. Please install Google Chrome.");
        }

        return puppeteer.launch({
            executablePath,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    } else {
        // Production: use @sparticuz/chromium-min
        const chromium = await import("@sparticuz/chromium-min");
        const executablePath = await chromium.default.executablePath(CHROMIUM_URL);
        return puppeteer.launch({
            args: chromium.default.args,
            executablePath,
            headless: true,
        });
    }
}

async function scrapeUrl(url: string): Promise<ScrapedContent> {
    const browser = await getBrowser();

    try {
        const page = await browser.newPage();

        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 30000
        });

        // Wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));

        const scrapedContent = await page.evaluate((sourceUrl: string) => {
            // Remove unwanted elements
            document.querySelectorAll("script, style, nav, footer, header, aside, .ad, .sidebar, iframe, noscript").forEach(el => el.remove());

            const title = document.title ||
                document.querySelector("h1")?.textContent?.trim() ||
                document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";

            const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ||
                document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";

            const headings: string[] = [];
            document.querySelectorAll("h1, h2, h3").forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length < 200 && !headings.includes(text)) {
                    headings.push(text);
                }
            });

            let mainContent = "";
            const contentSelectors = ["article", "main", ".content", ".post", "#content", "[role='main']", "body"];

            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    mainContent = element.textContent?.trim() || "";
                    if (mainContent.length > 200) break;
                }
            }

            mainContent = mainContent
                .replace(/\s+/g, " ")
                .replace(/\n+/g, "\n")
                .trim()
                .substring(0, 8000);

            return { title, description, mainContent, headings: headings.slice(0, 15), url: sourceUrl };
        }, url);

        return scrapedContent;
    } finally {
        await browser.close();
    }
}

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
    }

    try {
        const { url, targetDuration = 60, style = "educational" } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // Step 1: Scrape the URL with Puppeteer
        const scrapedContent = await scrapeUrl(url);

        // Step 2: Generate script with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const styleGuides: Record<string, string> = {
            educational: "教育的で分かりやすい解説スタイル",
            entertainment: "エンターテイメント性が高いスタイル",
            news: "ニュース番組のような客観的なスタイル",
            summary: "要約・まとめ形式のスタイル"
        };

        const sceneCount = Math.max(3, Math.min(10, Math.ceil(targetDuration / 10)));

        const prompt = `
あなたはプロの動画ディレクター兼脚本家です。以下のWebページの内容を元に、ショート動画の完全な台本を作成してください。

【元URL】
${scrapedContent.url}

【ページタイトル】
${scrapedContent.title}

【ページ概要】
${scrapedContent.description}

【見出し構造】
${scrapedContent.headings.join("\n")}

【本文内容】
${scrapedContent.mainContent}

【スタイル】
${styleGuides[style] || styleGuides.educational}

【要件】
- 目標時間: 約${targetDuration}秒（${sceneCount}シーン程度）
- 各シーンは5〜10秒程度
- 元記事の重要なポイントを分かりやすくまとめる
- ネイティブな日本語で自然に話す台本
- 視聴者の興味を引くオープニング
- 明確な結論やまとめで締める

出力は必ず以下のJSON形式にしてください。
{
  "title": "動画のタイトル（キャッチーで興味を引くもの）",
  "description": "動画の概要説明（50文字以内）",
  "source_url": "${url}",
  "scenes": [
    {
      "scene_index": 1,
      "duration": 5,
      "avatar_script": "アバターが話す台本（自然な日本語）",
      "subtitle": "画面に表示する字幕（簡潔に）",
      "image_prompt": "背景画像生成用の詳細な英語プロンプト（cinematic, high quality, 4K）",
      "emotion": "neutral/happy/serious/excited/thoughtful",
      "sound_effects": [
        {
          "type": "ambient/action/transition/emotion",
          "keyword": "効果音キーワード（英語）",
          "timing": "start/middle/end/throughout",
          "volume": 0.3
        }
      ]
    }
  ],
  "total_duration": 合計秒数,
  "tags": ["関連タグ1", "関連タグ2", "関連タグ3"]
}

注意:
- 元記事の内容を正確に伝える
- avatar_scriptは声に出して読んで自然な日本語にすること
- image_promptは英語で、記事の内容に関連した画像を生成できるように詳細に記述
- 各シーンに1-2個の効果音を含める
`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const scriptData = JSON.parse(result.response.text());

        return NextResponse.json({
            success: true,
            scraped: {
                title: scrapedContent.title,
                url: scrapedContent.url
            },
            script: scriptData
        });

    } catch (error: any) {
        console.error("URL Script Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate script from URL", details: error.message },
            { status: 500 }
        );
    }
}
