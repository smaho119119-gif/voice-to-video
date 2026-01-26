/**
 * Gemini API Service
 * 外部APIの薄いラッパー層
 * - テスト時にモック化可能
 * - Next.jsから独立して動作
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiConfig {
    apiKey: string;
    model?: string;
}

export interface GenerateContentParams {
    prompt: string;
    responseFormat?: "json" | "text";
}

export interface GenerateContentResult {
    text: string;
    parsed?: unknown; // JSON parseした結果（responseFormat="json"の場合）
}

/**
 * Gemini APIクライアント
 * Dependency Injection対応: 外部からconfigを注入可能
 */
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private defaultModel: string;

    constructor(config: GeminiConfig) {
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        this.defaultModel = config.model || "gemini-2.0-flash";
    }

    /**
     * コンテンツ生成（汎用）
     */
    async generateContent(params: GenerateContentParams): Promise<GenerateContentResult> {
        const model = this.genAI.getGenerativeModel({ model: this.defaultModel });

        const generationConfig: Record<string, unknown> = {};
        if (params.responseFormat === "json") {
            generationConfig.responseMimeType = "application/json";
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: params.prompt }] }],
            generationConfig,
        });

        const text = result.response.text();

        return {
            text,
            parsed: params.responseFormat === "json" ? JSON.parse(text) : undefined,
        };
    }

    /**
     * JSON形式でコンテンツ生成（型安全）
     */
    async generateJSON<T = unknown>(prompt: string): Promise<T> {
        const result = await this.generateContent({
            prompt,
            responseFormat: "json",
        });
        return result.parsed as T;
    }
}

/**
 * デフォルトのGeminiServiceインスタンスを作成
 * 環境変数から設定を読み込む
 */
export function createGeminiService(): GeminiService {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    return new GeminiService({ apiKey });
}
