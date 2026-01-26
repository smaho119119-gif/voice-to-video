import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildAIPrompt,
  parseAICuts,
  generateVariedCuts,
  AVAILABLE_IMAGE_EFFECTS,
  AVAILABLE_TRANSITIONS,
  AVAILABLE_TEXT_ANIMATIONS,
} from "@/lib/auto-cut-generator";
import { calculateCutCount } from "@/lib/video-presets";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate cuts using AI
 * POST /api/generate-cuts
 */
export async function POST(request: NextRequest) {
  try {
    const {
      totalDuration,
      sceneDuration,
      styleKeyword,
      defaultImageEffect,
      defaultTransition,
      defaultTextAnimation,
    } = await request.json();

    if (!totalDuration || !sceneDuration) {
      return NextResponse.json(
        { error: "totalDuration and sceneDuration are required" },
        { status: 400 }
      );
    }

    const cutCount = calculateCutCount(totalDuration, sceneDuration);

    // スタイルキーワードがない場合はデフォルト設定でバリエーション生成
    if (!styleKeyword || !styleKeyword.trim()) {
      const cuts = generateVariedCuts(
        totalDuration,
        sceneDuration,
        defaultImageEffect || "zoomIn",
        defaultTransition || "fade",
        defaultTextAnimation || "typewriter"
      );

      return NextResponse.json({
        success: true,
        cuts,
        generatedBy: "default",
      });
    }

    // Gemini APIでカット割りを生成
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = buildAIPrompt(cutCount, styleKeyword);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // JSONを抽出
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }

      const parsed = JSON.parse(jsonMatch[1]);

      if (!parsed.cuts || !Array.isArray(parsed.cuts)) {
        throw new Error("Invalid AI response format");
      }

      // カット数が足りない場合は補完
      while (parsed.cuts.length < cutCount) {
        const lastCut = parsed.cuts[parsed.cuts.length - 1] || {
          imageEffect: "zoomIn",
          transition: "fade",
          textAnimation: "typewriter",
        };
        parsed.cuts.push({
          id: parsed.cuts.length + 1,
          ...lastCut,
        });
      }

      // カット数が多い場合はトリム
      if (parsed.cuts.length > cutCount) {
        parsed.cuts = parsed.cuts.slice(0, cutCount);
      }

      const cuts = parseAICuts(parsed.cuts, totalDuration, sceneDuration);

      return NextResponse.json({
        success: true,
        cuts,
        generatedBy: "ai",
        styleKeyword,
      });
    } catch (aiError) {
      console.error("AI generation failed, using fallback:", aiError);

      // AIが失敗した場合はスタイルキーワードに基づいてバリエーション生成
      const mappedEffect = mapStyleToEffect(styleKeyword);
      const cuts = generateVariedCuts(
        totalDuration,
        sceneDuration,
        mappedEffect.imageEffect,
        mappedEffect.transition,
        mappedEffect.textAnimation
      );

      return NextResponse.json({
        success: true,
        cuts,
        generatedBy: "fallback",
        styleKeyword,
      });
    }
  } catch (error) {
    console.error("Generate cuts error:", error);
    return NextResponse.json(
      { error: "Failed to generate cuts" },
      { status: 500 }
    );
  }
}

// スタイルキーワードからエフェクトをマッピング
function mapStyleToEffect(styleKeyword: string): {
  imageEffect: typeof AVAILABLE_IMAGE_EFFECTS[number];
  transition: typeof AVAILABLE_TRANSITIONS[number];
  textAnimation: typeof AVAILABLE_TEXT_ANIMATIONS[number];
} {
  const keyword = styleKeyword.toLowerCase();

  // ビジネス・落ち着いた系
  if (
    keyword.includes("ビジネス") ||
    keyword.includes("落ち着") ||
    keyword.includes("フォーマル") ||
    keyword.includes("信頼")
  ) {
    return {
      imageEffect: "static",
      transition: "fade",
      textAnimation: "fadeIn",
    };
  }

  // カジュアル・楽しい系
  if (
    keyword.includes("カジュアル") ||
    keyword.includes("楽し") ||
    keyword.includes("明る") ||
    keyword.includes("ポップ")
  ) {
    return {
      imageEffect: "zoomIn",
      transition: "slide",
      textAnimation: "bounce",
    };
  }

  // ドラマチック・感動系
  if (
    keyword.includes("ドラマチック") ||
    keyword.includes("感動") ||
    keyword.includes("エモ") ||
    keyword.includes("印象的")
  ) {
    return {
      imageEffect: "zoomOut",
      transition: "dissolve",
      textAnimation: "fadeIn",
    };
  }

  // スピーディ・テンポ良い系
  if (
    keyword.includes("スピーディ") ||
    keyword.includes("テンポ") ||
    keyword.includes("速い") ||
    keyword.includes("アップテンポ")
  ) {
    return {
      imageEffect: "panRight",
      transition: "cut",
      textAnimation: "typewriter",
    };
  }

  // 解説・教育系
  if (
    keyword.includes("解説") ||
    keyword.includes("教育") ||
    keyword.includes("わかりやす") ||
    keyword.includes("説明")
  ) {
    return {
      imageEffect: "panRight",
      transition: "fade",
      textAnimation: "typewriter",
    };
  }

  // デフォルト
  return {
    imageEffect: "zoomIn",
    transition: "fade",
    textAnimation: "typewriter",
  };
}
