import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";

// For Vercel/Lambda deployment
const CHROMIUM_URL = "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

interface ScrapedContent {
    title: string;
    description: string;
    mainContent: string;
    headings: string[];
    images: string[];
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

export async function POST(req: NextRequest) {
    let browser = null;

    try {
        const { url, waitForJs = true } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        browser = await getBrowser();
        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        // Navigate to URL
        await page.goto(url, {
            waitUntil: waitForJs ? "networkidle2" : "domcontentloaded",
            timeout: 30000
        });

        // Wait a bit for dynamic content
        if (waitForJs) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Extract content using page.evaluate
        const scrapedContent = await page.evaluate((sourceUrl: string) => {
            // Remove unwanted elements
            const unwantedSelectors = "script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, iframe, noscript";
            document.querySelectorAll(unwantedSelectors).forEach(el => el.remove());

            // Get title
            const title = document.title ||
                document.querySelector("h1")?.textContent?.trim() ||
                document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";

            // Get description
            const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ||
                document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";

            // Get headings
            const headings: string[] = [];
            document.querySelectorAll("h1, h2, h3").forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length < 200 && !headings.includes(text)) {
                    headings.push(text);
                }
            });

            // Get main content
            let mainContent = "";
            const contentSelectors = ["article", "main", ".content", ".post", ".entry", "#content", "[role='main']", "body"];

            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    mainContent = element.textContent?.trim() || "";
                    if (mainContent.length > 200) break;
                }
            }

            // Clean up content
            mainContent = mainContent
                .replace(/\s+/g, " ")
                .replace(/\n+/g, "\n")
                .trim()
                .substring(0, 10000);

            // Get images
            const images: string[] = [];
            document.querySelectorAll("img").forEach(img => {
                const src = img.src || img.getAttribute("data-src");
                if (src && !src.includes("data:image") && !src.includes("tracking") && !src.includes("pixel")) {
                    try {
                        const absoluteUrl = new URL(src, sourceUrl).href;
                        if (!images.includes(absoluteUrl)) {
                            images.push(absoluteUrl);
                        }
                    } catch {
                        // Skip invalid URLs
                    }
                }
            });

            return {
                title,
                description,
                mainContent,
                headings: headings.slice(0, 20),
                images: images.slice(0, 10),
                url: sourceUrl
            };
        }, url);

        await browser.close();
        browser = null;

        return NextResponse.json({
            success: true,
            content: scrapedContent as ScrapedContent
        });

    } catch (error: any) {
        console.error("Scrape Error:", error);
        return NextResponse.json(
            { error: "Failed to scrape URL", details: error.message },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
