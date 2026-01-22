import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "Gemini API Key is missing" },
            { status: 500 }
        );
    }

    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "No prompt provided" },
                { status: 400 }
            );
        }

        // Nano Banana Pro (Gemini 3 Pro Image) implementation
        // Using the latest beta features for image generation
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-image-preview"
        });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                // @ts-ignore - latest preview params
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "4K"
                }
            }
        });

        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts || [];

        // Find the generated image in the parts
        const imagePart = parts.find((p: any) => p.inlineData);

        if (imagePart) {
            const base64Data = imagePart.inlineData.data;
            const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64Data}`;
            return NextResponse.json({ imageUrl });
        }

        // Fallback/Mock for preview if image generation fails or returns text
        console.log("Gemini 3 image generation fell back to mock or returned text:", response.text());
        return NextResponse.json({
            imageUrl: `https://placehold.co/1280x720/000000/FFFFFF?text=${encodeURIComponent(prompt.slice(0, 30))}`
        });

    } catch (error: any) {
        console.error("Gemini API error:", error);
        return NextResponse.json(
            { error: "Gemini image generation failed" },
            { status: 500 }
        );
    }
}
