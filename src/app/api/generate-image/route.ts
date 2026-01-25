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
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: `Generate an image: ${prompt}`,
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: "2K"
                }
            }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const base64Data = imagePart.inlineData.data;
            const storageUrl = await uploadImageToStorage(base64Data, userIdForStorage);
            if (storageUrl) {
                return storageUrl;
            }
            // Fallback to base64
            const mimeType = imagePart.inlineData.mimeType || "image/png";
            return `data:${mimeType};base64,${base64Data}`;
        }
        return null;
    } catch (error) {
        console.error(`[Image API] Failed to generate ${aspectRatio} image:`, error);
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
        const modelName = model === "pro" ? "gemini-3-pro-image-preview" : "gemini-3-pro-image-preview";

        // Generate both aspect ratios in parallel if requested
        if (generateBoth) {
            console.log(`[Image API] Generating both aspect ratios in parallel`);

            const [image16x9, image9x16] = await Promise.all([
                generateImageForAspectRatio(ai, modelName, prompt, "16:9", userIdForStorage),
                generateImageForAspectRatio(ai, modelName, prompt, "9:16", userIdForStorage)
            ]);

            // Return both URLs
            const currentAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
            const imageUrl = currentAspectRatio === "16:9" ? image16x9 : image9x16;

            return NextResponse.json({
                imageUrl: imageUrl || `https://placehold.co/1280x720/1a1a1a/FFFFFF?text=Image+Pending`,
                imageUrl16x9: image16x9 || null,
                imageUrl9x16: image9x16 || null
            });
        }

        // Single aspect ratio generation (legacy behavior)
        const imageAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
        console.log(`[Image API] Generating single aspect ratio: ${imageAspectRatio}`);

        const imageUrl = await generateImageForAspectRatio(
            ai, modelName, prompt, imageAspectRatio, userIdForStorage
        );

        if (imageUrl) {
            return NextResponse.json({ imageUrl });
        }

        return NextResponse.json({
            imageUrl: `https://placehold.co/1280x720/1a1a1a/FFFFFF?text=Image+Generation+Pending`
        });

    } catch (error: any) {
        console.error("Gemini API error:", error);
        return NextResponse.json(
            { error: "Gemini image generation failed", details: error.message },
            { status: 500 }
        );
    }
}
