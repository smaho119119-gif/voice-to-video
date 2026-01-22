import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
            { error: "Anthropic API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: "No text provided" },
                { status: 400 }
            );
        }

        const prompt = `
以下の文字起こしテキストを元に、短い解説動画の構成を作成してください。
出力は必ずJSON形式のみで行ってください。

【入力テキスト】
${text}

【出力フォーマット】
{
  "title": "動画のタイトル",
  "scenes": [
    {
      "duration": 5,
      "avatar_script": "HeyGenアバターに喋らせるセリフ",
      "subtitle": "表示するテロップ内容",
      "image_prompt": "背景画像生成用の英語プロンプト（実写風、高品質、動画の文脈に合うもの）"
    }
  ]
}

【制約】
- シーンは3〜5つ程度に分割してください。
- 各シーンのセリフは自然な日本語にしてください。
- 背景画像のプロンプトは詳細に、英語で記述してください。
`;

        const message = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        // Extract JSON from the response (Claude sometimes adds text around it)
        const content = message.content[0].type === 'text' ? message.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return NextResponse.json({ error: "Failed to parse JSON from AI response" }, { status: 500 });
        }

        const videoConfig = JSON.parse(jsonMatch[0]);
        return NextResponse.json(videoConfig);
    } catch (error: any) {
        console.error("Script generation error:", error);
        return NextResponse.json(
            { error: error.message || "Script generation failed" },
            { status: 500 }
        );
    }
}
