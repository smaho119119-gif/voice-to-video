import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const HEYGEN_API_BASE = "https://api.heygen.com/v2";

interface AvatarGenerationRequest {
    script: string;
    audioUrl?: string;
    avatarId?: string;
    voiceId?: string;
    emotion?: string;
    background?: {
        type: "color" | "image" | "video";
        value: string;
    };
}

// Default HeyGen avatars (public avatars)
const DEFAULT_AVATARS = {
    "Kristin_public_3_20240108": "Kristin - Professional Female",
    "josh_public_v2_20230929": "Josh - Professional Male",
    "Angela-inblackskirt-20220820": "Angela - Business Female",
    "Tyler-incasualsuit-20220721": "Tyler - Casual Male"
};

// HeyGen voices for Japanese
const JAPANESE_VOICES = {
    "jp_female_mai": "Mai - Japanese Female",
    "jp_male_ken": "Ken - Japanese Male",
    "jp_female_yuki": "Yuki - Japanese Female (Soft)",
    "jp_male_takeshi": "Takeshi - Japanese Male (Deep)"
};

export async function POST(req: NextRequest) {
    if (!process.env.HEYGEN_API_KEY) {
        return NextResponse.json(
            {
                error: "HeyGen API Key is missing",
                message: "Please set HEYGEN_API_KEY in your environment variables"
            },
            { status: 500 }
        );
    }

    try {
        const body: AvatarGenerationRequest = await req.json();
        const { script, audioUrl, avatarId, voiceId, emotion = "neutral", background } = body;

        if (!script && !audioUrl) {
            return NextResponse.json(
                { error: "Either script or audioUrl is required" },
                { status: 400 }
            );
        }

        // Determine input type
        const useCustomAudio = !!audioUrl;

        // Build video generation payload
        const payload: any = {
            video_inputs: [{
                character: {
                    type: "avatar",
                    avatar_id: avatarId || "Kristin_public_3_20240108",
                    avatar_style: "normal"
                },
                voice: useCustomAudio ? {
                    type: "audio",
                    audio_url: audioUrl
                } : {
                    type: "text",
                    input_text: script,
                    voice_id: voiceId || "jp_female_mai",
                    speed: 1.0,
                    pitch: 0
                },
                background: background || {
                    type: "color",
                    value: "#00FF00" // Green screen for compositing
                }
            }],
            dimension: {
                width: 1920,
                height: 1080
            },
            aspect_ratio: "16:9"
        };

        // Create video generation task
        const response = await axios.post(
            `${HEYGEN_API_BASE}/video/generate`,
            payload,
            {
                headers: {
                    "X-Api-Key": process.env.HEYGEN_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        const videoId = response.data.data?.video_id;

        if (!videoId) {
            throw new Error("Failed to create video generation task");
        }

        return NextResponse.json({
            success: true,
            videoId,
            status: "processing",
            message: "Video generation started. Use the status endpoint to check progress."
        });

    } catch (error: any) {
        console.error("HeyGen Avatar Generation Error:", error.response?.data || error.message);
        return NextResponse.json(
            {
                error: "Failed to generate avatar video",
                details: error.response?.data?.message || error.message
            },
            { status: 500 }
        );
    }
}

// GET endpoint to list available avatars and voices
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";

    if (!process.env.HEYGEN_API_KEY) {
        // Return default options if no API key
        return NextResponse.json({
            avatars: DEFAULT_AVATARS,
            voices: JAPANESE_VOICES,
            apiKeyConfigured: false
        });
    }

    try {
        const responses: any = {};

        if (type === "all" || type === "avatars") {
            // Fetch available avatars
            const avatarsRes = await axios.get(`${HEYGEN_API_BASE}/avatars`, {
                headers: { "X-Api-Key": process.env.HEYGEN_API_KEY }
            });
            responses.avatars = avatarsRes.data.data?.avatars || [];
        }

        if (type === "all" || type === "voices") {
            // Fetch available voices
            const voicesRes = await axios.get(`${HEYGEN_API_BASE}/voices`, {
                headers: { "X-Api-Key": process.env.HEYGEN_API_KEY }
            });
            // Filter for Japanese voices
            const allVoices = voicesRes.data.data?.voices || [];
            responses.voices = allVoices.filter((v: any) =>
                v.language?.toLowerCase().includes("japanese") ||
                v.language?.toLowerCase().includes("ja")
            );
        }

        return NextResponse.json({
            ...responses,
            apiKeyConfigured: true
        });

    } catch (error: any) {
        console.error("HeyGen List Error:", error.response?.data || error.message);
        return NextResponse.json({
            avatars: DEFAULT_AVATARS,
            voices: JAPANESE_VOICES,
            apiKeyConfigured: true,
            error: "Failed to fetch from HeyGen API"
        });
    }
}
