import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
export interface SavedScene {
    duration: number;
    avatar_script?: string;
    voice_text?: string;
    voice_style?: string;
    speaker?: string;
    voice_id?: string;
    subtitle: string;
    image_prompt: string;
    image_effect?: string;
    text_animation?: string;
    main_text?: { type: string; lines: string[] };
    images?: any[];
    imageUrl?: string;
    audioUrl?: string;
    lipSyncVideoUrl?: string;
    sound_effects?: any[];
    emotion?: string;
    transition?: string;
    emphasis_words?: string[];
    assets?: any[];  // SceneAsset[] - 図形・アイコン・テキスト・Lottie・SVG
}

export interface ProjectSettings {
    ttsProvider: "google" | "elevenlabs" | "gemini";
    selectedVoiceId: string;
    imageModel: "flash" | "pro";
    aspectRatio: "16:9" | "9:16";
    generationMode: "auto" | "step";
    enableAvatar: boolean;
    avatarPosition: string;
    selectedAvatarId: string | null;
}

export interface Project {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    theme_text?: string;
    url_input?: string;
    aspect_ratio: "16:9" | "9:16";
    status: "draft" | "generating" | "completed" | "failed";
    generation_step: "idle" | "script" | "images" | "audio" | "preview" | "completed";
    current_scene_index: number;
    scenes?: SavedScene[];
    settings?: ProjectSettings;
    is_current: boolean;
    created_at: string;
    updated_at: string;
}

// GET - Get current project, specific project by ID, or list projects
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const projectId = searchParams.get("projectId");
        const current = searchParams.get("current") === "true";
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Get specific project by ID (with full scenes data)
        if (projectId) {
            const { data, error } = await supabaseAdmin
                .from("vg_projects")
                .select("*")
                .eq("id", projectId)
                .eq("user_id", userId)
                .single();

            if (error) {
                console.error("[API/VG-Projects] Error fetching project by ID:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ project: data });
        }

        if (current) {
            // Get current project
            const { data, error } = await supabaseAdmin
                .from("vg_projects")
                .select("*")
                .eq("user_id", userId)
                .eq("is_current", true)
                .maybeSingle();

            if (error) {
                console.error("[API/VG-Projects] Error fetching current project:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ project: data });
        } else {
            // List projects (軽量版 - scenesを除外してタイムアウト防止)
            const { data, error } = await supabaseAdmin
                .from("vg_projects")
                .select("id, user_id, title, theme_text, url_input, aspect_ratio, status, generation_step, current_scene_index, settings, is_current, created_at, updated_at")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false })
                .limit(limit);

            if (error) {
                console.error("[API/VG-Projects] Error fetching projects:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ projects: data || [] });
        }
    } catch (error: any) {
        console.error("[API/VG-Projects] GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new project
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, title, theme_text, url_input, settings } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // First, unset any existing current projects
        await supabaseAdmin
            .from("vg_projects")
            .update({ is_current: false })
            .eq("user_id", userId)
            .eq("is_current", true);

        // Create new project
        const { data: project, error } = await supabaseAdmin
            .from("vg_projects")
            .insert({
                user_id: userId,
                title: title || "新規プロジェクト",
                theme_text,
                url_input,
                settings,
                is_current: true,
                status: "draft",
                generation_step: "idle",
                current_scene_index: 0,
            })
            .select()
            .single();

        if (error) {
            console.error("[API/VG-Projects] Error creating project:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("[API/VG-Projects] Created new project:", project.id);
        return NextResponse.json({ project });
    } catch (error: any) {
        console.error("[API/VG-Projects] POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update project
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, userId, updates } = body;

        if (!projectId) {
            return NextResponse.json({ error: "projectId is required" }, { status: 400 });
        }

        // Validate user owns this project
        if (userId) {
            const { data: existing } = await supabaseAdmin
                .from("vg_projects")
                .select("user_id")
                .eq("id", projectId)
                .single();

            if (!existing || existing.user_id !== userId) {
                return NextResponse.json({ error: "Not authorized" }, { status: 403 });
            }
        }

        const { error } = await supabaseAdmin
            .from("vg_projects")
            .update(updates)
            .eq("id", projectId);

        if (error) {
            console.error("[API/VG-Projects] Error updating project:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("[API/VG-Projects] Updated:", projectId, Object.keys(updates));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API/VG-Projects] PUT error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete project
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");
        const userId = searchParams.get("userId");

        if (!projectId || !userId) {
            return NextResponse.json({ error: "projectId and userId are required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("vg_projects")
            .delete()
            .eq("id", projectId)
            .eq("user_id", userId);

        if (error) {
            console.error("[API/VG-Projects] Error deleting project:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API/VG-Projects] DELETE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Set project as current
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, userId } = body;

        if (!projectId || !userId) {
            return NextResponse.json({ error: "projectId and userId are required" }, { status: 400 });
        }

        // First, unset all current projects for this user
        await supabaseAdmin
            .from("vg_projects")
            .update({ is_current: false })
            .eq("user_id", userId);

        // Then set the new current project
        const { error } = await supabaseAdmin
            .from("vg_projects")
            .update({ is_current: true })
            .eq("id", projectId)
            .eq("user_id", userId);

        if (error) {
            console.error("[API/VG-Projects] Error setting current project:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API/VG-Projects] PATCH error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
