/**
 * Auto Cut Generator
 * 動画の長さから自動的にカット割りを生成するロジック
 */

import {
  CutConfig,
  ImageEffect,
  SceneTransition,
  TextAnimation,
  calculateCutCount,
} from "./video-presets";

// AI生成リクエスト用の設定
export interface AutoCutRequest {
  totalDuration: number;
  sceneDuration: number;
  styleKeyword: string;
  defaultImageEffect?: ImageEffect;
  defaultTransition?: SceneTransition;
  defaultTextAnimation?: TextAnimation;
}

// AI生成レスポンス
export interface AutoCutResponse {
  cuts: CutConfig[];
  success: boolean;
  error?: string;
}

// 利用可能なエフェクト一覧（AI生成用）
export const AVAILABLE_IMAGE_EFFECTS: ImageEffect[] = [
  "zoomIn",
  "zoomOut",
  "panLeft",
  "panRight",
  "static",
];

export const AVAILABLE_TRANSITIONS: SceneTransition[] = [
  "fade",
  "slide",
  "zoom",
  "cut",
  "dissolve",
];

export const AVAILABLE_TEXT_ANIMATIONS: TextAnimation[] = [
  "typewriter",
  "fadeIn",
  "slideUp",
  "bounce",
  "none",
];

/**
 * デフォルト設定で均一なカット割りを生成
 */
export function generateUniformCuts(
  totalDuration: number,
  sceneDuration: number,
  imageEffect: ImageEffect = "zoomIn",
  transition: SceneTransition = "fade",
  textAnimation: TextAnimation = "typewriter"
): CutConfig[] {
  const cutCount = calculateCutCount(totalDuration, sceneDuration);
  const cuts: CutConfig[] = [];

  for (let i = 0; i < cutCount; i++) {
    const startTime = i * sceneDuration;
    const endTime = Math.min((i + 1) * sceneDuration, totalDuration);

    cuts.push({
      id: i + 1,
      startTime,
      endTime,
      imageEffect,
      transition,
      textAnimation,
      images: [], // 空の画像配列で初期化
    });
  }

  return cuts;
}

/**
 * バリエーションを持たせたカット割りを生成（AIなし）
 */
export function generateVariedCuts(
  totalDuration: number,
  sceneDuration: number,
  baseImageEffect: ImageEffect = "zoomIn",
  baseTransition: SceneTransition = "fade",
  baseTextAnimation: TextAnimation = "typewriter"
): CutConfig[] {
  const cutCount = calculateCutCount(totalDuration, sceneDuration);
  const cuts: CutConfig[] = [];

  // バリエーションパターン
  const imageEffectVariations: ImageEffect[] = [
    baseImageEffect,
    "static",
    baseImageEffect,
    getAlternateImageEffect(baseImageEffect),
  ];

  const transitionVariations: SceneTransition[] = [
    baseTransition,
    baseTransition,
    "cut",
    baseTransition,
  ];

  for (let i = 0; i < cutCount; i++) {
    const startTime = i * sceneDuration;
    const endTime = Math.min((i + 1) * sceneDuration, totalDuration);

    // パターンに基づいてバリエーションを適用
    const patternIndex = i % imageEffectVariations.length;

    cuts.push({
      id: i + 1,
      startTime,
      endTime,
      imageEffect: imageEffectVariations[patternIndex],
      transition: transitionVariations[patternIndex],
      textAnimation: baseTextAnimation,
      images: [], // 空の画像配列で初期化
    });
  }

  return cuts;
}

/**
 * 代替の画像エフェクトを取得
 */
function getAlternateImageEffect(effect: ImageEffect): ImageEffect {
  const alternates: Record<ImageEffect, ImageEffect> = {
    zoomIn: "panRight",
    zoomOut: "panLeft",
    panLeft: "zoomIn",
    panRight: "zoomOut",
    static: "zoomIn",
  };
  return alternates[effect];
}

/**
 * カットを個別に更新
 */
export function updateCut(
  cuts: CutConfig[],
  cutId: number,
  updates: Partial<Omit<CutConfig, "id" | "startTime" | "endTime">>
): CutConfig[] {
  return cuts.map((cut) => {
    if (cut.id === cutId) {
      return { ...cut, ...updates };
    }
    return cut;
  });
}

/**
 * 全カットを一括更新
 */
export function updateAllCuts(
  cuts: CutConfig[],
  updates: Partial<Omit<CutConfig, "id" | "startTime" | "endTime">>
): CutConfig[] {
  return cuts.map((cut) => ({ ...cut, ...updates }));
}

/**
 * AIプロンプト生成用のテンプレート
 */
export function buildAIPrompt(
  cutCount: number,
  styleKeyword: string
): string {
  return `
動画のカット割りを生成してください。

## 条件
- カット数: ${cutCount}
- スタイル: ${styleKeyword}

## 使用可能なオプション
画像エフェクト: ${AVAILABLE_IMAGE_EFFECTS.join(", ")}
トランジション: ${AVAILABLE_TRANSITIONS.join(", ")}
字幕アニメーション: ${AVAILABLE_TEXT_ANIMATIONS.join(", ")}

## 出力形式
以下のJSON形式で出力してください。単調にならないよう、適度にバリエーションをつけてください。

\`\`\`json
{
  "cuts": [
    {
      "id": 1,
      "imageEffect": "zoomIn",
      "transition": "fade",
      "textAnimation": "typewriter"
    },
    ...
  ]
}
\`\`\`

${cutCount}カット分のデータを生成してください。
`.trim();
}

/**
 * AI生成結果をCutConfig配列に変換
 */
export function parseAICuts(
  aiResponse: Array<{
    id: number;
    imageEffect: string;
    transition: string;
    textAnimation: string;
  }>,
  totalDuration: number,
  sceneDuration: number
): CutConfig[] {
  return aiResponse.map((item, index) => {
    const startTime = index * sceneDuration;
    const endTime = Math.min((index + 1) * sceneDuration, totalDuration);

    return {
      id: item.id || index + 1,
      startTime,
      endTime,
      imageEffect: validateImageEffect(item.imageEffect),
      transition: validateTransition(item.transition),
      textAnimation: validateTextAnimation(item.textAnimation),
      images: [], // 空の画像配列で初期化
    };
  });
}

// バリデーション関数
function validateImageEffect(value: string): ImageEffect {
  if (AVAILABLE_IMAGE_EFFECTS.includes(value as ImageEffect)) {
    return value as ImageEffect;
  }
  return "zoomIn";
}

function validateTransition(value: string): SceneTransition {
  if (AVAILABLE_TRANSITIONS.includes(value as SceneTransition)) {
    return value as SceneTransition;
  }
  return "fade";
}

function validateTextAnimation(value: string): TextAnimation {
  if (AVAILABLE_TEXT_ANIMATIONS.includes(value as TextAnimation)) {
    return value as TextAnimation;
  }
  return "typewriter";
}
