import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { uploadAudioToStorage } from "@/lib/supabase";

const execAsync = promisify(exec);

// TTS Provider Types
type TTSProvider = "openai" | "google" | "elevenlabs" | "gemini" | "aivis";

interface VoiceConfig {
    provider: TTSProvider;
    voice?: string;
    speed?: number;
    pitch?: number;
    style?: string; // 演技指導: "疲れた声で、ゆっくりと" など
    model?: string; // Gemini TTS model: "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-tts", etc.
    styleId?: number; // AivisSpeech style ID
}

// AivisSpeech/VOICEVOX settings
const AIVIS_BASE_URL = process.env.AIVIS_URL || "http://localhost:10101";

// Helper to get audio duration using ffprobe
async function getAudioDuration(filePath: string): Promise<number> {
    try {
        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
        );
        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 0 : duration;
    } catch (error) {
        console.error("Failed to get audio duration:", error);
        return 0;
    }
}

// Helper to save audio locally and return URL + duration (fast local storage)
// Also uploads to Supabase for persistence
async function saveAudioLocally(base64Audio: string, format: string = "mp3", userId: string = "anonymous"): Promise<{ url: string; duration: number }> {
    try {
        const audioDir = path.join(process.cwd(), "public", "audio-cache");
        await mkdir(audioDir, { recursive: true });

        const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
        const filePath = path.join(audioDir, fileName);

        const buffer = Buffer.from(base64Audio, "base64");
        await writeFile(filePath, buffer);

        // Get audio duration using ffprobe
        const duration = await getAudioDuration(filePath);

        // Try to upload to Supabase for persistence (non-blocking)
        const supabaseUrl = await uploadAudioToStorage(base64Audio, userId, format);

        // Return Supabase URL if available, otherwise local URL
        const finalUrl = supabaseUrl || `/audio-cache/${fileName}`;

        return { url: finalUrl, duration };
    } catch (error) {
        console.error("Failed to save audio locally:", error);
        // Fallback to base64 if local save fails
        return { url: `data:audio/${format};base64,${base64Audio}`, duration: 0 };
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

import { applyReadingDictionary } from "@/lib/reading-dictionary";

// カスタム辞書エントリーの型
interface CustomDictionaryEntry {
    id: string;
    pattern: string;
    reading: string;
    note: string;
}

export async function POST(req: NextRequest) {
    try {
        const { text, config, customDictionary }: {
            text: string;
            config: VoiceConfig;
            customDictionary?: CustomDictionaryEntry[];
        } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // 読み辞書を適用（組み込み + カスタム）
        const processedText = applyReadingDictionary(text, customDictionary);
        if (processedText !== text) {
            console.log("[Voice API] Reading dictionary applied:", text.slice(0, 50), "→", processedText.slice(0, 50));
        }

        const provider = config?.provider || "openai";

        // Debug: Log the voice configuration
        console.log("[Voice API] Provider:", provider, "Voice:", config?.voice);

        // Gemini音声名 → Google音声名 マッピング
        const geminiToGoogleVoiceMap: Record<string, string> = {
            "Zephyr": "ja-JP-Wavenet-A", "Kore": "ja-JP-Wavenet-A",
            "Leda": "ja-JP-Wavenet-A", "Aoede": "ja-JP-Wavenet-A",
            "Puck": "ja-JP-Wavenet-D", "Charon": "ja-JP-Wavenet-D",
            "Fenrir": "ja-JP-Wavenet-D", "Orus": "ja-JP-Wavenet-D",
        };

        switch (provider) {
            case "openai":
                return await generateOpenAIVoice(processedText, config);
            case "google":
                return await generateGoogleVoice(processedText, config);
            case "elevenlabs":
                return await generateElevenLabsVoice(processedText, config);
            case "gemini":
                // ===== 3段階フォールバック: Gemini → Aivis → Google =====
                try {
                    return await generateGeminiVoice(processedText, config);
                } catch (geminiError: any) {
                    if (geminiError.message?.includes("429") || geminiError.message?.includes("quota") || geminiError.message?.includes("RESOURCE_EXHAUSTED")) {
                        console.warn("[Voice API] Gemini quota exceeded, trying Aivis first...");
                        try {
                            // まずAivisを試行
                            return await generateAivisVoice(processedText, config);
                        } catch (aivisError: any) {
                            // AivisもダメならGoogle TTSにフォールバック
                            console.warn("[Voice API] Aivis also failed, falling back to Google TTS");
                            const googleVoice = geminiToGoogleVoiceMap[config?.voice || "Zephyr"] || "ja-JP-Wavenet-A";
                            return await generateGoogleVoice(processedText, { ...config, voice: googleVoice });
                        }
                    }
                    throw geminiError;
                }
            case "aivis":
                // ===== Aivis → Google フォールバック =====
                try {
                    return await generateAivisVoice(processedText, config);
                } catch (aivisError: any) {
                    console.warn("[Voice API] Aivis failed, falling back to Google TTS:", aivisError.message);
                    const googleVoice = "ja-JP-Wavenet-A"; // デフォルト女性声
                    return await generateGoogleVoice(processedText, { ...config, voice: googleVoice });
                }
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
    const { url: audioUrl, duration } = await saveAudioLocally(base64Audio, "mp3");

    return NextResponse.json({
        success: true,
        provider: "openai",
        audioUrl,
        duration,
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
    const { url: audioUrl, duration } = await saveAudioLocally(data.audioContent, "mp3");

    return NextResponse.json({
        success: true,
        provider: "google",
        audioUrl,
        duration,
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
    const { url: audioUrl, duration } = await saveAudioLocally(base64Audio, "mp3");

    return NextResponse.json({
        success: true,
        provider: "elevenlabs",
        audioUrl,
        duration,
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
                        const { url: audioUrl, duration } = await saveAudioLocally(wavBase64, "wav");

                        return NextResponse.json({
                            success: true,
                            provider: "gemini",
                            audioUrl,
                            duration,
                            format: "wav",
                            voice: voiceName
                        });
                    }

                    // Other formats (mp3, wav, etc.) - use as-is
                    const format = mimeType.split("/")[1]?.split(";")[0] || "wav";
                    const { url: audioUrl, duration } = await saveAudioLocally(audioData, format);

                    return NextResponse.json({
                        success: true,
                        provider: "gemini",
                        audioUrl,
                        duration,
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

// AivisSpeech TTS (VOICEVOX互換、ローカル実行、完全無料)
async function generateAivisVoice(text: string, config: VoiceConfig) {
    const styleId = config?.styleId || 888753760; // デフォルト: まお - ノーマル
    const speed = config?.speed || 1.0;

    console.log("[AivisSpeech] Generating audio: styleId=", styleId, "text=", text.slice(0, 30));

    try {
        // Step 1: Get audio query
        const queryResponse = await fetch(
            `${AIVIS_BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${styleId}`,
            { method: "POST" }
        );

        if (!queryResponse.ok) {
            throw new Error(`Audio query failed: ${queryResponse.status}`);
        }

        const audioQuery = await queryResponse.json();

        // Apply speed setting
        audioQuery.speedScale = speed;

        // Step 2: Synthesize audio
        const synthesisResponse = await fetch(
            `${AIVIS_BASE_URL}/synthesis?speaker=${styleId}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(audioQuery)
            }
        );

        if (!synthesisResponse.ok) {
            throw new Error(`Synthesis failed: ${synthesisResponse.status}`);
        }

        const audioBuffer = await synthesisResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");

        const { url: audioUrl, duration } = await saveAudioLocally(base64Audio, "wav");

        console.log("[AivisSpeech] Audio generated:", audioUrl, "duration:", duration);

        return NextResponse.json({
            success: true,
            provider: "aivis",
            audioUrl,
            duration,
            format: "wav",
            voice: `style_${styleId}`
        });
    } catch (error: any) {
        console.error("AivisSpeech Error:", error);
        throw new Error(`AivisSpeech failed: ${error.message}`);
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
            },
            aivis: {
                name: "AivisSpeech（ローカル）",
                description: "完全無料・ローカル実行。感情豊かな日本語音声。VOICEVOX互換。",
                voices: {
                    // morioki
                    "497929760": "morioki - ノーマル",
                    // にせ
                    "1937616896": "にせ - ノーマル",
                    // まい
                    "1431611904": "まい - ノーマル",
                    // まお（6スタイル）
                    "888753760": "まお - ノーマル",
                    "888753761": "まお - ふつー",
                    "888753762": "まお - あまあま",
                    "888753763": "まお - おちつき",
                    "888753764": "まお - からかい",
                    "888753765": "まお - せつなめ",
                    // るな
                    "345585728": "るな - ノーマル",
                    // 凛音エル（5スタイル）
                    "1388823424": "凛音エル - ノーマル",
                    "1388823425": "凛音エル - Angry",
                    "1388823426": "凛音エル - Fear",
                    "1388823427": "凛音エル - Happy",
                    "1388823428": "凛音エル - Sad",
                    // 花音
                    "1325133120": "花音 - ノーマル",
                    // 阿井田 茂（7スタイル・男性声）
                    "1310138976": "阿井田 茂 - ノーマル",
                    "1310138977": "阿井田 茂 - Calm",
                    "1310138978": "阿井田 茂 - Far",
                    "1310138979": "阿井田 茂 - Heavy",
                    "1310138980": "阿井田 茂 - Mid",
                    "1310138981": "阿井田 茂 - Shout",
                    "1310138982": "阿井田 茂 - Surprise",
                    // 黄金笑_T2モデル（3スタイル）
                    "1618811328": "黄金笑 - ノーマル",
                    "1618811329": "黄金笑 - Negative",
                    "1618811330": "黄金笑 - Positive"
                },
                requiresKey: null,
                available: true,
                note: "ローカルサーバー(localhost:10101)が必要"
            }
        }
    });
}
