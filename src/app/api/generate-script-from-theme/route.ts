/**
 * Generate Script From Theme API Route
 * 薄いルーティング層 - バリデーション + 呼び出し + レスポンス整形のみ
 *
 * リファクタリング履歴:
 * - 2026-01-23: API化・モジュール化（CLAUDE.md準拠）
 * - 既存コードは下部にコメントアウトで保持（ロールバック可能）
 */

import { NextRequest, NextResponse } from "next/server";
import { createGeminiService } from "@/services/geminiService";
import { generateScriptFromTheme } from "@/usecases/generateScriptFromTheme";

export async function POST(req: NextRequest) {
    try {
        // 1. 入力バリデーション
        const body = await req.json();
        const { theme, targetDuration = 60, style = "educational" } = body;

        if (!theme || typeof theme !== "string" || theme.trim().length === 0) {
            return NextResponse.json(
                { error: "Theme is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        // 2. サービス初期化
        const geminiService = createGeminiService();

        // 3. ユースケース実行
        const script = await generateScriptFromTheme(
            {
                theme,
                targetDuration,
                style,
            },
            geminiService
        );

        // 4. レスポンス整形
        return NextResponse.json({
            success: true,
            script,
        });
    } catch (error: any) {
        console.error("Theme Script Generation Error:", error);

        // エラーハンドリング
        if (error.message.includes("GEMINI_API_KEY")) {
            return NextResponse.json(
                { error: "Gemini API Key is not configured" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                error: "Failed to generate script from theme",
                details: error.message,
            },
            { status: 500 }
        );
    }
}

/* ============================================
 * 旧実装（2026-01-23まで使用）
 * 問題なければ将来的に削除予定
 * ============================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST_OLD(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "Gemini API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const { theme, targetDuration = 60, style = "educational" } = await req.json();

        if (!theme) {
            return NextResponse.json(
                { error: "Theme is required" },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const styleGuides: Record<string, string> = {
            educational: "教育的で分かりやすい解説スタイル。専門用語は簡単に説明を加える。",
            entertainment: "エンターテイメント性が高く、視聴者を楽しませるスタイル。",
            news: "ニュース番組のような客観的で簡潔なスタイル。",
            storytelling: "物語形式で引き込むストーリーテリングスタイル。",
            tutorial: "ステップバイステップで説明するチュートリアルスタイル。"
        };

        const sceneCount = Math.max(3, Math.min(10, Math.ceil(targetDuration / 10)));

        const prompt = `
あなたはプロの動画ディレクター兼脚本家です。以下のテーマに基づいて、ショート動画の完全な台本を作成してください。

【テーマ】
${theme}

【スタイル】
${styleGuides[style] || styleGuides.educational}

【要件】
- 目標時間: 約${targetDuration}秒（${sceneCount}シーン程度）
- 各シーンは5〜10秒程度
- ネイティブな日本語で自然に話す台本
- 視聴者の興味を引くオープニング
- 明確な結論やまとめで締める

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
      "image_prompt": "背景画像生成用の日本語プロンプト（日本的な要素、高品質、16:9、映画的）",
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

【画像プロンプト（image_prompt）の作成ルール】
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

- transitionとemphasis_wordsは必ず各シーンに含める
- 画像プロンプトは最低50文字以上、具体的に記述すること
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
            script: scriptData
        });
    } catch (error: any) {
        console.error("Theme Script Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate script from theme", details: error.message },
            { status: 500 }
        );
    }
}

============================================ */
