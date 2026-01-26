import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Get all avatars for the authenticated user
 * GET /api/avatars
 */
export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: avatars, error } = await supabase
            .from("avatars")
            .select("*")
            .eq("user_id", user.id)
            .order("is_favorite", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Database error:", error);
            return NextResponse.json(
                { error: "Failed to fetch avatars" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            avatars: avatars || [],
        });
    } catch (error) {
        console.error("Get avatars error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Delete an avatar
 * DELETE /api/avatars?id={avatarId}
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const avatarId = searchParams.get("id");

        if (!avatarId) {
            return NextResponse.json(
                { error: "Avatar ID is required" },
                { status: 400 }
            );
        }

        // Get avatar details
        const { data: avatar, error: fetchError } = await supabase
            .from("avatars")
            .select("*")
            .eq("id", avatarId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !avatar) {
            return NextResponse.json(
                { error: "Avatar not found" },
                { status: 404 }
            );
        }

        // Delete from storage
        try {
            const path = avatar.image_url.split("/avatars/")[1];
            if (path) {
                await supabase.storage.from("avatars").remove([path]);
            }

            // Also delete original if exists
            if (avatar.original_url) {
                const originalPath = avatar.original_url.split("/avatars/")[1];
                if (originalPath) {
                    await supabase.storage.from("avatars").remove([originalPath]);
                }
            }
        } catch (err) {
            console.warn("Failed to delete avatar images from storage:", err);
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from("avatars")
            .delete()
            .eq("id", avatarId)
            .eq("user_id", user.id);

        if (deleteError) {
            console.error("Delete error:", deleteError);
            return NextResponse.json(
                { error: "Failed to delete avatar" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Avatar deleted successfully",
        });
    } catch (error) {
        console.error("Delete avatar error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Update avatar (e.g., toggle favorite)
 * PATCH /api/avatars
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { avatarId, is_favorite } = await request.json();

        if (!avatarId) {
            return NextResponse.json(
                { error: "Avatar ID is required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("avatars")
            .update({ is_favorite })
            .eq("id", avatarId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Update error:", error);
            return NextResponse.json(
                { error: "Failed to update avatar" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Avatar updated successfully",
        });
    } catch (error) {
        console.error("Update avatar error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
