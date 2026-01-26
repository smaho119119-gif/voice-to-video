/**
 * 日本語の自然言語からRemotionのVideoProps JSONを生成するAPIエンドポイント
 * POST /api/generate-video-config
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    buildAnimationPrompt,
    NaturalLanguageVideoRequest,
} from "@/lib/animationPromptBuilder";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "Gemini API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const request: NaturalLanguageVideoRequest = {
            description: body.description,
            duration: body.duration || 60,
            aspectRatio: body.aspectRatio || "16:9",
            style: body.style,
        };

        if (!request.description || request.description.trim().length === 0) {
            return NextResponse.json(
                { error: "description is required" },
                { status: 400 }
            );
        }

        // プロンプトを構築
        const prompt = buildAnimationPrompt(request);

        // Gemini APIで生成
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const responseText = result.response.text();

        // JSONをパース
        let videoConfig;
        try {
            videoConfig = JSON.parse(responseText);
        } catch {
            // JSONがコードブロックで囲まれている場合の対応
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                videoConfig = JSON.parse(jsonMatch[1]);
            } else {
                throw new Error("Invalid JSON response from AI");
            }
        }

        // 基本的なバリデーション
        if (!videoConfig.title || !videoConfig.scenes || !Array.isArray(videoConfig.scenes)) {
            return NextResponse.json(
                { error: "Invalid video config structure" },
                { status: 500 }
            );
        }

        // アスペクト比を確保
        videoConfig.aspectRatio = request.aspectRatio;

        return NextResponse.json({
            success: true,
            videoConfig,
            meta: {
                requestedDuration: request.duration,
                actualSceneCount: videoConfig.scenes.length,
                style: request.style || "default",
            },
        });
    } catch (error: unknown) {
        console.error("Video Config Generation Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to generate video config", details: message },
            { status: 500 }
        );
    }
}
