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
【AIDMAフレームワーク】
1. Attention（注意）: 視聴者の注意を引く強烈なフック
2. Interest（興味）: 問題提起で興味を喚起
3. Desire（欲求）: 解決策を提示し欲求を刺激
4. Memory（記憶）: 特徴・実績で記憶に残す
5. Action（行動）: 具体的な行動を促す

各シーンは前のシーンから自然に繋がり、視聴者を次のステップへ導くこと。
`,
    PASONA: `
【PASONAフレームワーク】
1. Problem（問題）: 視聴者が抱える問題を明確に
2. Agitation（煽り）: その問題を放置するとどうなるか
3. Solution（解決策）: 解決策としての商品/サービス
4. Narrowing（絞り込み）: 今すぐ行動すべき理由
5. Action（行動）: 具体的なアクション指示

感情を揺さぶり、行動を促す構成にすること。
`,
    QUEST: `
【QUESTフレームワーク】
1. Qualify（適格化）: ターゲットを明確に呼びかけ
2. Understand（理解）: 視聴者の悩みを深く理解
3. Educate（教育）: 解決方法を教える
4. Stimulate（刺激）: 変化後の未来を見せる
5. Transition（移行）: 次のステップへ誘導

「あなたのための」メッセージを徹底すること。
`,
    PAS: `
【PASフレームワーク】
1. Problem（問題）: 共感できる問題提起
2. Agitate（煽動）: 問題の深刻さを強調
3. Solve（解決）: 解決策の提示とCTA

シンプルで力強い3段構成。
`,
    "4P": `
【4Pフレームワーク】
1. Promise（約束）: 最初に価値を約束
2. Picture（描写）: 理想の未来を描く
3. Proof（証明）: 実績・証拠を示す
4. Push（後押し）: 行動を後押し

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
        const sceneCount = Math.max(4, Math.ceil(duration / 10));
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
1. 各シーンは必ず前のシーンと話が繋がること（接続詞や文脈で自然に繋げる）
2. 視聴者を感情的に引き込み、最後のCTAまで離脱させない構成
3. ナレーションは話し言葉で、視聴者に語りかけるように
4. 画像プロンプトは具体的で、日本人・日本の文化を反映
5. 演技指導は具体的に（「明るく」ではなく「希望に満ちた声で、少しテンポを上げて」）
6. 全体で一つのストーリーとして完結すること

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
