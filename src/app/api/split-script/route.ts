import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Split script into scenes using AI
 * POST /api/split-script
 */
export async function POST(request: NextRequest) {
  try {
    const { script, cutCount, styleKeyword } = await request.json();

    if (!script || !cutCount) {
      return NextResponse.json(
        { error: "script and cutCount are required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
あなたは動画スクリプトを分割する専門家です。

## 入力スクリプト
${script}

## 条件
- ${cutCount}シーンに分割してください
- 各シーンは読み上げ時間が均等になるように
- スタイル: ${styleKeyword || "一般的な解説動画"}

## 出力形式
以下のJSON形式で出力してください。

\`\`\`json
{
  "scenes": [
    {
      "id": 1,
      "subtitle": "このシーンで表示する字幕テキスト",
      "imagePrompt": "このシーンの背景画像を生成するための英語プロンプト（例: professional business meeting, modern office, bright lighting）"
    },
    ...
  ]
}
\`\`\`

## 注意事項
- subtitleは日本語で、読み上げる内容そのまま
- imagePromptは英語で、シーンの内容に合った背景画像を生成するためのプロンプト
- ${cutCount}シーン分のデータを必ず生成してください
- 各シーンの文字数はなるべく均等に
`.trim();

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // JSONを抽出
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }

      const parsed = JSON.parse(jsonMatch[1]);

      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error("Invalid AI response format");
      }

      // シーン数を調整
      while (parsed.scenes.length < cutCount) {
        const lastScene = parsed.scenes[parsed.scenes.length - 1];
        parsed.scenes.push({
          id: parsed.scenes.length + 1,
          subtitle: lastScene?.subtitle || "...",
          imagePrompt: lastScene?.imagePrompt || "abstract background",
        });
      }

      if (parsed.scenes.length > cutCount) {
        parsed.scenes = parsed.scenes.slice(0, cutCount);
      }

      // ID振り直し
      parsed.scenes = parsed.scenes.map((scene: any, index: number) => ({
        ...scene,
        id: index + 1,
      }));

      return NextResponse.json({
        success: true,
        scenes: parsed.scenes,
      });
    } catch (aiError) {
      console.error("AI generation failed, using fallback:", aiError);

      // フォールバック: 単純に分割
      const sentences = script.split(/[。！？\n]+/).filter((s: string) => s.trim());
      const scenesPerCut = Math.ceil(sentences.length / cutCount);

      const scenes = [];
      for (let i = 0; i < cutCount; i++) {
        const startIdx = i * scenesPerCut;
        const endIdx = Math.min(startIdx + scenesPerCut, sentences.length);
        const sceneText = sentences.slice(startIdx, endIdx).join("。");

        scenes.push({
          id: i + 1,
          subtitle: sceneText || `シーン ${i + 1}`,
          imagePrompt: "abstract modern background with soft lighting",
        });
      }

      return NextResponse.json({
        success: true,
        scenes,
        generatedBy: "fallback",
      });
    }
  } catch (error) {
    console.error("Split script error:", error);
    return NextResponse.json(
      { error: "Failed to split script" },
      { status: 500 }
    );
  }
}
