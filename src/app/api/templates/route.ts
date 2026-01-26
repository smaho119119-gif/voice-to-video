import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a new template
 * POST /api/templates
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, scriptTemplate, category, isPublic } = await request.json();

        if (!name || !scriptTemplate) {
            return NextResponse.json(
                { error: "Name and script template are required" },
                { status: 400 }
            );
        }

        const { data: template, error } = await supabase
            .from("templates")
            .insert([
                {
                    user_id: user.id,
                    name,
                    description,
                    script_template: scriptTemplate,
                    category,
                    is_public: isPublic || false,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Template creation error:", error);
            return NextResponse.json(
                { error: "Failed to create template" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            template,
        });
    } catch (error) {
        console.error("Template creation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Get all templates (user's own + public)
 * GET /api/templates
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

        // Get user's templates and public templates
        const { data: templates, error } = await supabase
            .from("templates")
            .select("*")
            .or(`user_id.eq.${user.id},is_public.eq.true`)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Templates fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch templates" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            templates: templates || [],
        });
    } catch (error) {
        console.error("Templates fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
