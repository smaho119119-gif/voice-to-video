import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const HEYGEN_API_URL = "https://api.heygen.com/v2/video/generate";

export async function POST(req: NextRequest) {
  if (!process.env.HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: "HeyGen API Key is missing" },
      { status: 500 }
    );
  }

  try {
    const { script, avatarId = "Daisy-beige-20220426", voiceId = "ad28f09b-6dbf-473d-8e43-16a7cc192666" } = await req.json();

    if (!script) {
      return NextResponse.json(
        { error: "No script provided" },
        { status: 400 }
      );
    }

    const response = await axios.post(
      HEYGEN_API_URL,
      {
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal"
            },
            voice: {
              type: "text",
              input_text: script,
              voice_id: voiceId
            }
          }
        ],
        dimension: {
          width: 1280,
          height: 720
        }
      },
      {
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("HeyGen API error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error?.message || "HeyGen video generation failed" },
      { status: 500 }
    );
  }
}
