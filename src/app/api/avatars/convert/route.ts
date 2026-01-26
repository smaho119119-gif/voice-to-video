import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Convert uploaded photo to avatar using nanobanapro API
 * POST /api/avatars/convert
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

        const formData = await request.formData();
        const imageFile = formData.get("image") as File | null;
        const name = formData.get("name") as string;
        const model = (formData.get("model") as string) || "nanobanana-realistic";

        if (!imageFile || !name) {
            return NextResponse.json(
                { error: "Image file and name are required" },
                { status: 400 }
            );
        }

        // Validate model (only nanobanana models for photo conversion)
        const validModels = [
            "nanobanana-realistic",
            "nanobanana-anime",
            "nanobanana-3d",
            "nanobanana-illustration",
            "nanobanana-cartoon"
        ];
        if (!validModels.includes(model)) {
            return NextResponse.json(
                { error: `Invalid model. Choose from: ${validModels.join(", ")}` },
                { status: 400 }
            );
        }

        const nanoModel = model.replace("nanobanana-", "");

        // 1. Upload original image to Supabase Storage
        const fileExt = imageFile.name.split(".").pop();
        const originalPath = `${user.id}/original_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(originalPath, imageFile, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload image" },
                { status: 500 }
            );
        }

        const {
            data: { publicUrl: originalUrl },
        } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

        // 2. Convert image using nanobanapro API (placeholder - needs actual API key)
        // For now, we'll use a placeholder service or skip conversion
        // TODO: Integrate actual nanobanapro API
        let convertedImageUrl = originalUrl;

        // Placeholder for nanobanapro API call
        /*
        const nanobananaFormData = new FormData();
        nanobananaFormData.append("image", imageFile);
        nanobananaFormData.append("model", nanoModel); // realistic, anime, 3d, illustration, cartoon

        const nanoResponse = await fetch("https://api.nanobanapro.com/convert", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.NANOBANAPRO_API_KEY}`,
            },
            body: nanobananaFormData,
        });

        if (nanoResponse.ok) {
            const nanoResult = await nanoResponse.json();
            // Download converted image
            const convertedResponse = await fetch(nanoResult.image_url);
            const convertedBlob = await convertedResponse.blob();

            // Upload converted image to Supabase
            const convertedPath = `${user.id}/avatar_${Date.now()}.png`;
            const { data: convertedData } = await supabase.storage
                .from("avatars")
                .upload(convertedPath, convertedBlob);

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(convertedData.path);

            convertedImageUrl = publicUrl;
        }
        */

        // 3. Save avatar metadata to database
        const { data: avatar, error: dbError } = await supabase
            .from("avatars")
            .insert([
                {
                    user_id: user.id,
                    name,
                    image_url: convertedImageUrl,
                    original_url: originalUrl,
                    type: "uploaded",
                    ai_provider: "nanobanapro",
                    prompt: `model:${model}`, // Store model info in prompt field
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
            message: "Avatar created successfully",
        });
    } catch (error) {
        console.error("Avatar conversion error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
