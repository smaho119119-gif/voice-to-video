/**
 * Avatar Composer
 * Composites 2D avatar with mouth shapes and blinking eyes
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { MouthCue, MouthShape, cuesToFrames } from "./rhubarb";

const execAsync = promisify(exec);

export type EyeState = "open" | "half" | "closed";

export interface AvatarConfig {
    name: string;
    description: string;
    format?: "svg" | "png";          // Image format (default: svg)
    compositeMode?: "overlay" | "full";  // overlay: base+parts, full: complete frames
    base?: string;                   // Base image (not needed for full mode)
    mouths: Record<MouthShape, string>;
    eyes?: {
        open: string;
        half: string;
        closed: string;
    };
    blink?: {
        enabled: boolean;
        intervalMin: number;  // Min seconds between blinks
        intervalMax: number;  // Max seconds between blinks
        duration: number;     // Blink duration in seconds
    };
    size: {
        width: number;
        height: number;
    };
    fps: number;
}

export interface CompositeOptions {
    avatarPath: string;      // Path to avatar preset folder
    audioPath: string;       // Path to audio file
    outputPath: string;      // Output video path
    mouthCues: MouthCue[];   // Mouth timing data from Rhubarb
    duration: number;        // Total duration in seconds
}

/**
 * Load avatar configuration
 */
export async function loadAvatarConfig(avatarPath: string): Promise<AvatarConfig> {
    const configPath = path.join(avatarPath, "config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configData);
}

/**
 * List available 2D avatar presets
 */
export async function listAvatarPresets(): Promise<{ id: string; name: string; path: string }[]> {
    const presetsDir = path.join(process.cwd(), "public", "avatars", "2d");

    try {
        const entries = await fs.readdir(presetsDir, { withFileTypes: true });
        const presets: { id: string; name: string; path: string }[] = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const configPath = path.join(presetsDir, entry.name, "config.json");
                try {
                    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
                    // Skip templates (they don't have actual images yet)
                    if (config.isTemplate) {
                        continue;
                    }
                    presets.push({
                        id: entry.name,
                        name: config.name || entry.name,
                        path: path.join(presetsDir, entry.name),
                    });
                } catch {
                    // Skip invalid presets
                }
            }
        }

        return presets;
    } catch {
        return [];
    }
}

/**
 * Generate blink timing for the video duration
 * Returns array of { start, end } times for each blink
 */
function generateBlinkTimings(
    duration: number,
    intervalMin: number,
    intervalMax: number,
    blinkDuration: number
): { start: number; end: number }[] {
    const blinks: { start: number; end: number }[] = [];
    let currentTime = intervalMin + Math.random() * (intervalMax - intervalMin);

    while (currentTime < duration - blinkDuration) {
        blinks.push({
            start: currentTime,
            end: currentTime + blinkDuration,
        });
        // Next blink after random interval
        currentTime += intervalMin + Math.random() * (intervalMax - intervalMin);
    }

    return blinks;
}

/**
 * Get eye state at a specific time based on blink timings
 */
function getEyeStateAtTime(
    time: number,
    blinks: { start: number; end: number }[],
    blinkDuration: number
): EyeState {
    for (const blink of blinks) {
        if (time >= blink.start && time < blink.end) {
            const blinkProgress = (time - blink.start) / blinkDuration;
            // Blink animation: open -> half -> closed -> half -> open
            if (blinkProgress < 0.2) return "half";
            if (blinkProgress < 0.5) return "closed";
            if (blinkProgress < 0.8) return "half";
            return "open";
        }
    }
    return "open";
}

/**
 * Load image (SVG or PNG) and resize to target dimensions
 */
async function loadImage(imagePath: string, width: number, height: number): Promise<Buffer> {
    const content = await fs.readFile(imagePath);
    return sharp(content)
        .resize(width, height)
        .png()
        .toBuffer();
}

/**
 * Composite base image with eyes and mouth overlays
 */
async function compositeFrame(
    baseBuffer: Buffer,
    eyeBuffer: Buffer | null,
    mouthBuffer: Buffer
): Promise<Buffer> {
    const layers: { input: Buffer; blend: "over" }[] = [];

    if (eyeBuffer) {
        layers.push({ input: eyeBuffer, blend: "over" });
    }
    layers.push({ input: mouthBuffer, blend: "over" });

    return sharp(baseBuffer)
        .composite(layers)
        .png()
        .toBuffer();
}

/**
 * Generate lip-synced video from 2D avatar with blinking
 * Supports both overlay mode (base + parts) and full-frame mode
 */
