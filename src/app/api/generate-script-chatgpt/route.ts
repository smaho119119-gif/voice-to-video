import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Marketing Framework Types
type MarketingFramework = "AIDMA" | "PASONA" | "QUEST" | "PAS" | "4P";

// OpenAI Model Types
type OpenAIModel = "gpt-4o" | "gpt-4o-mini" | "o1-preview" | "o1-mini" | "o3-mini";

// Dialogue mode types
type DialogueMode = "single" | "dialogue";

interface ScriptRequest {
    theme: string;              // 商品/サービスのテーマ
    targetAudience?: string;    // ターゲット層
    duration: number;           // 動画の長さ（秒）
    framework: MarketingFramework;  // マーケティングフレームワーク
    model?: OpenAIModel;        // 使用するモデル
    urlContent?: string;        // URLから取得したコンテンツ（オプション）
    tone?: string;              // トーン（professional, friendly, urgent等）
    dialogueMode?: DialogueMode; // 対話モード（single: 一人語り, dialogue: 二人掛け合い）
}

interface SceneOutput {
    sceneNumber: number;
    duration: number;
    purpose: string;            // このシーンの目的（AIDMA段階など）
    subtitle: string;           // 画面に表示するテキスト
    voiceText: string;          // ナレーション
    voiceStyle: string;         // 演技指導
    imagePrompt: string;        // 画像生成プロンプト
    emotion: string;            // 感情
    transition: string;         // トランジション
}

// Framework descriptions for the prompt
const FRAMEWORK_PROMPTS: Record<MarketingFramework, string> = {
    AIDMA: `
【AIDMAフレームワーク（拡張版）】
以下の流れを指定されたシーン数に分配してください。各段階で複数シーンを使用可能：

■ Hook（フック）: 1-2シーン - 最初の3秒で視聴者を釘付けにする衝撃的なオープニング
■ Attention（注意）: 2-3シーン - 問題提起、共感、あるある展開で注意を引く
■ Interest（興味）: 2-3シーン - 解決策への興味を喚起、「え、何それ？」と思わせる
■ Desire（欲求）: 2-3シーン - 具体的なメリット・ベネフィット・使用シーンで欲求を刺激
■ Memory（記憶）: 1-2シーン - 実績・数字・特徴で記憶に残す
■ Action（行動）: 1-2シーン - 具体的な行動を促すCTA

各シーンは前のシーンから自然に繋がり、視聴者を次のステップへ導くこと。
`,
    PASONA: `
【PASONAフレームワーク（拡張版）】
以下の流れを指定されたシーン数に分配してください。各段階で複数シーンを使用可能：

■ Hook（フック）: 1-2シーン - 視聴者を引き込む衝撃的なオープニング
■ Problem（問題）: 2-3シーン - 視聴者が抱える問題を明確に、共感ポイントを複数
■ Agitation（煽り）: 2-3シーン - その問題を放置するとどうなるか、恐怖や不安を煽る
■ Solution（解決策）: 2-3シーン - 解決策としての商品/サービス、具体的な使い方
■ Narrowing（絞り込み）: 1-2シーン - 今すぐ行動すべき理由、限定感
■ Action（行動）: 1-2シーン - 具体的なアクション指示

感情を揺さぶり、行動を促す構成にすること。
`,
    QUEST: `
【QUESTフレームワーク（拡張版）】
以下の流れを指定されたシーン数に分配してください。各段階で複数シーンを使用可能：

■ Hook（フック）: 1-2シーン - 「あなたへ」の強力な呼びかけ
■ Qualify（適格化）: 2シーン - ターゲットを明確に呼びかけ、「これ自分のこと」と思わせる
■ Understand（理解）: 2-3シーン - 視聴者の悩みを深く理解、共感を示す
■ Educate（教育）: 2-3シーン - 解決方法を教える、なぜこれが効くのか
■ Stimulate（刺激）: 2シーン - 変化後の未来を見せる、ビフォーアフター
■ Transition（移行）: 1-2シーン - 次のステップへ誘導

「あなたのための」メッセージを徹底すること。
`,
    PAS: `
【PASフレームワーク（拡張版）】
以下の流れを指定されたシーン数に分配してください。各段階で複数シーンを使用可能：

■ Hook（フック）: 1-2シーン - 衝撃的なオープニング
■ Problem（問題）: 3-4シーン - 共感できる問題提起、あるある、困っている様子
■ Agitate（煽動）: 3-4シーン - 問題の深刻さを強調、放置した場合の未来
■ Solve（解決）: 2-3シーン - 解決策の提示、使い方、メリット
■ Action（行動）: 1-2シーン - 具体的なCTA

シンプルで力強い構成にすること。
`,
    "4P": `
【4Pフレームワーク（拡張版）】
以下の流れを指定されたシーン数に分配してください。各段階で複数シーンを使用可能：

■ Hook（フック）: 1-2シーン - 視聴者を引き込む導入
■ Promise（約束）: 2-3シーン - 最初に価値を約束、何が得られるか
■ Picture（描写）: 3-4シーン - 理想の未来を描く、使用後の生活
■ Proof（証明）: 2-3シーン - 実績・数字・利用者の声・事例
■ Push（後押し）: 1-2シーン - 行動を後押しするCTA

ポジティブなメッセージで構成。
`
};

