import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { applyReadingDictionary } from "@/lib/reading-dictionary";
import { uploadAudioToStorage } from "@/lib/supabase";

const execAsync = promisify(exec);

interface SceneInput {
    id: number;
    text: string;
    voiceStyle?: string; // 演技指導
    speaker?: string; // 話者タイプ: "main" | "guest" | "narrator"
}

interface VoiceConfig {
    provider: "gemini" | "google" | "elevenlabs";
    voice: string;
    secondaryVoice?: string; // guest/customer用
    model?: string;
}

interface TimesheetEntry {
    id: number;
    startTime: number;
    endTime: number;
    duration: number;
    audioUrl: string;
    text: string;
}

interface TimesheetResult {
    success: boolean;
    timesheet: TimesheetEntry[];
    totalDuration: number;
    error?: string;
}

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

// Save audio locally and return URL + duration
// Also uploads to Supabase for persistence
async function saveAudioLocally(base64Audio: string, format: string = "mp3", userId: string = "batch"): Promise<{ url: string; duration: number; filePath: string }> {
    const audioDir = path.join(process.cwd(), "public", "audio-cache");
    await mkdir(audioDir, { recursive: true });

    const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
    const filePath = path.join(audioDir, fileName);

    const buffer = Buffer.from(base64Audio, "base64");
    await writeFile(filePath, buffer);

    const duration = await getAudioDuration(filePath);

    // Try to upload to Supabase for persistence
    const supabaseUrl = await uploadAudioToStorage(base64Audio, userId, format);
    const finalUrl = supabaseUrl || `/audio-cache/${fileName}`;

    return { url: finalUrl, duration, filePath };
}

// Convert PCM to WAV format
function pcmToWav(pcmData: Buffer, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Buffer {
    const dataLength = pcmData.length;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);

    const buffer = Buffer.alloc(totalLength);

    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(totalLength - 8, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataLength, 40);
    pcmData.copy(buffer, 44);

    return buffer;
}

// Generate single audio using Gemini TTS
async function generateGeminiAudio(
    text: string,
    voiceName: string,
    voiceStyle: string,
    model: string
): Promise<{ base64: string; format: string } | null> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const genModel = genAI.getGenerativeModel({
        model: model,
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

    const result = await genModel.generateContent({
        contents: [{
            role: "user",
            parts: [{ text: prompt }]
        }]
    });

    const response = result.response;

    if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if ((part as any).inlineData?.mimeType?.startsWith("audio/")) {
                const audioData = (part as any).inlineData.data;
                const mimeType = (part as any).inlineData.mimeType;

                // Handle PCM/L16 format - convert to WAV
                if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
                    const rateMatch = mimeType.match(/rate=(\d+)/);
                    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
                    const pcmBuffer = Buffer.from(audioData, "base64");
                    const wavBuffer = pcmToWav(pcmBuffer, sampleRate);
                    return { base64: wavBuffer.toString("base64"), format: "wav" };
                }

                const format = mimeType.split("/")[1]?.split(";")[0] || "wav";
                return { base64: audioData, format };
            }
        }
    }

    return null;
}

export async function POST(req: NextRequest) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
    }

    try {
        const { scenes, voiceConfig, customDictionary }: {
            scenes: SceneInput[];
            voiceConfig: VoiceConfig;
            customDictionary?: any[];
        } = await req.json();

        if (!scenes || scenes.length === 0) {
            return NextResponse.json({ error: "No scenes provided" }, { status: 400 });
        }

        console.log(`[Batch Audio] Starting batch generation for ${scenes.length} scenes`);

        const timesheet: TimesheetEntry[] = [];
        let currentTime = 0;

        // Generate audio for each scene sequentially to build accurate timesheet
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            console.log(`[Batch Audio] Generating scene ${i + 1}/${scenes.length}: "${scene.text.slice(0, 30)}..."`);

            // Apply reading dictionary
            const processedText = applyReadingDictionary(scene.text, customDictionary);

            // Determine which voice to use based on speaker type
            const voice = scene.speaker === "guest" || scene.speaker === "customer"
                ? voiceConfig.secondaryVoice || voiceConfig.voice
                : voiceConfig.voice;

            const model = voiceConfig.model || "gemini-2.5-flash-preview-tts";

            try {
                const audioResult = await generateGeminiAudio(
                    processedText,
                    voice,
                    scene.voiceStyle || "",
                    model
                );

                if (!audioResult) {
                    throw new Error("No audio generated");
                }

                // Save audio and get duration
                const { url, duration } = await saveAudioLocally(audioResult.base64, audioResult.format);

                // Add to timesheet with exact timing
                const entry: TimesheetEntry = {
                    id: scene.id,
                    startTime: currentTime,
                    endTime: currentTime + duration,
                    duration: duration,
                    audioUrl: url,
                    text: scene.text
                };

                timesheet.push(entry);
                currentTime += duration; // Next scene starts exactly when this one ends

                console.log(`[Batch Audio] Scene ${i + 1} complete: ${duration.toFixed(2)}s, total: ${currentTime.toFixed(2)}s`);

            } catch (error: any) {
                console.error(`[Batch Audio] Failed to generate scene ${i + 1}:`, error);
                // Add placeholder entry with estimated duration
                const estimatedDuration = Math.ceil(scene.text.length / 10); // ~10 chars per second
                timesheet.push({
                    id: scene.id,
                    startTime: currentTime,
                    endTime: currentTime + estimatedDuration,
                    duration: estimatedDuration,
                    audioUrl: "",
                    text: scene.text
                });
                currentTime += estimatedDuration;
            }
        }

        const result: TimesheetResult = {
            success: true,
            timesheet,
            totalDuration: currentTime
        };

        console.log(`[Batch Audio] Complete! Total duration: ${currentTime.toFixed(2)}s`);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[Batch Audio] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
