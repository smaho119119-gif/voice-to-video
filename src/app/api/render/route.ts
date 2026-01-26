import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Demo test user ID (fallback when not authenticated)
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Render video to MP4
 * POST /api/render
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use test user as fallback for demo
        const userId = user?.id || TEST_USER_ID;

        const { videoConfig, projectId } = await request.json();

        if (!videoConfig) {
            return NextResponse.json(
                { error: "Video config is required" },
                { status: 400 }
            );
        }

        // Bundle Remotion project
        const bundleLocation = await bundle({
            entryPoint: path.resolve(process.cwd(), "./src/remotion/index.tsx"),
            webpackOverride: (config) => config,
        });

        // Get composition
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: "MainVideo",
            inputProps: videoConfig,
        });

        // Create output directory
        const outputDir = path.resolve(process.cwd(), "public/renders");
        await mkdir(outputDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const outputPath = path.join(outputDir, `video-${timestamp}.mp4`);

        // Render video
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: "h264",
            outputLocation: outputPath,
            inputProps: videoConfig,
            // Quality settings
            jpegQuality: 90,
            // Audio settings
            audioCodec: "aac",
            audioBitrate: "192k",
        });

        const renderTime = (Date.now() - startTime) / 1000;

        // Upload to Supabase Storage if projectId is provided
        let videoUrl = `/renders/video-${timestamp}.mp4`;

        if (projectId) {
            try {
                const fs = await import("fs");
                const fileBuffer = await fs.promises.readFile(outputPath);

                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from("videos")
                    .upload(`${userId}/${projectId}/${timestamp}.mp4`, fileBuffer, {
                        contentType: "video/mp4",
                        upsert: false,
                    });

                if (!uploadError && uploadData) {
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from("videos")
                        .getPublicUrl(uploadData.path);

                    videoUrl = publicUrl;

                    // Save video record
                    await supabase.from("videos").insert([{
                        project_id: projectId,
                        user_id: userId,
                        video_url: videoUrl,
                        duration: composition.durationInFrames / composition.fps,
                        resolution: `${composition.width}x${composition.height}`,
                        file_size: fileBuffer.length,
                        render_time: renderTime,
                    }]);
                }
            } catch (uploadErr) {
                console.error("Upload error:", uploadErr);
                // Continue with local file URL
            }
        }

        return NextResponse.json({
            success: true,
            videoUrl,
            renderTime,
            duration: composition.durationInFrames / composition.fps,
            resolution: `${composition.width}x${composition.height}`,
        });

    } catch (error: any) {
        console.error("Render error:", error);
        return NextResponse.json(
            { error: error.message || "Render failed" },
            { status: 500 }
        );
    }
}
