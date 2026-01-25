import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface ExtractedContent {
    title: string;
    description: string;
    keyPoints: string[];
    targetAudience: string;
    uniqueSellingPoints: string[];
    callToAction: string;
    rawText: string;
}

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json(
                { error: "URL is required" },
                { status: 400 }
            );
        }

        console.log(`[URL Extract] Fetching: ${url}`);

        // Fetch the URL content
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        // Extract text content (basic HTML stripping)
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 15000); // Limit to avoid token overflow

        // Extract meta information
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

        const extractedTitle = titleMatch?.[1] || "";
        const metaDescription = descriptionMatch?.[1] || "";

        // Use GPT-4o-mini to extract and summarize key information for CM creation
        if (process.env.OPENAI_API_KEY) {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const summaryResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `あなたはマーケティングの専門家です。
ウェブページの内容を分析し、CM動画台本作成に必要な情報を抽出してください。

以下のJSON形式で出力してください：
{
    "title": "商品/サービス名",
    "description": "簡潔な説明（2-3文）",
    "keyPoints": ["特徴1", "特徴2", "特徴3"],
    "targetAudience": "想定ターゲット層",
    "uniqueSellingPoints": ["USP1", "USP2"],
    "callToAction": "推奨するCTA",
    "emotionalHooks": ["感情に訴えるポイント1", "ポイント2"],
    "problemsSolved": ["解決する問題1", "問題2"]
}`
                    },
                    {
                        role: "user",
                        content: `以下のウェブページ内容を分析してください：

【タイトル】
${extractedTitle}

【メタ説明】
${metaDescription}

【ページ内容】
${textContent.slice(0, 8000)}`
                    }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            });

            const analysisContent = summaryResponse.choices[0]?.message?.content;
            if (analysisContent) {
                try {
                    const analysis = JSON.parse(analysisContent);

                    // Calculate cost
                    const usage = summaryResponse.usage;
                    const cost = ((usage?.prompt_tokens || 0) * 0.15 + (usage?.completion_tokens || 0) * 0.6) / 1_000_000;

                    console.log(`[URL Extract] Analysis complete. Cost: $${cost.toFixed(4)}`);

                    return NextResponse.json({
                        success: true,
                        url,
                        analysis,
                        rawContent: {
                            title: extractedTitle,
                            metaDescription,
                            textLength: textContent.length,
                        },
                        usage: {
                            promptTokens: usage?.prompt_tokens || 0,
                            completionTokens: usage?.completion_tokens || 0,
                            estimatedCostUSD: cost,
                        }
                    });
                } catch (parseError) {
                    console.error("Failed to parse analysis:", analysisContent);
                }
            }
        }

        // Fallback: return basic extracted info without AI analysis
        return NextResponse.json({
            success: true,
            url,
            analysis: {
                title: extractedTitle,
                description: metaDescription,
                keyPoints: [],
                targetAudience: "不明",
                uniqueSellingPoints: [],
                callToAction: "詳細はこちら",
            },
            rawContent: {
                title: extractedTitle,
                metaDescription,
                textLength: textContent.length,
                preview: textContent.slice(0, 500),
            }
        });

    } catch (error: any) {
        console.error("[URL Extract] Error:", error);
        return NextResponse.json(
            { error: "Failed to extract URL content", details: error.message },
            { status: 500 }
        );
    }
}
