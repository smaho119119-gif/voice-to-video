import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Upload image for page content
 * POST /api/page-content/upload
 * Body: FormData with 'file' and optional 'filename'
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const customFilename = formData.get("filename") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
                { status: 400 }
            );
        }

        // Generate filename
        const ext = file.name.split(".").pop() || "png";
        const filename = customFilename
            ? `${customFilename}.${ext}`
            : `lp-${Date.now()}.${ext}`;

        // Ensure images directory exists
        const imagesDir = path.join(process.cwd(), "public", "images");
        await mkdir(imagesDir, { recursive: true });

        // Write file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(imagesDir, filename);
        await writeFile(filePath, buffer);

        // Return the public URL
        const publicUrl = `/images/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename
        });
    } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        );
    }
}