// Model pricing info (for reference)
const MODEL_INFO: Record<OpenAIModel, { inputCost: number; outputCost: number; description: string }> = {
    "gpt-4o": { inputCost: 2.5, outputCost: 10, description: "高性能・バランス型" },
    "gpt-4o-mini": { inputCost: 0.15, outputCost: 0.6, description: "高速・低コスト" },
    "o1-preview": { inputCost: 15, outputCost: 60, description: "最高性能・推論特化" },
    "o1-mini": { inputCost: 3, outputCost: 12, description: "推論特化・コスパ良" },
    "o3-mini": { inputCost: 1.1, outputCost: 4.4, description: "最新・効率的" },
};

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: "OpenAI API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const body: ScriptRequest = await req.json();
        const {
            theme,
            targetAudience = "一般消費者",
            duration = 60,
            framework = "AIDMA",
            model = "gpt-4o",
            urlContent,
            tone = "professional",
            dialogueMode = "single"
        } = body;

        if (!theme) {
            return NextResponse.json(
                { error: "Theme is required" },
                { status: 400 }
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Calculate number of scenes based on duration
        // 1カット = 5秒を基準（60秒 = 12カット、45秒 = 9カット、30秒 = 6カット）
        // 最低4シーン、最大15シーン
        const sceneCount = Math.min(15, Math.max(4, Math.round(duration / 5)));
        const avgSceneDuration = duration / sceneCount;

        // Dialogue mode specific instructions
        const dialogueInstructions = dialogueMode === "dialogue" ? `
【対話形式の指示】
この動画は2人の掛け合い（対話形式）で作成してください。
- speaker1（ホスト/ナレーター）: メインの進行役。落ち着いて説明する役割。
- speaker2（ゲスト/視聴者代表）: 質問したり、驚いたり、共感する役割。視聴者の気持ちを代弁。

掛け合いのポイント：
- 一方的な説明ではなく、自然な会話のキャッチボールにする
- speaker2は視聴者が感じる疑問や驚きを表現
- テンポよく、飽きさせない構成に
- 最後はspeaker1がCTAを伝え、speaker2が後押しする形で締める
` : `
【一人語り形式の指示】
この動画は1人のナレーターが視聴者に語りかける形式で作成してください。
- 視聴者に直接語りかけるような親密な口調
- 「あなた」「みなさん」などの呼びかけを適宜使用
`;

        // Build the prompt
        const systemPrompt = `あなたは日本のトップCMプランナーです。
視聴者の心を動かし、行動を促す動画台本を作成してください。

${FRAMEWORK_PROMPTS[framework]}
${dialogueInstructions}

【重要なルール】
1. ★必ず${sceneCount}シーン生成すること★（これは絶対条件）
2. 各シーンは約${avgSceneDuration.toFixed(0)}秒（5-6秒程度）
3. 各シーンは必ず前のシーンと話が繋がること（接続詞や文脈で自然に繋げる）
4. 視聴者を感情的に引き込み、最後のCTAまで離脱させない構成
5. ナレーションは話し言葉で、視聴者に語りかけるように（1シーン20-30文字程度）
6. 画像プロンプトは具体的で、日本人・日本の文化を反映
7. 演技指導は具体的に（「明るく」ではなく「希望に満ちた声で、少しテンポを上げて」）
8. 全体で一つのストーリーとして完結すること

【トーン】
${tone === "professional" ? "信頼感があり、落ち着いたプロフェッショナルな印象" :
  tone === "friendly" ? "親しみやすく、友人に話しかけるようなカジュアルさ" :
  tone === "urgent" ? "緊急性を感じさせ、今すぐ行動したくなる" :
  "バランスの取れた、説得力のある"}

【出力形式】
以下のJSON形式で、${sceneCount}シーン分を出力してください：
{
  "title": "動画タイトル",
  "totalDuration": ${duration},
  "targetAudience": "ターゲット層の説明",
  "keyMessage": "この動画で伝えたい核心メッセージ",
  "dialogueMode": "${dialogueMode}",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": ${avgSceneDuration},
      "purpose": "${framework}の段階名",
      "subtitle": "画面に表示するキャッチコピー（短く印象的に）",
      "speaker": "${dialogueMode === "dialogue" ? "speaker1 または speaker2" : "narrator"}",
      "voiceText": "ナレーション/セリフテキスト（話し言葉で）",
      "voiceStyle": "具体的な演技指導",
      "imagePrompt": "cinematic, Japanese, 具体的な画像の説明",
      "emotion": "neutral/happy/serious/excited/thoughtful",
      "transition": "fade/slide/zoom"
    }
  ]
}`;

        const userPrompt = `【商品/サービス】
${theme}

【ターゲット】
${targetAudience}

【動画の長さ】
${duration}秒（${sceneCount}シーン構成）

${urlContent ? `【参考情報（URLから取得）】\n${urlContent}\n` : ""}

上記の情報を元に、${framework}フレームワークに基づいた${duration}秒のCM動画台本を作成してください。
視聴者が最初から最後まで見たくなり、最終的に行動を起こしたくなる構成にしてください。`;

        console.log(`[ChatGPT Script] Generating with model: ${model}, framework: ${framework}, dialogue: ${dialogueMode}`);

        // For o1 models, we need to handle differently (no system message)
        let response;
        if (model.startsWith("o1") || model.startsWith("o3")) {
            response = await openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: "user",
                        content: `${systemPrompt}\n\n---\n\n${userPrompt}`
                    }
                ],
            });
        } else {
            response = await openai.chat.completions.create({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            });
        }

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content in response");
        }

        // Parse the JSON response
        let scriptData;
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                scriptData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found in response");
            }
        } catch (parseError) {
            console.error("Failed to parse response:", content);
            throw new Error("Failed to parse script response");
        }

        // Calculate token usage and cost
        const usage = response.usage;
        const modelInfo = MODEL_INFO[model];
        const inputCost = (usage?.prompt_tokens || 0) / 1_000_000 * modelInfo.inputCost;
        const outputCost = (usage?.completion_tokens || 0) / 1_000_000 * modelInfo.outputCost;
        const totalCost = inputCost + outputCost;

        console.log(`[ChatGPT Script] Generated successfully. Cost: $${totalCost.toFixed(4)}`);

        return NextResponse.json({
            success: true,
            script: scriptData,
            model: model,
            framework: framework,
            dialogueMode: dialogueMode,
            usage: {
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
                totalTokens: usage?.total_tokens || 0,
                estimatedCostUSD: totalCost,
                estimatedCostJPY: totalCost * 150, // Approximate JPY conversion
            }
        });

    } catch (error: any) {
        console.error("[ChatGPT Script] Error:", error);
        return NextResponse.json(
            { error: "Script generation failed", details: error.message },
            { status: 500 }
        );
    }
}

// GET endpoint to return available models and frameworks
export async function GET() {
    return NextResponse.json({
        models: Object.entries(MODEL_INFO).map(([id, info]) => ({
            id,
            ...info,
            available: !!process.env.OPENAI_API_KEY
        })),
        frameworks: [
            { id: "AIDMA", name: "AIDMA", description: "注意→興味→欲求→記憶→行動" },
            { id: "PASONA", name: "PASONA", description: "問題→煽り→解決→絞込→行動" },
            { id: "QUEST", name: "QUEST", description: "適格→理解→教育→刺激→移行" },
            { id: "PAS", name: "PAS", description: "問題→煽動→解決（シンプル）" },
            { id: "4P", name: "4P", description: "約束→描写→証明→後押し" },
        ],
        tones: [
            { id: "professional", name: "プロフェッショナル" },
            { id: "friendly", name: "フレンドリー" },
            { id: "urgent", name: "緊急性" },
        ]
    });
}
