/**
 * Avatar Management System
 * Handles avatar creation, storage, and retrieval
 */

import { createClient } from "@supabase/supabase-js";

export interface Avatar {
    id: string;
    user_id: string;
    name: string;
    image_url: string; // Supabase Storage URL
    original_url?: string; // Original uploaded image URL
    type: "uploaded" | "ai_generated"; // How it was created
    ai_provider?: "nanobanapro" | "dalle" | "stable_diffusion"; // If AI-generated
    prompt?: string; // If AI-generated, the prompt used
    created_at: string;
    is_favorite: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatarImage(
    file: File,
    userId: string
): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload avatar: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

    return publicUrl;
}

/**
 * Save avatar metadata to database
 */
export async function saveAvatar(avatar: Omit<Avatar, "id" | "created_at">): Promise<Avatar> {
    const { data, error } = await supabase
        .from("avatars")
        .insert([avatar])
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save avatar: ${error.message}`);
    }

    return data;
}

/**
 * Get all avatars for a user
 */
export async function getUserAvatars(userId: string): Promise<Avatar[]> {
    const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .eq("user_id", userId)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch avatars: ${error.message}`);
    }

    return data || [];
}

/**
 * Delete avatar
 */
export async function deleteAvatar(avatarId: string, imageUrl: string): Promise<void> {
    // Delete from storage
    try {
        const path = imageUrl.split("/avatars/")[1];
        if (path) {
            await supabase.storage.from("avatars").remove([path]);
        }
    } catch (err) {
        console.warn("Failed to delete avatar image from storage:", err);
    }

    // Delete from database
    const { error } = await supabase
        .from("avatars")
        .delete()
        .eq("id", avatarId);

    if (error) {
        throw new Error(`Failed to delete avatar: ${error.message}`);
    }
}

/**
 * Toggle favorite status
 */
export async function toggleAvatarFavorite(
    avatarId: string,
    isFavorite: boolean
): Promise<void> {
    const { error } = await supabase
        .from("avatars")
        .update({ is_favorite: isFavorite })
        .eq("id", avatarId);

    if (error) {
        throw new Error(`Failed to update favorite status: ${error.message}`);
    }
}

/**
 * Convert uploaded photo to avatar using nanobanapro API
 */
export async function convertPhotoToAvatar(
    imageFile: File,
    userId: string,
    name: string
): Promise<Avatar> {
    // First, upload original image
    const originalUrl = await uploadAvatarImage(imageFile, userId);

    // Convert using nanobanapro API
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("userId", userId);
    formData.append("name", name);

    const response = await fetch("/api/avatars/convert", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Avatar conversion failed");
    }

    const result = await response.json();
    return result.avatar;
}

/**
 * Generate AI avatar from prompt
 */
export async function generateAIAvatar(
    prompt: string,
    userId: string,
    name: string,
    provider: "dalle" | "stable_diffusion" = "dalle"
): Promise<Avatar> {
    const response = await fetch("/api/avatars/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            userId,
            name,
            provider,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Avatar generation failed");
    }

    const result = await response.json();
    return result.avatar;
}

/**
 * Generate multiple AI avatar variations
 */
export async function generateAvatarVariations(
    basePrompt: string,
    userId: string,
    count: number = 4
): Promise<Avatar[]> {
    const response = await fetch("/api/avatars/generate-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            basePrompt,
            userId,
            count,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Avatar variations generation failed");
    }

    const result = await response.json();
    return result.avatars;
}