export async function generateLipSyncVideo(options: CompositeOptions): Promise<string> {
    const { avatarPath, audioPath, outputPath, mouthCues, duration } = options;

    // Load avatar config
    const config = await loadAvatarConfig(avatarPath);
    const { width, height } = config.size;
    const fps = config.fps || 30;
    const isFullMode = config.compositeMode === "full";

    // Create temp directory for frames
    const tempDir = path.join(process.cwd(), "temp", `lipsync-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
        // Pre-load all mouth/frame images
        const mouthBuffers: Record<MouthShape, Buffer> = {} as Record<MouthShape, Buffer>;
        for (const [shape, filename] of Object.entries(config.mouths)) {
            const mouthPath = path.join(avatarPath, filename);
            mouthBuffers[shape as MouthShape] = await loadImage(mouthPath, width, height);
        }

        let baseBuffer: Buffer | null = null;
        let eyeBuffers: Record<EyeState, Buffer> | null = null;
        let blinkTimings: { start: number; end: number }[] = [];

        // Only load base and eyes for overlay mode
        if (!isFullMode) {
            // Load base image
            if (config.base) {
                const basePath = path.join(avatarPath, config.base);
                baseBuffer = await loadImage(basePath, width, height);
            }

            // Pre-load eye images if available
            if (config.eyes && config.blink?.enabled) {
                eyeBuffers = {} as Record<EyeState, Buffer>;
                for (const [state, filename] of Object.entries(config.eyes)) {
                    const eyePath = path.join(avatarPath, filename);
                    eyeBuffers[state as EyeState] = await loadImage(eyePath, width, height);
                }

                // Generate random blink timings
                blinkTimings = generateBlinkTimings(
                    duration,
                    config.blink.intervalMin,
                    config.blink.intervalMax,
                    config.blink.duration
                );
                console.log(`[AvatarComposer] Generated ${blinkTimings.length} blinks`);
            }
        }

        // Convert cues to frame-based data
        const mouthFrames = cuesToFrames(mouthCues, fps, duration);
        const totalFrames = mouthFrames.length;

        // Generate each frame
        const modeLabel = isFullMode ? "full-frame" : "overlay";
        console.log(`[AvatarComposer] Generating ${totalFrames} frames (${modeLabel} mode)...`);

        for (let i = 0; i < totalFrames; i++) {
            const time = i / fps;
            const mouthShape = mouthFrames[i];
            const mouthBuffer = mouthBuffers[mouthShape] || mouthBuffers["X"];

            let frameBuffer: Buffer;

            if (isFullMode) {
                // Full-frame mode: use mouth image directly (it's the complete frame)
                frameBuffer = mouthBuffer;
            } else {
                // Overlay mode: composite base + eyes + mouth
                // Get eye state for this frame
                let eyeBuffer: Buffer | null = null;
                if (eyeBuffers && config.blink) {
                    const eyeState = getEyeStateAtTime(time, blinkTimings, config.blink.duration);
                    eyeBuffer = eyeBuffers[eyeState];
                }

                frameBuffer = await compositeFrame(baseBuffer!, eyeBuffer, mouthBuffer);
            }

            const framePath = path.join(tempDir, `frame_${String(i).padStart(6, "0")}.png`);
            await fs.writeFile(framePath, frameBuffer);

            // Progress logging every 30 frames
            if (i % 30 === 0) {
                console.log(`[AvatarComposer] Generated frame ${i}/${totalFrames}`);
            }
        }

        // Use FFmpeg to create video with audio
        console.log("[AvatarComposer] Creating video with FFmpeg...");

        const ffmpegCmd = [
            "/opt/homebrew/bin/ffmpeg",
            "-y",
            "-framerate", String(fps),
            "-i", `"${path.join(tempDir, "frame_%06d.png")}"`,
            "-i", `"${audioPath}"`,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-shortest",
            `"${outputPath}"`,
        ].join(" ");

        await execAsync(ffmpegCmd, { timeout: 120000 });

        console.log(`[AvatarComposer] Video created: ${outputPath}`);

        return outputPath;
    } finally {
        // Cleanup temp directory
        try {
            await fs.rm(tempDir, { recursive: true });
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * Get preview image of avatar with specific mouth and eye state
 */
export async function getAvatarPreview(
    avatarPath: string,
    mouthShape: MouthShape = "X",
    eyeState: EyeState = "open"
): Promise<Buffer> {
    const config = await loadAvatarConfig(avatarPath);
    const { width, height } = config.size;
    const isFullMode = config.compositeMode === "full";

    const mouthPath = path.join(avatarPath, config.mouths[mouthShape]);
    const mouthBuffer = await loadImage(mouthPath, width, height);

    // Full-frame mode: return the mouth image directly (it's the complete frame)
    if (isFullMode) {
        return mouthBuffer;
    }

    // Overlay mode: composite base + eyes + mouth
    const basePath = path.join(avatarPath, config.base!);
    const baseBuffer = await loadImage(basePath, width, height);

    let eyeBuffer: Buffer | null = null;
    if (config.eyes) {
        const eyePath = path.join(avatarPath, config.eyes[eyeState]);
        eyeBuffer = await loadImage(eyePath, width, height);
    }

    return compositeFrame(baseBuffer, eyeBuffer, mouthBuffer);
}
