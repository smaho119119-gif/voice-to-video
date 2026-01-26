/**
 * Image Prompt Enhancer
 * 画像プロンプトを強化するための純関数群
 * - 副作用なし（純関数）
 * - Next.jsから独立
 * - 単体テスト可能
 */

export interface SceneForEnhancement {
  sceneIndex: number;
  originalPrompt: string;
  voiceText: string;
  emotion: string;
  imageEffect: string;
}

export interface EnhancementContext {
  theme: string;
  aspectRatio: "16:9" | "9:16";
  totalScenes: number;
  scenes: SceneForEnhancement[];
}

export interface EnhancedPrompt {
  sceneIndex: number;
  original: string;
  enhanced: string;
}

export interface EnhancementResult {
  enhancedPrompts: EnhancedPrompt[];
}

/**
 * 感情に基づいたライティングと色調の推奨
 */
const EMOTION_VISUAL_GUIDES: Record<string, { lighting: string; colorTone: string }> = {
  neutral: {
    lighting: "ニュートラルな自然光、柔らかい影",
    colorTone: "バランスの取れた自然な色調"
  },
  happy: {
    lighting: "明るく温かい自然光、ゴールデンアワーの光",
    colorTone: "暖かみのあるオレンジ・イエロー系の明るい色調"
  },
  serious: {
    lighting: "コントラストの効いたドラマチックな照明",
    colorTone: "落ち着いたブルー・グレー系のクールな色調"
  },
  excited: {
    lighting: "鮮やかで活気のある照明、ハイキーライティング",
    colorTone: "ビビッドで彩度の高い色調"
  },
  thoughtful: {
    lighting: "窓からの柔らかい間接光、静かな雰囲気",
    colorTone: "落ち着いたパステル調、やや彩度を抑えた色調"
  }
};

/**
 * 画像エフェクトに基づいた構図の推奨
 */
const IMAGE_EFFECT_COMPOSITION: Record<string, string> = {
  zoomIn: "被写体は画面中央に配置、余白を十分に確保してズームに対応",
  zoomOut: "被写体は画面中央やや下に配置、上部に空間を確保",
  panLeft: "被写体は画面右寄りに配置、左側に移動の余白を確保",
  panRight: "被写体は画面左寄りに配置、右側に移動の余白を確保",
  static: "三分割法に従った安定した構図、被写体は画面の交点に配置"
};

/**
 * プロンプト強化用のシステムプロンプトを生成
 */
export function buildEnhancementSystemPrompt(): string {
  return `あなたはCM動画の映像ディレクターです。
ショート動画の各シーンに対して、Gemini Imagen用の詳細な画像プロンプトを作成してください。

【重要なルール】
1. 必ず日本語で記述
2. 人物は「日本人」または「アジア系」と明記
3. 場所は「日本の」を明記
4. 各プロンプトは80〜120文字程度

【含めるべき要素】
- カメラアングル（アイレベル、ローアングル、俯瞰など）
- ライティング（自然光、ゴールデンアワー、スタジオライティングなど）
- 色調（温かみのある、クール、ビビッドなど）
- 被写界深度（浅い被写界深度で背景ぼかし等）
- 構図（Ken Burns効果に適した余白配置）
- AI感を消す工夫（自然な表情、リアルな光の表現）

【悪い例】
「オフィスで働く人」「きれいな風景」→ 抽象的すぎる

【良い例】
「日本の現代的なオフィスで働く若い日本人ビジネスマン、ノートPCでタイピング中、窓からの自然光で温かみのある色調、アイレベルのカメラアングル、浅い被写界深度で背景ぼかし、被写体は画面右寄りに配置、16:9シネマティック構図」`;
}

/**
 * プロンプト強化用のユーザープロンプトを生成
 */
export function buildEnhancementUserPrompt(context: EnhancementContext): string {
  const scenesPrompt = context.scenes.map(scene => {
    const emotionGuide = EMOTION_VISUAL_GUIDES[scene.emotion] || EMOTION_VISUAL_GUIDES.neutral;
    const compositionGuide = IMAGE_EFFECT_COMPOSITION[scene.imageEffect] || IMAGE_EFFECT_COMPOSITION.static;

    return `
【シーン${scene.sceneIndex}】
- 元プロンプト: ${scene.originalPrompt}
- 音声内容: ${scene.voiceText}
- 感情: ${scene.emotion}
- 推奨ライティング: ${emotionGuide.lighting}
- 推奨色調: ${emotionGuide.colorTone}
- 画像エフェクト: ${scene.imageEffect}
- 推奨構図: ${compositionGuide}`;
  }).join('\n');

  return `【全体テーマ】
${context.theme}

【アスペクト比】
${context.aspectRatio}

【シーン数】
${context.totalScenes}シーン

【重要】
- 全シーンで視覚的な一貫性を保つこと
- 色調やトーンは全体で統一感を持たせる
- 各シーンの感情に合わせたライティングを使用
${scenesPrompt}

上記の各シーンについて、詳細な画像プロンプト（80〜120文字）を生成してください。

出力形式（必ずこのJSON形式で出力）:
{
  "enhancedPrompts": [
    {
      "sceneIndex": 1,
      "enhanced": "強化されたプロンプト"
    }
  ]
}`;
}

/**
 * APIレスポンスをパースしてEnhancementResultを返す
 */
export function parseEnhancementResponse(responseText: string): EnhancementResult | null {
  try {
    // JSONを抽出（余分なテキストがある場合に対応）
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[ImagePromptEnhancer] No JSON found in response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.enhancedPrompts || !Array.isArray(parsed.enhancedPrompts)) {
      console.error("[ImagePromptEnhancer] Invalid response structure");
      return null;
    }

    return {
      enhancedPrompts: parsed.enhancedPrompts.map((p: any) => ({
        sceneIndex: p.sceneIndex,
        original: p.original || "",
        enhanced: p.enhanced || ""
      }))
    };
  } catch (error) {
    console.error("[ImagePromptEnhancer] Failed to parse response:", error);
    return null;
  }
}

/**
 * 強化されたプロンプトを元のカットリストにマージ
 */
export function mergeEnhancedPrompts<T extends { imagePrompt?: string }>(
  cuts: T[],
  enhancedPrompts: EnhancedPrompt[]
): T[] {
  return cuts.map((cut, index) => {
    const enhanced = enhancedPrompts.find(p => p.sceneIndex === index + 1);
    if (enhanced && enhanced.enhanced) {
      return {
        ...cut,
        imagePrompt: enhanced.enhanced
      };
    }
    return cut;
  });
}
