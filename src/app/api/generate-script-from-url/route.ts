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

        // 最小3シーン、最大25シーン（1シーンあたり約7-10秒）
        const sceneCount = Math.max(3, Math.min(25, Math.ceil(targetDuration / 8)));

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
      "main_text": {
        "type": "title/quiz/bullet/highlight のいずれか",
        "lines": ["メイン文字1行目", "メイン文字2行目（クイズや箇条書きの場合）"]
      },
      "subtitle": "画面下部に表示するテロップ字幕（短く簡潔に、15文字以内）",
      "voice_text": "音声で読み上げる文章（自然な日本語、句読点や間を意識）",
      "voice_style": "演技指導（どのような声色・トーン・感情で読むか）",
      "image_prompts": [
        "背景画像1の生成プロンプト（日本語、シネマティック、詳細に）"
      ],
      "image_effect": "画像エフェクト（zoomIn/zoomOut/panLeft/panRight/static）",
      "text_animation": "字幕アニメーション（typewriter/fadeIn/slideUp/bounce/none）",
      "transition": "シーン切り替え効果（fade/slide/zoom/cut/dissolve）",
      "emotion": "アバターの表情や話し方（neutral/happy/serious/excited/thoughtful）",
      "emphasis_words": ["強調する単語1", "強調する単語2"],
      "sound_effects": [
        {
          "type": "効果音の種類（ambient/action/transition/emotion）",
          "keyword": "効果音を検索するための英語キーワード",
          "timing": "開始タイミング（start/middle/end/throughout）",
          "volume": 0.3
        }
      ]
    }
  ],
  "total_duration": 合計秒数,
  "tags": ["関連タグ1", "関連タグ2", "関連タグ3"]
}

【メインテキスト（main_text）のタイプ指針】
- "title": 大きなタイトル文字（インパクトのある1〜2行）
- "quiz": クイズ形式（上から順番に3〜4行が出現する演出）
- "bullet": 箇条書き（ポイントを列挙）
- "highlight": 強調テキスト（重要な単語やフレーズを目立たせる）

各シーンで適切なタイプを選んでください：
- オープニング: "title"
- 問題提起やクイズ: "quiz"
- ポイント説明: "bullet"
- 重要キーワード強調: "highlight"

【画像エフェクト（image_effect）の指針】CRITICAL: 各シーンで必ず異なるエフェクトを使用すること！
- "zoomIn": ズームイン（注目を集める、重要シーン向け）
- "zoomOut": ズームアウト（全体を見せる、俯瞰シーン向け）
- "panLeft": 左から右へパン（動きのあるシーン、移動感）
- "panRight": 右から左へパン（逆方向の動き）
- "static": 静止（落ち着いた説明シーン）

画像エフェクトルール（重要）:
- オープニング: "zoomIn" でインパクト
- 説明シーン: "panLeft" または "panRight" で動きをつける
- 強調シーン: "zoomIn" で注目
- まとめシーン: "zoomOut" で俯瞰
- CRITICAL: 同じエフェクトが2回以上連続しないこと！必ずバリエーションをつける

【字幕アニメーション（text_animation）の指針】CRITICAL: 各シーンで適切なアニメーションを選択！
- "typewriter": タイプライター効果（1文字ずつ表示、説明文向け）
- "fadeIn": フェードイン（自然な出現、汎用的）
- "slideUp": 下からスライド（テンポ感、アクティブなシーン）
- "bounce": バウンス（楽しい雰囲気、強調）
- "none": アニメーションなし（静的な表示）

字幕アニメーションルール:
- オープニング: "slideUp" または "bounce" でインパクト
- 説明シーン: "typewriter" で読みやすく
- 強調シーン: "bounce" で目立たせる
- まとめ: "fadeIn" で落ち着いて
- 同じアニメーションが3回以上連続しないこと！

【演技指導（voice_style）の指針】CRITICAL: 人間らしい自然な音声のために必須！
Gemini 2.5 TTSは演技指導で人間のような表現が可能です。各シーンに適切な演技指導を必ず記述すること。

