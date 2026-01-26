import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Generate AI avatar from prompt using nanobanapro
 * POST /api/avatars/generate
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, name, model = "nanobanana-realistic", provider = "nanobanana" } = await request.json();

        if (!prompt || !name) {
            return NextResponse.json(
                { error: "Prompt and name are required" },
                { status: 400 }
            );
        }

        // Validate model and provider
        const validModels = [
            "nanobanana-realistic",
            "nanobanana-anime",
            "nanobanana-3d",
            "nanobanana-illustration",
            "nanobanana-cartoon",
            "gemini-2.5-flash",
            "gemini-flash-3",
            "gemini-pro"
        ];

        if (!validModels.includes(model)) {
            return NextResponse.json(
                { error: `Invalid model. Choose from: ${validModels.join(", ")}` },
                { status: 400 }
            );
        }

        // Generate avatar using selected provider
        let imageUrl: string;
        let actualProvider: string;

        try {
            if (model.startsWith("gemini-")) {
                // Use Gemini API for image generation
                const geminiModel = model.replace("gemini-", "");

                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Generate a professional avatar portrait: ${prompt}. High quality, centered face, neutral background, suitable for profile picture.`
                                }]
                            }],
                            generationConfig: {
                                temperature: 0.9,
                                topK: 1,
                                topP: 1,
                                maxOutputTokens: 2048,
                            }
                        }),
                    }
                );

                if (!geminiResponse.ok) {
                    const error = await geminiResponse.json();
                    console.error("Gemini error:", error);
                    return NextResponse.json(
                        { error: "Failed to generate avatar with Gemini" },
                        { status: 500 }
                    );
                }

                const geminiResult = await geminiResponse.json();

                // TODO: Extract image from Gemini response and upload to Supabase
                // For now, return error as placeholder
                return NextResponse.json(
                    {
                        error: "Gemini image generation requires additional implementation",
                        message: "Image extraction from Gemini response not yet implemented",
                    },
                    { status: 501 }
                );

                actualProvider = "gemini";
            } else {
                // Use nanobanapro API
                const nanoModel = model.replace("nanobanana-", "");

                // TODO: Replace with actual nanobanapro API integration
                /*
                const nanobananaResponse = await fetch(
                    "https://api.nanobanapro.com/generate",
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${process.env.NANOBANAPRO_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            prompt: prompt,
                            model: nanoModel,  // realistic, anime, 3d, illustration, cartoon
                            size: "1024x1024",
                        }),
                    }
                );

                if (!nanobananaResponse.ok) {
                    throw new Error("nanobanapro generation failed");
                }

                const result = await nanobananaResponse.json();
                const generatedImageUrl = result.image_url;

                // Download generated image
                const imageResponse = await fetch(generatedImageUrl);
                const imageBlob = await imageResponse.blob();
                */

                // Placeholder: For now, return error until nanobanapro API is integrated
                return NextResponse.json(
                    {
                        error: "nanobanapro API integration required",
                        message: "Please configure NANOBANAPRO_API_KEY and implement API calls",
                    },
                    { status: 501 }
                );

                actualProvider = "nanobanapro";
            }

            // Upload to Supabase Storage (uncomment when API is ready)
            /*
            const fileName = `${user.id}/ai_${Date.now()}.png`;
            const { data: uploadData, error: uploadError } =
                await supabase.storage
                    .from("avatars")
                    .upload(fileName, imageBlob, {
                        cacheControl: "3600",
                        upsert: false,
                    });

            if (uploadError) {
                console.error("Upload error:", uploadError);
                return NextResponse.json(
                    { error: "Failed to upload generated image" },
                    { status: 500 }
                );
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

            imageUrl = publicUrl;
            */
        } catch (error) {
            console.error("nanobanapro generation error:", error);
            return NextResponse.json(
                { error: "Failed to generate avatar with nanobanapro" },
                { status: 500 }
            );
        }

        // Save avatar metadata to database (uncomment when API is ready)
        /*
        const { data: avatar, error: dbError } = await supabase
            .from("avatars")
            .insert([
                {
                    user_id: user.id,
                    name,
                    image_url: imageUrl,
                    type: "ai_generated",
                    ai_provider: "nanobanapro",
                    prompt: prompt,
                    is_favorite: false,
                },
            ])
            .select()
            .single();

        if (dbError) {
            console.error("Database error:", dbError);
            return NextResponse.json(
                { error: "Failed to save avatar" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            avatar,
            message: "Avatar generated successfully",
        });
        */
    } catch (error) {
        console.error("Avatar generation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
