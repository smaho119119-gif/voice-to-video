import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket names
const STORAGE_BUCKETS = {
    images: "video-images",
    audio: "video-audio",
};

// Generate unique file name
function generateFileName(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}/${timestamp}-${random}.${extension}`;
}

// Upload image to Supabase Storage
export async function uploadImageToStorage(
    base64Data: string,
    userId: string
): Promise<string | null> {
    try {
        // Remove data URL prefix if present
        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Clean, "base64");

        const fileName = generateFileName(`user-${userId}`, "png");

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKETS.images)
            .upload(fileName, buffer, {
                contentType: "image/png",
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            console.error("Image upload error:", error);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKETS.images)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        return null;
    }
}

// Upload audio to Supabase Storage
export async function uploadAudioToStorage(
    base64Data: string,
    userId: string,
    format: string = "mp3"
): Promise<string | null> {
    try {
        // Remove data URL prefix if present
        const base64Clean = base64Data.replace(/^data:audio\/[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Clean, "base64");

        const fileName = generateFileName(`user-${userId}`, format);
        const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKETS.audio)
            .upload(fileName, buffer, {
                contentType,
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            console.error("Audio upload error:", error);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKETS.audio)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    } catch (error) {
        console.error("Error uploading audio:", error);
        return null;
    }
}

// Delete file from storage
export async function deleteFromStorage(
    bucket: "images" | "audio",
    filePath: string
): Promise<boolean> {
    try {
        const bucketName = STORAGE_BUCKETS[bucket];
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);

        if (error) {
            console.error("Delete error:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting file:", error);
        return false;
    }
}

// URL History (stored in Supabase instead of localStorage)
export interface URLHistoryItem {
    id: string;
    user_id: string;
    url: string;
    created_at: string;
}

export async function saveUrlToHistory(userId: string, url: string): Promise<void> {
    try {
        // Check if URL already exists for this user
        const { data: existing } = await supabase
            .from("url_history")
            .select("id")
            .eq("user_id", userId)
            .eq("url", url)
            .single();

        if (existing) {
            // Update timestamp to move to top
            await supabase
                .from("url_history")
                .update({ created_at: new Date().toISOString() })
                .eq("id", existing.id);
        } else {
            // Insert new URL
            await supabase
                .from("url_history")
                .insert({ user_id: userId, url });

            // Keep only latest 10 URLs per user
            const { data: allUrls } = await supabase
                .from("url_history")
                .select("id")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (allUrls && allUrls.length > 10) {
                const idsToDelete = allUrls.slice(10).map(u => u.id);
                await supabase
                    .from("url_history")
                    .delete()
                    .in("id", idsToDelete);
            }
        }
    } catch (error) {
        console.error("Error saving URL to history:", error);
    }
}

export async function getUrlHistory(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from("url_history")
            .select("url")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) {
            console.error("Error fetching URL history:", error);
            return [];
        }

        return data?.map(item => item.url) || [];
    } catch (error) {
        console.error("Error in getUrlHistory:", error);
        return [];
    }
}

export async function deleteUrlFromHistory(userId: string, url: string): Promise<void> {
    try {
        await supabase
            .from("url_history")
            .delete()
            .eq("user_id", userId)
            .eq("url", url);
    } catch (error) {
        console.error("Error deleting URL from history:", error);
    }
}

// Types for database
export interface DBVideo {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    status: "pending" | "generating" | "completed" | "failed";
    input_mode: "voice" | "theme" | "url";
    theme_text?: string;
    source_url?: string;
    transcribed_text?: string;
    heygen_video_id?: string;
    final_video_url?: string;
    tags?: string[];
    bgm_url?: string;
    bgm_volume?: number;
    created_at: string;
}

export interface DBScene {
    id: string;
    video_id: string;
    scene_index: number;
    avatar_script?: string;
    subtitle?: string;
    image_prompt?: string;
    image_url?: string;
    audio_url?: string;
    heygen_video_url?: string;
    duration: number;
    emotion?: string;
    sound_effects?: Array<{
        type: string;
        keyword: string;
        timing: string;
        volume: number;
        url?: string;
    }>;
    created_at: string;
}

// Save video with scenes to Supabase
export async function saveVideoToSupabase(
    userId: string,
    videoData: {
        title: string;
        description?: string;
        inputMode: "voice" | "theme" | "url";
        themeText?: string;
        sourceUrl?: string;
        transcribedText?: string;
        tags?: string[];
        bgmUrl?: string;
        bgmVolume?: number;
    },
    scenes: Array<{
        sceneIndex: number;
        avatarScript?: string;
        subtitle?: string;
        imagePrompt?: string;
        imageUrl?: string;
        audioUrl?: string;
        duration: number;
        emotion?: string;
        soundEffects?: Array<{
            type: string;
            keyword: string;
            timing: string;
            volume: number;
            url?: string;
        }>;
    }>
): Promise<{ videoId: string } | null> {
    try {
        // Insert video
        const { data: video, error: videoError } = await supabase
            .from("videos")
            .insert({
                user_id: userId,
                title: videoData.title,
                description: videoData.description,
                status: "completed",
                input_mode: videoData.inputMode,
                theme_text: videoData.themeText,
                source_url: videoData.sourceUrl,
                transcribed_text: videoData.transcribedText,
                tags: videoData.tags || [],
                bgm_url: videoData.bgmUrl,
                bgm_volume: videoData.bgmVolume,
            })
            .select("id")
            .single();

        if (videoError) {
            console.error("Error saving video:", videoError);
            return null;
        }

        // Insert scenes
        const scenesToInsert = scenes.map((scene) => ({
            video_id: video.id,
            scene_index: scene.sceneIndex,
            avatar_script: scene.avatarScript,
            subtitle: scene.subtitle,
            image_prompt: scene.imagePrompt,
            image_url: scene.imageUrl,
            audio_url: scene.audioUrl,
            duration: scene.duration,
            emotion: scene.emotion || "neutral",
            sound_effects: scene.soundEffects || [],
        }));

        const { error: scenesError } = await supabase
            .from("scenes")
            .insert(scenesToInsert);

        if (scenesError) {
            console.error("Error saving scenes:", scenesError);
            // Rollback video
            await supabase.from("videos").delete().eq("id", video.id);
            return null;
        }

        return { videoId: video.id };
    } catch (error) {
        console.error("Error in saveVideoToSupabase:", error);
        return null;
    }
}

// Load video with scenes from Supabase
export async function loadVideoFromSupabase(videoId: string): Promise<{
    video: DBVideo;
    scenes: DBScene[];
} | null> {
    try {
        const { data: video, error: videoError } = await supabase
            .from("videos")
            .select("*")
            .eq("id", videoId)
            .single();

        if (videoError || !video) {
            console.error("Error loading video:", videoError);
            return null;
        }

        const { data: scenes, error: scenesError } = await supabase
            .from("scenes")
            .select("*")
            .eq("video_id", videoId)
            .order("scene_index", { ascending: true });

        if (scenesError) {
            console.error("Error loading scenes:", scenesError);
            return null;
        }

        return { video, scenes: scenes || [] };
    } catch (error) {
        console.error("Error in loadVideoFromSupabase:", error);
        return null;
    }
}

// Get user's video history
export async function getUserVideos(userId: string, limit = 20): Promise<DBVideo[]> {
    try {
        const { data, error } = await supabase
            .from("videos")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching videos:", error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("Error in getUserVideos:", error);
        return [];
    }
}

// Delete video and its scenes
export async function deleteVideo(videoId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from("videos")
            .delete()
            .eq("id", videoId);

        if (error) {
            console.error("Error deleting video:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error in deleteVideo:", error);
        return false;
    }
}
