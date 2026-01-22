import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "Gemini API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const { text } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

        const prompt = `
      あなたはプロの動画ディレクターです。以下の文字起こしテキストを元に、ショート動画の構成を作成してください。
      
      出力は必ず以下のJSON形式にしてください。
      {
        "title": "動画のタイトル",
        "scenes": [
          {
            "duration": 5,
            "avatar_script": "アバターが喋る台本",
            "subtitle": "表示する字幕",
            "image_prompt": "背景画像生成用の詳細な英語プロンプト"
          }
        ]
      }

      テキスト: "${text}"
    `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                // @ts-ignore - latest Gemini 3 params
                thinkingConfig: {
                    thinkingLevel: "high"
                }
            }
        });

        return NextResponse.json(JSON.parse(result.response.text()));
    } catch (error: any) {
        console.error("Gemini Script Error:", error);
        return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
    }
}
