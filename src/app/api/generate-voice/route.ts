import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// TTS Provider Types
type TTSProvider = "openai" | "google" | "elevenlabs";

interface VoiceConfig {
    provider: TTSProvider;
    voice?: string;
    speed?: number;
    pitch?: number;
}

// OpenAI TTS voices
const OPENAI_VOICES = {
    alloy: "Alloy - バランスの取れた声",
    echo: "Echo - 落ち着いた男性声",
    fable: "Fable - 物語向けの声",
    onyx: "Onyx - 深みのある男性声",
    nova: "Nova - 明るい女性声",
    shimmer: "Shimmer - 柔らかい女性声"
};

// Google Cloud TTS Japanese voices
const GOOGLE_VOICES = {
    "ja-JP-Neural2-B": "Neural2-B - 男性（高品質）",
    "ja-JP-Neural2-C": "Neural2-C - 女性（高品質）",
    "ja-JP-Neural2-D": "Neural2-D - 男性（高品質）",
    "ja-JP-Wavenet-A": "Wavenet-A - 女性",
    "ja-JP-Wavenet-B": "Wavenet-B - 女性",
    "ja-JP-Wavenet-C": "Wavenet-C - 男性",
    "ja-JP-Wavenet-D": "Wavenet-D - 男性"
};

// ElevenLabs voices (example IDs - would need actual IDs)
const ELEVENLABS_VOICES = {
    "yoZ06aMxZJJ28mfd3POQ": "Japanese Male 1",
    "XrExE9yKIg1WjnnlVkGX": "Japanese Female 1"
};

export async function POST(req: NextRequest) {
    try {
        const { text, config }: { text: string; config: VoiceConfig } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const provider = config?.provider || "openai";

        switch (provider) {
            case "openai":
                return await generateOpenAIVoice(text, config);
            case "google":
                return await generateGoogleVoice(text, config);
            case "elevenlabs":
                return await generateElevenLabsVoice(text, config);
            default:
                return NextResponse.json({ error: "Unknown TTS provider" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("Voice Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate voice", details: error.message },
            { status: 500 }
        );
    }
}

async function generateOpenAIVoice(text: string, config: VoiceConfig) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "OpenAI API Key is missing" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const voice = (config?.voice as keyof typeof OPENAI_VOICES) || "nova";
    const speed = config?.speed || 1.0;

    const response = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: voice as any,
        input: text,
        speed: speed,
        response_format: "mp3"
    });

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
        success: true,
        provider: "openai",
        audioUrl: `data:audio/mp3;base64,${base64Audio}`,
        format: "mp3",
        voice: voice
    });
}

async function generateGoogleVoice(text: string, config: VoiceConfig) {
    if (!process.env.GOOGLE_TTS_API_KEY) {
        return NextResponse.json({ error: "Google TTS API Key is missing" }, { status: 500 });
    }

    const voice = config?.voice || "ja-JP-Neural2-C";
    const speed = config?.speed || 1.0;
    const pitch = config?.pitch || 0;

    const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode: "ja-JP",
                    name: voice
                },
                audioConfig: {
                    audioEncoding: "MP3",
                    speakingRate: speed,
                    pitch: pitch
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Google TTS failed");
    }

    const data = await response.json();

    return NextResponse.json({
        success: true,
        provider: "google",
        audioUrl: `data:audio/mp3;base64,${data.audioContent}`,
        format: "mp3",
        voice: voice
    });
}

async function generateElevenLabsVoice(text: string, config: VoiceConfig) {
    if (!process.env.ELEVENLABS_API_KEY) {
        return NextResponse.json({ error: "ElevenLabs API Key is missing" }, { status: 500 });
    }

    const voiceId = config?.voice || "yoZ06aMxZJJ28mfd3POQ";
    const stability = 0.5;
    const similarityBoost = 0.75;

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability,
                    similarity_boost: similarityBoost
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
        success: true,
        provider: "elevenlabs",
        audioUrl: `data:audio/mp3;base64,${base64Audio}`,
        format: "mp3",
        voice: voiceId
    });
}

// GET endpoint to list available voices
export async function GET() {
    return NextResponse.json({
        providers: {
            openai: {
                name: "OpenAI TTS",
                description: "高品質な音声合成。英語が得意だが日本語も対応。",
                voices: OPENAI_VOICES,
                requiresKey: "OPENAI_API_KEY",
                available: !!process.env.OPENAI_API_KEY
            },
            google: {
                name: "Google Cloud TTS",
                description: "ネイティブ日本語に最適。Neural2/Wavenet音声対応。",
                voices: GOOGLE_VOICES,
                requiresKey: "GOOGLE_TTS_API_KEY",
                available: !!process.env.GOOGLE_TTS_API_KEY
            },
            elevenlabs: {
                name: "ElevenLabs",
                description: "最高品質の音声クローニング。感情表現が豊か。",
                voices: ELEVENLABS_VOICES,
                requiresKey: "ELEVENLABS_API_KEY",
                available: !!process.env.ELEVENLABS_API_KEY
            }
        }
    });
}
