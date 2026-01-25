import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// TTS Provider Types
type TTSProvider = "openai" | "google" | "elevenlabs" | "gemini";

interface VoiceConfig {
    provider: TTSProvider;
    voice?: string;
    speed?: number;
    pitch?: number;
    style?: string; // 演技指導: "疲れた声で、ゆっくりと" など
    model?: string; // Gemini TTS model: "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-tts", etc.
}

// Helper to save audio locally and return URL (fast local storage)
async function saveAudioLocally(base64Audio: string, format: string = "mp3"): Promise<string> {
    try {
        const audioDir = path.join(process.cwd(), "public", "audio-cache");
        await mkdir(audioDir, { recursive: true });

        const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
        const filePath = path.join(audioDir, fileName);

        const buffer = Buffer.from(base64Audio, "base64");
        await writeFile(filePath, buffer);

        return `/audio-cache/${fileName}`;
    } catch (error) {
        console.error("Failed to save audio locally:", error);
        // Fallback to base64 if local save fails
        return `data:audio/${format};base64,${base64Audio}`;
    }
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

// Google Cloud TTS Japanese voices（実動作確認済み: A=女性, D=男性）
const GOOGLE_VOICES = {
    "ja-JP-Wavenet-A": "Wavenet-A - 女性（推奨）",
    "ja-JP-Wavenet-D": "Wavenet-D - 男性（推奨）"
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

        // Debug: Log the voice configuration
        console.log("[Voice API] Provider:", provider, "Voice:", config?.voice);

        switch (provider) {
            case "openai":
                return await generateOpenAIVoice(text, config);
            case "google":
                return await generateGoogleVoice(text, config);
            case "elevenlabs":
                return await generateElevenLabsVoice(text, config);
            case "gemini":
                return await generateGeminiVoice(text, config);
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
    const audioUrl = await saveAudioLocally(base64Audio, "mp3");

    return NextResponse.json({
        success: true,
        provider: "openai",
        audioUrl,
        format: "mp3",
        voice: voice
    });
}

async function generateGoogleVoice(text: string, config: VoiceConfig) {
    if (!process.env.GOOGLE_TTS_API_KEY) {
        return NextResponse.json({ error: "Google TTS API Key is missing" }, { status: 500 });
    }

    const voice = config?.voice || "ja-JP-Wavenet-A";
    console.log("[Google TTS] Using voice:", voice);
    // 指示書準拠: speakingRate=0.95, pitch=-1.0(女性)/-2.0(男性)
    const speed = config?.speed || 0.95;
    const isWavenetD = voice === "ja-JP-Wavenet-D";
    const pitch = config?.pitch ?? (isWavenetD ? -2.0 : -1.0);

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
    const audioUrl = await saveAudioLocally(data.audioContent, "mp3");

    return NextResponse.json({
        success: true,
        provider: "google",
        audioUrl,
        format: "mp3",
        voice: voice
    });
}

async function generateElevenLabsVoice(text: string, config: VoiceConfig) {
    if (!process.env.ELEVENLABS_API_KEY) {
        return NextResponse.json({ error: "ElevenLabs API Key is missing" }, { status: 500 });
    }

    const voiceId = config?.voice || "yoZ06aMxZJJ28mfd3POQ";
    console.log("[ElevenLabs] Using voiceId:", voiceId);
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
    const audioUrl = await saveAudioLocally(base64Audio, "mp3");

    return NextResponse.json({
        success: true,
        provider: "elevenlabs",
        audioUrl,
        format: "mp3",
        voice: voiceId
    });
}

// Convert PCM to WAV format
function pcmToWav(pcmData: Buffer, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Buffer {
    const dataLength = pcmData.length;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);

    const buffer = Buffer.alloc(totalLength);

    // RIFF header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(totalLength - 8, 4);
    buffer.write("WAVE", 8);

    // fmt sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataLength, 40);
    pcmData.copy(buffer, 44);

    return buffer;
}

// Gemini 2.5 TTS Preview (natural, human-like voice with improved Japanese support)
async function generateGeminiVoice(text: string, config: VoiceConfig) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
    }

    const voiceName = config?.voice || "Zephyr";
    const voiceStyle = config?.style || "";
    const ttsModel = config?.model || "gemini-2.5-flash-preview-tts";
    console.log("[Gemini 2.5 TTS] Using voice:", voiceName, "Model:", ttsModel, "Style:", voiceStyle || "(default)");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Use selected Gemini TTS model
    const model = genAI.getGenerativeModel({
        model: ttsModel,
        generationConfig: {
            responseModalities: ["audio"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voiceName
                    }
                }
            }
        } as any
    });

    // Build prompt with acting direction
    let prompt: string;
    if (voiceStyle) {
        prompt = `【演技指導】
${voiceStyle}

【重要】上記の演技指導に従って、以下のセリフを読み上げてください。
セリフ以外のコメントや説明は一切不要です。セリフのみを音声にしてください。

【セリフ】
${text}`;
    } else {
        prompt = `以下の日本語テキストを自然に、感情を込めて読み上げてください。コメントは不要です:\n\n${text}`;
    }

    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        });

        const response = result.response;

        // Extract audio data from response
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if ((part as any).inlineData?.mimeType?.startsWith("audio/")) {
                    const audioData = (part as any).inlineData.data;
                    const mimeType = (part as any).inlineData.mimeType;
                    console.log("[Gemini TTS] Received audio mimeType:", mimeType);

                    // Handle PCM/L16 format - convert to WAV
                    if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
                        // Parse sample rate from mimeType (e.g., "audio/L16;rate=24000")
                        const rateMatch = mimeType.match(/rate=(\d+)/);
                        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

                        const pcmBuffer = Buffer.from(audioData, "base64");
                        const wavBuffer = pcmToWav(pcmBuffer, sampleRate);
                        const wavBase64 = wavBuffer.toString("base64");
                        const audioUrl = await saveAudioLocally(wavBase64, "wav");

                        return NextResponse.json({
                            success: true,
                            provider: "gemini",
                            audioUrl,
                            format: "wav",
                            voice: voiceName
                        });
                    }

                    // Other formats (mp3, wav, etc.) - use as-is
                    const format = mimeType.split("/")[1]?.split(";")[0] || "wav";
                    const audioUrl = await saveAudioLocally(audioData, format);

                    return NextResponse.json({
                        success: true,
                        provider: "gemini",
                        audioUrl,
                        format,
                        voice: voiceName
                    });
                }
            }
        }

        throw new Error("No audio data in Gemini response");
    } catch (error: any) {
        console.error("Gemini TTS Error:", error);
        throw new Error(`Gemini TTS failed: ${error.message}`);
    }
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
            },
            gemini: {
                name: "Gemini 2.5 TTS Preview",
                description: "Google Gemini 2.5の最新TTS。自然で表現力豊かな日本語音声。",
                voices: {
                    "Zephyr": "Zephyr - 明るい女性声",
                    "Puck": "Puck - 活発な男性声",
                    "Charon": "Charon - 落ち着いた男性声",
                    "Kore": "Kore - 柔らかい女性声",
                    "Fenrir": "Fenrir - 力強い男性声",
                    "Leda": "Leda - 温かみのある女性声",
                    "Orus": "Orus - 知的な男性声",
                    "Aoede": "Aoede - 自然な女性声"
                },
                requiresKey: "GEMINI_API_KEY",
                available: !!process.env.GEMINI_API_KEY
            }
        }
    });
}
