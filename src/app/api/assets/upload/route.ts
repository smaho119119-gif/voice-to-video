import { NextRequest, NextResponse } from "next/server";
import { uploadImageToStorage } from "@/lib/supabase";

/**
 * Upload base64 image to Supabase Storage
 * POST /api/assets/upload
 */
export async function POST(request: NextRequest) {
    try {
        const { base64, userId } = await request.json();

        if (!base64) {
            return NextResponse.json(
                { error: "Base64 data is required" },
                { status: 400 }
            );
        }

        // Use anonymous user ID if not provided
        const userIdForStorage = userId || "anonymous";

        // Upload to Supabase Storage
        const storageUrl = await uploadImageToStorage(base64, userIdForStorage);

        if (!storageUrl) {
            return NextResponse.json(
                { error: "Failed to upload image" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: storageUrl,
        });
    } catch (error: any) {
        console.error("[Upload API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Batch upload multiple images
 * POST /api/assets/upload/batch
 */
export async function PUT(request: NextRequest) {
    try {
        const { images, userId } = await request.json();

        if (!images || !Array.isArray(images)) {
            return NextResponse.json(
                { error: "Images array is required" },
                { status: 400 }
            );
        }

        const userIdForStorage = userId || "anonymous";
        const results: { index: number; url: string | null }[] = [];

        // Upload images in parallel
        const uploadPromises = images.map(async (img: { index: number; base64: string }) => {
            if (!img.base64 || !img.base64.startsWith('data:image')) {
                return { index: img.index, url: null };
            }
            const url = await uploadImageToStorage(img.base64, userIdForStorage);
            return { index: img.index, url };
        });

        const uploadResults = await Promise.all(uploadPromises);

        return NextResponse.json({
            success: true,
            results: uploadResults,
        });
    } catch (error: any) {
        console.error("[Upload API] Batch error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
