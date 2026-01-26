import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  EnhancementContext,
  EnhancementResult,
  buildEnhancementSystemPrompt,
  buildEnhancementUserPrompt,
  parseEnhancementResponse
} from "@/lib/imagePromptEnhancer";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API Key is missing" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { theme, aspectRatio, cuts } = body;

    if (!theme || !cuts || !Array.isArray(cuts)) {
      return NextResponse.json(
        { error: "Missing required fields: theme, cuts" },
        { status: 400 }
      );
    }

    // Build enhancement context from cuts
    const context: EnhancementContext = {
      theme,
      aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
      totalScenes: cuts.length,
      scenes: cuts.map((cut: any, index: number) => ({
        sceneIndex: index + 1,
        originalPrompt: cut.imagePrompt || cut.image_prompt || "",
        voiceText: cut.voiceText || cut.voice_text || "",
        emotion: cut.emotion || "neutral",
        imageEffect: cut.imageEffect || cut.image_effect || "static"
      }))
    };

    console.log(`[Enhance Prompts] Starting enhancement for ${context.totalScenes} scenes`);
    console.log(`[Enhance Prompts] Theme: ${theme.slice(0, 50)}...`);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = buildEnhancementSystemPrompt();
    const userPrompt = buildEnhancementUserPrompt(context);

    const startTime = Date.now();

    // Use GPT-4o-mini for cost efficiency
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Enhance Prompts] API response received in ${elapsed}s`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const result: EnhancementResult | null = parseEnhancementResponse(content);
    if (!result) {
      throw new Error("Failed to parse enhancement response");
    }

    // Log token usage
    const usage = response.usage;
    const inputCost = (usage?.prompt_tokens || 0) / 1_000_000 * 0.15;
    const outputCost = (usage?.completion_tokens || 0) / 1_000_000 * 0.6;
    const totalCost = inputCost + outputCost;

    console.log(`[Enhance Prompts] Enhanced ${result.enhancedPrompts.length} prompts`);
    console.log(`[Enhance Prompts] Cost: $${totalCost.toFixed(4)}`);

    // Log sample enhancement for debugging
    if (result.enhancedPrompts.length > 0) {
      const sample = result.enhancedPrompts[0];
      console.log(`[Enhance Prompts] Sample - Original: "${context.scenes[0]?.originalPrompt?.slice(0, 50)}..."`);
      console.log(`[Enhance Prompts] Sample - Enhanced: "${sample.enhanced?.slice(0, 80)}..."`);
    }

    return NextResponse.json({
      success: true,
      enhancedPrompts: result.enhancedPrompts,
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        estimatedCostUSD: totalCost
      }
    });

  } catch (error: any) {
    console.error("[Enhance Prompts] Error:", error);
    return NextResponse.json(
      { error: "Prompt enhancement failed", details: error.message },
      { status: 500 }
    );
  }
}
