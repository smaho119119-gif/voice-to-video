import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const HEYGEN_API_BASE = "https://api.heygen.com/v2";

export async function GET(req: NextRequest) {
    if (!process.env.HEYGEN_API_KEY) {
        return NextResponse.json(
            { error: "HeyGen API Key is missing" },
            { status: 500 }
        );
    }

    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return NextResponse.json(
            { error: "videoId is required" },
            { status: 400 }
        );
    }

    try {
        const response = await axios.get(
            `${HEYGEN_API_BASE}/video_status.get?video_id=${videoId}`,
            {
                headers: {
                    "X-Api-Key": process.env.HEYGEN_API_KEY
                }
            }
        );

        const data = response.data.data;

        return NextResponse.json({
            success: true,
            videoId,
            status: data.status, // pending, processing, completed, failed
            progress: data.progress || 0,
            videoUrl: data.video_url || null,
            thumbnailUrl: data.thumbnail_url || null,
            duration: data.duration || null,
            error: data.error || null
        });

    } catch (error: any) {
        console.error("HeyGen Status Error:", error.response?.data || error.message);
        return NextResponse.json(
            {
                error: "Failed to get video status",
                details: error.response?.data?.message || error.message
            },
            { status: 500 }
        );
    }
}