演技指導の書き方:
- 声のトーン: 「明るく元気に」「落ち着いて穏やかに」「真剣に力強く」
- 感情表現: 「驚きを込めて」「ワクワクした気持ちで」「共感を込めて」
- 話し方: 「ゆっくりはっきりと」「テンポよく軽快に」「囁くように小声で」
- 演技: 「友達に話しかけるように」「ニュースキャスターのように」「先生が教えるように」

シーンごとの演技指導例:
- オープニング: 「明るく元気に、視聴者の興味を引くように、少しテンションを上げて」
- 問題提起: 「真剣に、問いかけるように、少し間を置いて」
- 驚きの事実: 「驚きを込めて、『えっ！？』という感情を乗せて」
- 解説: 「落ち着いて穏やかに、わかりやすく丁寧に説明するように」
- 重要ポイント: 「力を込めて、ここが大事だと強調するように、ゆっくりと」
- まとめ: 「温かみのある声で、視聴者に語りかけるように、満足感を込めて」
- CTA（行動喚起）: 「親しみを込めて、背中を押すように、明るく前向きに」

CRITICAL: voice_styleは必ず各シーンに含めること！空欄禁止！

【シーン切り替え効果（transition）の指針】
- "fade": フェード（落ち着いた場面転換、デフォルト）
- "slide": スライド（テンポの良い場面転換）
- "zoom": ズーム（強調・インパクト、重要ポイント向け）
- "cut": カット（即切り替え、緊張感）
- "dissolve": ディゾルブ（滑らかな切り替え）

シーン切り替えルール:
- オープニング（最初のシーン）: "zoom" で注目を集める
- 説明シーン間: "fade" または "dissolve" で自然に
- 重要ポイント: "zoom" で強調
- テンポアップ時: "slide" または "cut" で勢いをつける
- 同じ効果が3回連続しないようにバリエーションをつける

【強調単語（emphasis_words）の指針】
- 各シーンで特に重要な単語を2-3個選ぶ
- 数字、固有名詞、キーワードを優先
- 例: ["プログラミング", "無料", "今すぐ"]

効果音の種類ガイド:
- ambient: 環境音（オフィス、自然、カフェなど）
- action: アクション音（タイピング、クリック、ページめくりなど）
- transition: 場面転換音（whoosh, swipe, pop）
- emotion: 感情を表す音（success chime, fail buzzer, suspense）

注意:
- 元記事の内容を正確に伝える
- voice_textは声に出して読んで自然な日本語にすること
- 「えー」「まあ」などのフィラーは適度に入れても良い

【画像プロンプト（image_prompts）の作成ルール】
CRITICAL: 以下のルールを厳守すること

1. **日本語で記述** - 必ず日本語で記述する
2. **日本的要素** - 人物は「日本人」「アジア系」、場所は「日本の」を明記
3. **シネマティック構図** - 以下の要素を組み込む:
   - カメラアングル: 「アイレベル」「ローアングル」「俯瞰」など
   - ライティング: 「自然光」「ゴールデンアワー」「スタジオライティング」など
   - 色調: 「温かみのある色調」「クールトーン」「鮮やかな色彩」など
   - 被写界深度: 「浅い被写界深度で背景ぼかし」など

4. **Ken Burns効果対応** - パン・ズームに適した構図:
   - 「余白のある構図」を意識
   - 「被写体は画面中央やや左/右に配置」などの指示
   - 「奥行きのある配置」で動きを出しやすくする

5. **AI感を消す工夫**:
   - 完璧すぎない自然な構図（「やや傾いた」「ナチュラルな」）
   - リアルな光の表現（「窓からの自然光」「柔らかい影」）
   - 人間らしさ（「笑顔の」「考え込んでいる」などの自然な表情）

6. **具体例**:
   良い例: 「日本の現代的なオフィスで働く若い日本人ビジネスマン、ノートPCでタイピング中、窓からの自然光で温かみのある色調、アイレベルのカメラアングル、浅い被写界深度で背景ぼかし、被写体は画面右寄りに配置、16:9、映画的な構図」

   悪い例: 「オフィスで働く人、きれいな画像」（日本的要素なし、構図指示なし、抽象的すぎる）

- 記事の内容に関連した画像を生成できるように詳細に記述
- 画像プロンプトは最低50文字以上、具体的に記述すること
- 各シーンに1-2個の効果音を必ず含める
- transitionとemphasis_wordsは必ず各シーンに含める
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
