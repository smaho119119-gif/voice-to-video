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
    provider: "gemini" | "google" | "elevenlabs" | "aivis";
    voice: string;
    secondaryVoice?: string; // guest/customer用
    model?: string;
    // AivisSpeech用
    styleId?: number;         // メイン話者のスタイルID
    secondaryStyleId?: number; // サブ話者のスタイルID（対話モード用）
}

// 文字タイミング情報（外部公開用）
interface CharTimingPublic {
    char: string;
    start: number;  // 秒
    end: number;    // 秒
}

interface TimesheetEntry {
    id: number;
    startTime: number;
    endTime: number;
    duration: number;
    audioUrl: string;
    text: string;
    charTimings?: CharTimingPublic[];  // AivisSpeech使用時のみ
}

// 内部処理用（Supabaseアップロード用のデータを含む）
interface InternalTimesheetEntry extends TimesheetEntry {
    base64?: string;
    format?: string;
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
// Supabaseへのアップロードは後で別途行う（ブロッキングしない）
async function saveAudioLocally(base64Audio: string, format: string = "mp3"): Promise<{ url: string; duration: number; filePath: string; base64: string }> {
    const audioDir = path.join(process.cwd(), "public", "audio-cache");
    await mkdir(audioDir, { recursive: true });

    const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
    const filePath = path.join(audioDir, fileName);

    const buffer = Buffer.from(base64Audio, "base64");
    await writeFile(filePath, buffer);

    const duration = await getAudioDuration(filePath);

    // ローカルURLを返す（Supabaseアップロードはブロッキングしない）
    return { url: `/audio-cache/${fileName}`, duration, filePath, base64: base64Audio };
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

// AivisSpeech settings
const AIVIS_BASE_URL = process.env.AIVIS_URL || "http://localhost:10101";

// 文字タイミング情報の型
interface CharTiming {
    char: string;
    start: number;  // 秒
    end: number;    // 秒
}

// audio_queryのモーラ情報からcharTimingsを抽出
function extractCharTimingsFromAudioQuery(audioQuery: any): CharTiming[] {
    const charTimings: CharTiming[] = [];
    let currentTime = 0;

    if (!audioQuery?.accent_phrases) {
        return charTimings;
    }

    for (const phrase of audioQuery.accent_phrases) {
        if (!phrase?.moras) continue;

        for (const mora of phrase.moras) {
            const consonantLength = mora.consonant_length || 0;
            const vowelLength = mora.vowel_length || 0;
            const totalLength = consonantLength + vowelLength;

            if (mora.text) {
                charTimings.push({
                    char: mora.text,
                    start: currentTime,
                    end: currentTime + totalLength,
                });
            }

            currentTime += totalLength;
        }

        // pause_mora（句読点の間など）
        if (phrase.pause_mora) {
            const pauseLength = (phrase.pause_mora.consonant_length || 0) + (phrase.pause_mora.vowel_length || 0);
            currentTime += pauseLength;
        }
    }

    console.log(`[AivisSpeech] Extracted ${charTimings.length} char timings, total duration: ${currentTime.toFixed(2)}s`);
    return charTimings;
}

// Generate single audio using AivisSpeech (VOICEVOX互換)
async function generateAivisAudio(
    text: string,
    styleId: number
): Promise<{ base64: string; format: string; charTimings?: CharTiming[] } | null> {
    console.log(`[AivisSpeech] Generating audio: styleId=${styleId}, text="${text.slice(0, 30)}..."`);

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

        // タイミング情報を抽出
        const charTimings = extractCharTimingsFromAudioQuery(audioQuery);

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

        console.log(`[AivisSpeech] Audio received, length: ${base64Audio.length}, charTimings: ${charTimings.length}`);
        return { base64: base64Audio, format: "wav", charTimings };
    } catch (error: any) {
        console.error(`[AivisSpeech] Error:`, error.message || error);
        throw error;
    }
}

// Generate single audio using Google Cloud TTS
async function generateGoogleAudio(
    text: string,
    voiceName: string
): Promise<{ base64: string; format: string } | null> {
    if (!process.env.GOOGLE_TTS_API_KEY) {
        throw new Error("Google TTS API Key is missing");
    }

    console.log(`[Google TTS] Generating audio: voice=${voiceName}, text="${text.slice(0, 30)}..."`);

    // 指示書準拠: speakingRate=0.95, pitch=-1.0(女性)/-2.0(男性)
    const isWavenetD = voiceName === "ja-JP-Wavenet-D";
    const pitch = isWavenetD ? -2.0 : -1.0;

    const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode: "ja-JP",
                    name: voiceName
                },
                audioConfig: {
                    audioEncoding: "MP3",
                    speakingRate: 0.95,
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
    console.log(`[Google TTS] Audio received, length: ${data.audioContent?.length || 0}`);

    return { base64: data.audioContent, format: "mp3" };
}

// Generate single audio using Gemini TTS
async function generateGeminiAudio(
    text: string,
    voiceName: string,
    voiceStyle: string,
    model: string
): Promise<{ base64: string; format: string } | null> {
    try {
        console.log(`[Gemini TTS] Generating audio: voice=${voiceName}, model=${model}, text="${text.slice(0, 30)}..."`);

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
        console.log(`[Gemini TTS] Response received, candidates: ${response.candidates?.length || 0}`);

        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if ((part as any).inlineData?.mimeType?.startsWith("audio/")) {
                    const audioData = (part as any).inlineData.data;
                    const mimeType = (part as any).inlineData.mimeType;
                    console.log(`[Gemini TTS] Audio found: mimeType=${mimeType}, dataLength=${audioData?.length || 0}`);

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
            console.log(`[Gemini TTS] No audio in response parts:`, response.candidates[0].content.parts.map((p: any) => p.text || p.inlineData?.mimeType || 'unknown'));
        } else {
            console.log(`[Gemini TTS] No candidates or parts in response`);
        }

        return null;
    } catch (error: any) {
        console.error(`[Gemini TTS] Error:`, error.message || error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    console.log("[Batch Audio] API called");

    if (!process.env.GEMINI_API_KEY) {
        console.error("[Batch Audio] GEMINI_API_KEY is missing!");
        return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
    }

    try {
        const body = await req.json();
        console.log("[Batch Audio] Received body keys:", Object.keys(body));

        const { scenes, voiceConfig, customDictionary }: {
            scenes: SceneInput[];
            voiceConfig: VoiceConfig;
            customDictionary?: any[];
        } = body;

        console.log("[Batch Audio] Scenes count:", scenes?.length);
        console.log("[Batch Audio] Voice config:", JSON.stringify(voiceConfig));

        if (!scenes || scenes.length === 0) {
            console.error("[Batch Audio] No scenes provided!");
            return NextResponse.json({ error: "No scenes provided" }, { status: 400 });
        }

        console.log(`[Batch Audio] Starting batch generation for ${scenes.length} scenes`);

        const timesheet: InternalTimesheetEntry[] = [];
        let currentTime = 0;

        // Generate audio for each scene sequentially to build accurate timesheet
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            console.log(`[Batch Audio] Generating scene ${i + 1}/${scenes.length} [speaker: ${scene.speaker || "default"}]: "${scene.text.slice(0, 30)}..."`);

            // Apply reading dictionary
            const processedText = applyReadingDictionary(scene.text, customDictionary);

            // Determine which voice to use based on speaker type
            // speaker2 = 対話モードの二人目 (guest/視聴者代表)
            // guest/customer = 従来の話者タイプ
            const isSecondaryVoice =
                scene.speaker === "speaker2" ||
                scene.speaker === "guest" ||
                scene.speaker === "customer";
            const voice = isSecondaryVoice
                ? voiceConfig.secondaryVoice || voiceConfig.voice
                : voiceConfig.voice;

            console.log(`[Batch Audio]   -> Voice: ${voice} (secondary: ${isSecondaryVoice})`);

            const model = voiceConfig.model || "gemini-2.5-flash-preview-tts";
            let currentProvider = voiceConfig.provider || "gemini";

            // Google TTS用の音声マッピング（Gemini音声名 → Google音声名）
            const geminiToGoogleVoiceMap: Record<string, string> = {
                "Zephyr": "ja-JP-Wavenet-A",  // 女性
                "Kore": "ja-JP-Wavenet-A",    // 女性
                "Leda": "ja-JP-Wavenet-A",    // 女性
                "Aoede": "ja-JP-Wavenet-A",   // 女性
                "Puck": "ja-JP-Wavenet-D",    // 男性
                "Charon": "ja-JP-Wavenet-D",  // 男性
                "Fenrir": "ja-JP-Wavenet-D",  // 男性
                "Orus": "ja-JP-Wavenet-D",    // 男性
            };

            try {
                let audioResult: { base64: string; format: string; charTimings?: CharTiming[] } | null = null;

                // AivisSpeech用のスタイルID
                const primaryStyleId = voiceConfig.styleId || 888753760;  // デフォルト: まお - ノーマル
                const secondaryStyleId = voiceConfig.secondaryStyleId || 1310138976; // デフォルト: 阿井田茂 - ノーマル
                const aivisStyleId = isSecondaryVoice ? secondaryStyleId : primaryStyleId;

                // ===== 3段階フォールバック: 選択プロバイダー → Aivis → Google =====

                if (currentProvider === "aivis") {
                    // AivisSpeech（ローカル、完全無料）
                    console.log(`[Batch Audio]   -> AivisSpeech styleId: ${aivisStyleId}`);
                    try {
                        audioResult = await generateAivisAudio(processedText, aivisStyleId);
                    } catch (aivisError: any) {
                        // Aivisサーバーがダウンしている場合、Google TTSにフォールバック
                        console.warn(`[Batch Audio] Aivis failed (${aivisError.message}), falling back to Google TTS`);
                        currentProvider = "google";
                        const googleVoice = isSecondaryVoice ? "ja-JP-Wavenet-D" : "ja-JP-Wavenet-A";
                        audioResult = await generateGoogleAudio(processedText, googleVoice);
                    }
                } else if (currentProvider === "gemini") {
                    // Gemini TTSを試行
                    try {
                        audioResult = await generateGeminiAudio(
                            processedText,
                            voice,
                            scene.voiceStyle || "",
                            model
                        );
                    } catch (geminiError: any) {
                        // クォータ超過（429）の場合、Aivis → Googleの順でフォールバック
                        if (geminiError.message?.includes("429") || geminiError.message?.includes("quota") || geminiError.message?.includes("RESOURCE_EXHAUSTED")) {
                            console.warn(`[Batch Audio] Gemini quota exceeded, trying Aivis first...`);
                            try {
                                // まずAivisを試行
                                audioResult = await generateAivisAudio(processedText, aivisStyleId);
                                currentProvider = "aivis";
                                console.log(`[Batch Audio] Aivis fallback successful`);
                            } catch (aivisError: any) {
                                // AivisもダメならGoogle TTSにフォールバック
                                console.warn(`[Batch Audio] Aivis also failed, falling back to Google TTS`);
                                currentProvider = "google";
                                const googleVoice = geminiToGoogleVoiceMap[voice] || "ja-JP-Wavenet-A";
                                audioResult = await generateGoogleAudio(processedText, googleVoice);
                            }
                        } else {
                            throw geminiError;
                        }
                    }
                } else if (currentProvider === "google") {
                    // Google TTSを使用
                    const googleVoice = voice.startsWith("ja-JP") ? voice : (geminiToGoogleVoiceMap[voice] || "ja-JP-Wavenet-A");
                    audioResult = await generateGoogleAudio(processedText, googleVoice);
                } else {
                    throw new Error(`Unsupported provider: ${currentProvider}`);
                }

                if (!audioResult) {
                    throw new Error("No audio generated");
                }

                // Save audio locally and get duration（ローカル保存のみ、ブロッキングなし）
                const { url, duration, base64 } = await saveAudioLocally(audioResult.base64, audioResult.format);

                // Add to timesheet with exact timing
                const entry: InternalTimesheetEntry = {
                    id: scene.id,
                    startTime: currentTime,
                    endTime: currentTime + duration,
                    duration: duration,
                    audioUrl: url,
                    text: scene.text,
                    base64: base64,  // 後でSupabaseアップロード用
                    format: audioResult.format,
                    charTimings: audioResult.charTimings,  // AivisSpeech使用時のみ
                };

                timesheet.push(entry);
                currentTime += duration; // Next scene starts exactly when this one ends

                console.log(`[Batch Audio] Scene ${i + 1} complete (${currentProvider}): ${duration.toFixed(2)}s, total: ${currentTime.toFixed(2)}s`);

            } catch (error: any) {
                console.error(`[Batch Audio] Failed to generate scene ${i + 1}:`, error.message || error);
                // Add placeholder entry with estimated duration
                const estimatedDuration = Math.ceil(scene.text.length / 10); // ~10 chars per second
                const errorEntry: InternalTimesheetEntry = {
                    id: scene.id,
                    startTime: currentTime,
                    endTime: currentTime + estimatedDuration,
                    duration: estimatedDuration,
                    audioUrl: "",
                    text: scene.text
                };
                timesheet.push(errorEntry);
                currentTime += estimatedDuration;
            }
        }

        // レスポンス用のタイムシート（base64を除去）
        const cleanTimesheet = timesheet.map(({ base64, format, ...rest }) => rest);

        const result: TimesheetResult = {
            success: true,
            timesheet: cleanTimesheet,
            totalDuration: currentTime
        };

        console.log(`[Batch Audio] Complete! Total duration: ${currentTime.toFixed(2)}s`);

        // バックグラウンドでSupabaseにアップロード（レスポンスをブロックしない）
        // Note: これはベストエフォート。失敗してもローカルファイルは使える
        Promise.all(
            timesheet
                .filter(entry => entry.base64 && entry.audioUrl)
                .map(async (entry) => {
                    try {
                        const supabaseUrl = await uploadAudioToStorage(entry.base64!, "batch", entry.format || "wav");
                        if (supabaseUrl) {
                            console.log(`[Batch Audio] Uploaded to Supabase: scene ${entry.id}`);
                        }
                    } catch (err) {
                        console.warn(`[Batch Audio] Supabase upload failed for scene ${entry.id}:`, err);
                    }
                })
        ).catch(err => console.warn("[Batch Audio] Background upload error:", err));

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[Batch Audio] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
