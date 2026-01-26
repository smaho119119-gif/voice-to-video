import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { uploadImageToStorage } from "@/lib/supabase";

// Helper function to generate image for a specific aspect ratio
async function generateImageForAspectRatio(
    ai: GoogleGenAI,
    modelName: string,
    prompt: string,
    aspectRatio: "16:9" | "9:16",
    userIdForStorage: string
): Promise<string | null> {
    const startTime = Date.now();
    console.log(`[Image API] Starting ${aspectRatio} generation with ${modelName}...`);

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseModalities: ["TEXT", "IMAGE"],
                imageConfig: {
                    aspectRatio: aspectRatio,
                }
            }
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Image API] ${aspectRatio} API response received in ${elapsed}s`);

        const parts = response.candidates?.[0]?.content?.parts || [];
        console.log(`[Image API] ${aspectRatio} response parts: ${parts.length}`);

        const imagePart = parts.find((p: any) => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const base64Data = imagePart.inlineData.data;
            console.log(`[Image API] ${aspectRatio} image data received, size: ${(base64Data.length / 1024).toFixed(1)}KB`);

            const storageUrl = await uploadImageToStorage(base64Data, userIdForStorage);
            if (storageUrl) {
                console.log(`[Image API] ${aspectRatio} uploaded to storage: ${storageUrl.slice(0, 80)}...`);
                return storageUrl;
            }
            // Fallback to base64
            const mimeType = imagePart.inlineData.mimeType || "image/png";
            console.log(`[Image API] ${aspectRatio} storage upload failed, using base64`);
            return `data:${mimeType};base64,${base64Data}`;
        }

        // Check for text response (may contain error info)
        const textPart = parts.find((p: any) => p.text);
        if (textPart?.text) {
            console.log(`[Image API] ${aspectRatio} text response: ${textPart.text.slice(0, 200)}`);
        }

        console.warn(`[Image API] ${aspectRatio} no image data in response`);
        return null;
    } catch (error: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`[Image API] ${aspectRatio} failed after ${elapsed}s:`, error.message || error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "Gemini API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const { prompt, userId, model, aspectRatio, generateBoth } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "No prompt provided" },
                { status: 400 }
            );
        }

        const userIdForStorage = userId || "anonymous";
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // モデル選択（2段階）
        // - "2.5-flash" → gemini-2.5-flash-image（高速・低コスト・1024px）
        // - "pro"       → gemini-3-pro-image-preview（高品質・4096pxまで）
        // Note: gemini-3-flash は存在しないため削除
        let modelName: string;
        switch (model) {
            case "pro":
                modelName = "gemini-3-pro-image-preview";
                break;
            case "2.5-flash":
            default:
                modelName = "gemini-2.5-flash-image";
                break;
        }

        console.log(`[Image API] Starting image generation`);
        console.log(`[Image API] Model: ${modelName} (requested: ${model || "flash"}), User: ${userIdForStorage}`);
        console.log(`[Image API] AspectRatio: ${aspectRatio || "16:9"}, GenerateBoth: ${generateBoth}`);
        console.log(`[Image API] Prompt: "${prompt.slice(0, 100)}..."`);

        // Generate both aspect ratios in parallel if requested
        if (generateBoth) {
            console.log(`[Image API] Generating both aspect ratios in parallel`);

            const [image16x9, image9x16] = await Promise.all([
                generateImageForAspectRatio(ai, modelName, prompt, "16:9", userIdForStorage),
                generateImageForAspectRatio(ai, modelName, prompt, "9:16", userIdForStorage)
            ]);

            console.log(`[Image API] Generation complete - 16:9: ${image16x9 ? "✓" : "✗"}, 9:16: ${image9x16 ? "✓" : "✗"}`);

            // Return both URLs
            const currentAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
            const imageUrl = currentAspectRatio === "16:9" ? image16x9 : image9x16;

            // If no images were generated, return error response
            if (!image16x9 && !image9x16) {
                return NextResponse.json(
                    { error: "Image generation failed", imageUrl: null },
                    { status: 500 }
                );
            }

            const result = {
                imageUrl: imageUrl || null,
                imageUrl16x9: image16x9 || null,
                imageUrl9x16: image9x16 || null,
                success: !!(image16x9 || image9x16)
            };
            console.log(`[Image API] Returning result: imageUrl=${result.imageUrl ? "✓" : "✗"}, success=${result.success}`);
            return NextResponse.json(result);
        }

        // Single aspect ratio generation (legacy behavior)
        const imageAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
        console.log(`[Image API] Generating single aspect ratio: ${imageAspectRatio}`);

        const imageUrl = await generateImageForAspectRatio(
            ai, modelName, prompt, imageAspectRatio, userIdForStorage
        );

        if (imageUrl) {
            return NextResponse.json({ imageUrl, success: true });
        }

        return NextResponse.json(
            { error: "Image generation failed", imageUrl: null, success: false },
            { status: 500 }
        );

    } catch (error: any) {
        console.error("Gemini API error:", error);
        return NextResponse.json(
            { error: "Gemini image generation failed", details: error.message },
            { status: 500 }
        );
    }
}
