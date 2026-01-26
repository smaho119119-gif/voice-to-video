import { NextRequest, NextResponse } from "next/server";

const LIPSYNC_API_URL = process.env.LIPSYNC_API_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const videoFile = formData.get("video") as File | null;
        const audioFile = formData.get("audio") as File | null;
        const quality = formData.get("quality") as string | null;

        if (!videoFile || !audioFile) {
            return NextResponse.json(
                { error: "Both video and audio files are required" },
                { status: 400 }
            );
        }

        // Forward request to Python lip sync service
        const lipSyncFormData = new FormData();
        lipSyncFormData.append("video", videoFile);
        lipSyncFormData.append("audio", audioFile);
        if (quality) {
            lipSyncFormData.append("quality", quality);
        }

        const response = await fetch(`${LIPSYNC_API_URL}/lipsync`, {
            method: "POST",
            body: lipSyncFormData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[LipSync] Python server error:", errorData);
            return NextResponse.json(
                { error: errorData.error || "Lip sync failed", details: errorData.details },
                { status: response.status }
            );
        }

        const result = await response.json();
        console.log("[LipSync] Processing success, job_id:", result.job_id);

        // Download the generated video
        const videoResponse = await fetch(
            `${LIPSYNC_API_URL}${result.output_url}`
        );

        if (!videoResponse.ok) {
            return NextResponse.json(
                { error: "Failed to download generated video" },
                { status: 500 }
            );
        }

        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();

        // TODO: Upload to Supabase storage and return URL
        // For now, return the video as base64
        const base64Video = Buffer.from(videoBuffer).toString("base64");

        // Clean up on the Python server
        await fetch(`${LIPSYNC_API_URL}/cleanup/${result.job_id}`, {
            method: "DELETE",
        });

        return NextResponse.json({
            success: true,
            videoData: `data:video/mp4;base64,${base64Video}`,
        });
    } catch (error) {
        console.error("Lip sync error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Health check for the lip sync service
        const response = await fetch(`${LIPSYNC_API_URL}/health`);

        if (!response.ok) {
            return NextResponse.json(
                { status: "unavailable", error: "Lip sync service not running" },
                { status: 503 }
            );
        }

        const data = await response.json();
        return NextResponse.json({
            status: "available",
            service: data.service,
        });
    } catch {
        return NextResponse.json(
            { status: "unavailable", error: "Lip sync service not running" },
            { status: 503 }
        );
    }
}
