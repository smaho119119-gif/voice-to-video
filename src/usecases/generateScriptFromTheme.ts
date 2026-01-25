/**
 * Generate Script From Theme Use Case
 * ビジネスロジック層
 * - 1つの機能を実現
 * - serviceとlibを組み合わせる
 * - Next.jsから独立して動作
 * - テスト可能（DI対応）
 */

import { GeminiService } from "@/services/geminiService";
import { buildScriptGenerationPrompt, ScriptGenerationParams } from "@/lib/promptBuilder";

export interface GenerateScriptResult {
    title: string;
    description: string;
    scenes: Array<{
        scene_index: number;
        duration: number;
        avatar_script: string;
        subtitle: string;
        voice_text?: string;
        voice_style?: string;  // 演技指導
        image_prompt: string;
        image_prompts?: string[];
        main_text?: {
            type: string;
            lines: string[];
        };
        image_effect?: string;
        text_animation?: string;
        emotion?: string;
        transition?: string;
        emphasis_words?: string[];
        sound_effects?: Array<{
            type: string;
            keyword: string;
            timing: string;
            volume: number;
        }>;
    }>;
    total_duration: number;
    tags: string[];
}

export interface GenerateScriptFromThemeInput {
    theme: string;
    targetDuration?: number;
    style?: "educational" | "entertainment" | "news" | "storytelling" | "tutorial";
}

/**
 * テーマからスクリプトを生成するユースケース
 *
 * @param input - 生成パラメータ
 * @param geminiService - Gemini APIサービス（DI）
 * @returns 生成されたスクリプト
 */
export async function generateScriptFromTheme(
    input: GenerateScriptFromThemeInput,
    geminiService: GeminiService
): Promise<GenerateScriptResult> {
    // バリデーション
    if (!input.theme || input.theme.trim().length === 0) {
        throw new Error("Theme is required and cannot be empty");
    }

    // プロンプト構築（純関数）
    const params: ScriptGenerationParams = {
        theme: input.theme,
        targetDuration: input.targetDuration || 60,
        style: input.style || "educational",
    };

    const prompt = buildScriptGenerationPrompt(params);

    // Gemini API呼び出し（外部サービス）
    const result = await geminiService.generateJSON<GenerateScriptResult>(prompt);

    // 結果検証
    if (!result.title || !result.scenes || result.scenes.length === 0) {
        throw new Error("Generated script is invalid: missing required fields");
    }

    return result;
}
