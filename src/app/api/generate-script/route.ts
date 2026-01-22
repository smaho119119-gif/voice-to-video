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
あなたはプロの動画ディレクター兼脚本家です。以下の文字起こしテキストを元に、ショート動画の完全な台本を作成してください。

出力は必ず以下のJSON形式にしてください。
{
  "title": "動画のタイトル（キャッチーで興味を引くもの）",
  "description": "動画の概要説明（50文字以内）",
  "scenes": [
    {
      "scene_index": 1,
      "duration": 5,
      "avatar_script": "アバターが話す台本（自然な日本語、句読点や間を意識）",
      "subtitle": "画面に表示する字幕（簡潔に）",
      "image_prompt": "背景画像生成用の詳細な英語プロンプト（高品質、16:9、映画的）",
      "emotion": "アバターの表情や話し方（neutral/happy/serious/excited/thoughtful）",
      "transition": "シーン切り替え効果（fade/slide/zoom/wipe）",
      "emphasis_words": ["強調する単語1", "強調する単語2"],
      "sound_effects": [
        {
          "type": "効果音の種類（ambient/action/transition/emotion）",
          "keyword": "効果音を検索するための英語キーワード（例: keyboard typing, success chime, whoosh）",
          "timing": "開始タイミング（start/middle/end/throughout）",
          "volume": 0.3
        }
      ]
    }
  ],
  "total_duration": 合計秒数,
  "tags": ["関連タグ1", "関連タグ2", "関連タグ3"]
}

【シーン切り替え効果（transition）の指針】
- "fade": フェードイン（落ち着いた場面転換、デフォルト）
- "slide": スライドイン（テンポの良い場面転換）
- "zoom": ズームイン（強調・インパクト、重要ポイント向け）
- "wipe": ワイプ（ダイナミックな場面転換）

シーン切り替えルール:
- オープニング（最初のシーン）: "zoom" で注目を集める
- 説明シーン間: "fade" で自然に
- 重要ポイント: "zoom" で強調
- テンポアップ時: "slide" で勢いをつける
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

各シーンに1-2個の効果音を必ず含めてください。

注意:
- avatar_scriptは声に出して読んで自然な日本語にすること
- 「えー」「まあ」などのフィラーは適度に入れても良い
- image_promptは英語で、cinematic, high quality, 4K, detailed などを含める
- transitionとemphasis_wordsは必ず各シーンに含める

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
