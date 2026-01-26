import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Demo test user ID (fallback when not authenticated)
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Create a new project
 * POST /api/projects
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use test user as fallback for demo
        const userId = user?.id || TEST_USER_ID;

        const { title, description, aspectRatio, script, sourceType, sourceText } = await request.json();

        if (!title || !script) {
            return NextResponse.json(
                { error: "Title and script are required" },
                { status: 400 }
            );
        }

        // Create project
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .insert([
                {
                    user_id: userId,
                    title,
                    description,
                    aspect_ratio: aspectRatio || "16:9",
                    status: "draft",
                },
            ])
            .select()
            .single();

        if (projectError) {
            console.error("Project creation error:", projectError);
            return NextResponse.json(
                { error: "Failed to create project" },
                { status: 500 }
            );
        }

        // Save script
        const { data: savedScript, error: scriptError } = await supabase
            .from("scripts")
            .insert([
                {
                    project_id: project.id,
                    user_id: userId,
                    content: script,
                    source_type: sourceType || "manual",
                    source_text: sourceText,
                    version: 1,
                },
            ])
            .select()
            .single();

        if (scriptError) {
            console.error("Script save error:", scriptError);
            return NextResponse.json(
                { error: "Failed to save script" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            project,
            script: savedScript,
        });
    } catch (error) {
        console.error("Project creation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Get all projects for the current user
 * GET /api/projects
 */
export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Use test user as fallback for demo
        const userId = user?.id || TEST_USER_ID;

        // Get projects with latest script
        const { data: projects, error } = await supabase
            .from("projects")
            .select(`
                *,
                scripts!scripts_project_id_fkey (
                    id,
                    content,
                    source_type,
                    version,
                    created_at
                )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Projects fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch projects" },
                { status: 500 }
            );
        }

        // Return projects with latest script only
        const projectsWithLatestScript = projects?.map(project => ({
            ...project,
            latestScript: project.scripts?.[0] || null,
            scripts: undefined, // Remove scripts array
        }));

        return NextResponse.json({
            success: true,
            projects: projectsWithLatestScript || [],
        });
    } catch (error) {
        console.error("Projects fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
