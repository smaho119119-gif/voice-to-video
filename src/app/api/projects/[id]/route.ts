import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Demo test user ID (fallback when not authenticated)
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get a specific project with all scripts
 * GET /api/projects/[id]
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use test user as fallback for demo
        const userId = user?.id || TEST_USER_ID;

        const { id } = await params;

        // Get project with all scripts
        const { data: project, error } = await supabase
            .from("projects")
            .select(`
                *,
                scripts (
                    id,
                    content,
                    source_type,
                    source_text,
                    version,
                    created_at
                ),
                videos (
                    id,
                    video_url,
                    thumbnail_url,
                    duration,
                    resolution,
                    created_at
                )
            `)
            .eq("id", id)
            .eq("user_id", userId)
            .single();

        if (error) {
            console.error("Project fetch error:", error);
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            project,
        });
    } catch (error) {
        console.error("Project fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Update a project
 * PATCH /api/projects/[id]
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use test user as fallback for demo
        const userId = user?.id || TEST_USER_ID;

        const { id } = await params;
        const updates = await request.json();

        // Update project
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (projectError) {
            console.error("Project update error:", projectError);
            return NextResponse.json(
                { error: "Failed to update project" },
                { status: 500 }
            );
        }

        // If script is provided, create new version
        if (updates.script) {
            // Get current max version
            const { data: scripts } = await supabase
                .from("scripts")
                .select("version")
                .eq("project_id", id)
                .order("version", { ascending: false })
                .limit(1);

            const nextVersion = scripts && scripts.length > 0 ? scripts[0].version + 1 : 1;

            const { error: scriptError } = await supabase
                .from("scripts")
                .insert([
                    {
                        project_id: id,
                        user_id: userId,
                        content: updates.script,
                        source_type: updates.sourceType || "manual",
                        version: nextVersion,
                    },
                ]);

            if (scriptError) {
                console.error("Script save error:", scriptError);
            }
        }

        return NextResponse.json({
            success: true,
            project,
        });
    } catch (error) {
        console.error("Project update error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Delete a project
 * DELETE /api/projects/[id]
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use test user as fallback for demo
        const userId = user?.id || TEST_USER_ID;

        const { id } = await params;

        // Delete project (cascades to scripts, assets, videos)
        const { error } = await supabase
            .from("projects")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Project delete error:", error);
            return NextResponse.json(
                { error: "Failed to delete project" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("Project delete error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
