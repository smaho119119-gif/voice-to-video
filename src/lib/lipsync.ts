/**
 * Lip sync utilities using Easy-Wav2Lip
 */

export interface LipSyncOptions {
    quality?: "Fast" | "Improved" | "Enhanced";
    avatarImageUrl?: string;
}

/**
 * Generate lip-synced video from audio and avatar image
 */
export async function generateLipSyncVideo(
    audioUrl: string,
    avatarImageUrl: string,
    options: LipSyncOptions = {}
): Promise<string> {
    const { quality = "Improved" } = options;

    try {
        // Download audio file
        const audioResponse = await fetch(audioUrl);
        const audioBlob = await audioResponse.blob();

        // Download avatar image
        const avatarResponse = await fetch(avatarImageUrl);
        const avatarBlob = await avatarResponse.blob();

        // Prepare form data
        const formData = new FormData();
        formData.append("audio", audioBlob, "audio.mp3");
        formData.append("video", avatarBlob, "avatar.jpg");
        formData.append("quality", quality);

        // Call lip sync API
        const response = await fetch("/api/lipsync", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Lip sync generation failed");
        }

        const result = await response.json();
        return result.videoData; // Base64 video data URL
    } catch (error) {
        console.error("Lip sync error:", error);
        throw error;
    }
}

/**
 * Check if lip sync service is available
 */
export async function checkLipSyncAvailability(): Promise<boolean> {
    try {
        const response = await fetch("/api/lipsync");
        const data = await response.json();
        return data.status === "available";
    } catch {
        return false;
    }
}

/**
 * Get default avatar image URL for character
 * In production, these should be actual hosted images
 */
export function getDefaultAvatarImage(characterId: string): string | null {
    // For now, return null - users should provide their own avatar images
    // or we can integrate with an avatar generation service

    // Example: AI-generated avatar URLs could be stored here
    const avatarMap: Record<string, string> = {
        // "akane": "https://example.com/avatars/akane.jpg",
        // "sakura": "https://example.com/avatars/sakura.jpg",
    };

    return avatarMap[characterId] || null;
}

/**
 * Upload base64 video to Supabase storage
 */
export async function uploadLipSyncVideo(
    base64Data: string,
    fileName: string
): Promise<string> {
    // Extract base64 content
    const base64Content = base64Data.split(",")[1];
    const buffer = Buffer.from(base64Content, "base64");
    const blob = new Blob([buffer], { type: "video/mp4" });

    // Upload to Supabase
    const formData = new FormData();
    formData.append("file", blob, fileName);

    const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload lip sync video");
    }

    const result = await response.json();
    return result.url;
}
