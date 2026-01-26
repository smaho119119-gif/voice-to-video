import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { analyzeLipSync, isRhubarbAvailable } from "@/lib/rhubarb";
import { generateLipSyncVideo, listAvatarPresets } from "@/lib/avatar-composer";

const TEMP_DIR = path.join(process.cwd(), "temp");

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const audioFile = formData.get("audio") as File | null;
        const avatarId = formData.get("avatarId") as string | null;

        if (!audioFile) {
            return NextResponse.json(
                { error: "Audio file is required" },
                { status: 400 }
            );
        }

        if (!avatarId) {
            return NextResponse.json(
                { error: "Avatar ID is required" },
                { status: 400 }
            );
        }

        // Ensure temp directory exists
        await fs.mkdir(TEMP_DIR, { recursive: true });

        // Generate unique job ID
        const jobId = `2d-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Save audio file temporarily
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const audioPath = path.join(TEMP_DIR, `${jobId}_audio.mp3`);
        await fs.writeFile(audioPath, audioBuffer);

        // Convert to WAV if needed (Rhubarb prefers WAV)
        let wavPath = audioPath;
        if (!audioFile.name.endsWith(".wav")) {
            wavPath = path.join(TEMP_DIR, `${jobId}_audio.wav`);
            const ffmpegCmd = `/opt/homebrew/bin/ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}"`;
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);
            await execAsync(ffmpegCmd, { timeout: 30000 });
        }

        console.log(`[LipSync2D] Analyzing audio with Rhubarb...`);

        // Analyze audio with Rhubarb (use phonetic for Japanese)
        const rhubarbResult = await analyzeLipSync(wavPath, "phonetic");

        console.log(`[LipSync2D] Found ${rhubarbResult.mouthCues.length} mouth cues`);

        // Get avatar path
        const avatarPath = path.join(process.cwd(), "public", "avatars", "2d", avatarId);

        // Generate video
        const outputPath = path.join(TEMP_DIR, `${jobId}_output.mp4`);

        console.log(`[LipSync2D] Generating video...`);

        await generateLipSyncVideo({
            avatarPath,
            audioPath,
            outputPath,
            mouthCues: rhubarbResult.mouthCues,
            duration: rhubarbResult.metadata.duration,
        });

        // Read output video
        const videoBuffer = await fs.readFile(outputPath);
        const base64Video = videoBuffer.toString("base64");

        // Cleanup temp files
        await Promise.all([
            fs.unlink(audioPath).catch(() => {}),
            wavPath !== audioPath ? fs.unlink(wavPath).catch(() => {}) : Promise.resolve(),
            fs.unlink(outputPath).catch(() => {}),
        ]);

        console.log(`[LipSync2D] Done! Job: ${jobId}`);

        return NextResponse.json({
            success: true,
            jobId,
            videoData: `data:video/mp4;base64,${base64Video}`,
        });
    } catch (error) {
        console.error("[LipSync2D] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Check Rhubarb availability
        const rhubarbAvailable = await isRhubarbAvailable();

        // List available presets
        const presets = await listAvatarPresets();

        return NextResponse.json({
            status: rhubarbAvailable ? "available" : "unavailable",
            service: "rhubarb-2d",
            presets,
        });
    } catch {
        return NextResponse.json(
            { status: "unavailable", error: "Service check failed" },
            { status: 503 }
        );
    }
}
