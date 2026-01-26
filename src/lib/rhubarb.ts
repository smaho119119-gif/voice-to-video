/**
 * Rhubarb Lip Sync utility
 * Analyzes audio and generates mouth shape timing data
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

// Rhubarb mouth shapes
export type MouthShape = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";

export interface MouthCue {
    start: number;  // Start time in seconds
    end: number;    // End time in seconds
    value: MouthShape;
}

export interface RhubarbResult {
    metadata: {
        soundFile: string;
        duration: number;
    };
    mouthCues: MouthCue[];
}

// Path to Rhubarb executable
const RHUBARB_PATH = path.join(process.cwd(), "tools", "rhubarb", "rhubarb");

/**
 * Analyze audio file and generate lip sync data
 * @param audioPath - Path to audio file (WAV or MP3)
 * @param recognizer - Recognizer to use (phonetic for non-English, pocketSphinx for English)
 * @returns Mouth cue timing data
 */
export async function analyzeLipSync(
    audioPath: string,
    recognizer: "phonetic" | "pocketSphinx" = "phonetic"
): Promise<RhubarbResult> {
    // Verify rhubarb exists
    try {
        await fs.access(RHUBARB_PATH);
    } catch {
        throw new Error(`Rhubarb not found at ${RHUBARB_PATH}. Please install Rhubarb first.`);
    }

    // Run rhubarb with JSON output
    const cmd = `"${RHUBARB_PATH}" -f json -r ${recognizer} --machineReadable "${audioPath}"`;

    try {
        const { stdout, stderr } = await execAsync(cmd, {
            timeout: 60000, // 60 second timeout
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        // Parse JSON output
        const result = JSON.parse(stdout);

        return {
            metadata: {
                soundFile: result.metadata?.soundFile || audioPath,
                duration: result.metadata?.duration || 0,
            },
            mouthCues: result.mouthCues || [],
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Rhubarb analysis failed: ${errorMessage}`);
    }
}

/**
 * Get mouth shape at a specific time
 * @param cues - Array of mouth cues
 * @param time - Time in seconds
 * @returns Mouth shape at that time, or "X" if none found
 */
export function getMouthShapeAtTime(cues: MouthCue[], time: number): MouthShape {
    for (const cue of cues) {
        if (time >= cue.start && time < cue.end) {
            return cue.value;
        }
    }
    return "X"; // Default to neutral/rest
}

/**
 * Convert mouth cues to frame-based data
 * @param cues - Array of mouth cues
 * @param fps - Frames per second
 * @param duration - Total duration in seconds
 * @returns Array of mouth shapes for each frame
 */
export function cuesToFrames(
    cues: MouthCue[],
    fps: number,
    duration: number
): MouthShape[] {
    const totalFrames = Math.ceil(duration * fps);
    const frames: MouthShape[] = [];

    for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / fps;
        frames.push(getMouthShapeAtTime(cues, time));
    }

    return frames;
}

/**
 * Check if Rhubarb is available
 */
export async function isRhubarbAvailable(): Promise<boolean> {
    try {
        await fs.access(RHUBARB_PATH);
        const { stdout } = await execAsync(`"${RHUBARB_PATH}" --version`);
        return stdout.includes("Rhubarb");
    } catch {
        return false;
    }
}
