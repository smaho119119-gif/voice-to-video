import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Get all page content or filter by section
 * GET /api/page-content?section=hero
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);
        const section = searchParams.get("section");

        let query = supabase.from("vg_page_content").select("*");

        if (section) {
            query = query.eq("section_key", section);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Page content fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch page content" },
                { status: 500 }
            );
        }

        // If fetching single section, return just the content
        if (section && data && data.length > 0) {
            return NextResponse.json({
                success: true,
                content: data[0].content,
                section_key: data[0].section_key,
                updated_at: data[0].updated_at
            });
        }

        // Return all sections as a map
        const contentMap: Record<string, unknown> = {};
        data?.forEach(item => {
            contentMap[item.section_key] = item.content;
        });

        return NextResponse.json({
            success: true,
            content: contentMap
        });
    } catch (error) {
        console.error("Page content fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Update page content for a section
 * PUT /api/page-content
 * Body: { section_key: string, content: object }
 */
export async function PUT(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { section_key, content } = await request.json();

        if (!section_key || !content) {
            return NextResponse.json(
                { error: "section_key and content are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("vg_page_content")
            .upsert({
                section_key,
                content,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "section_key"
            })
            .select()
            .single();

        if (error) {
            console.error("Page content update error:", error);
            return NextResponse.json(
                { error: "Failed to update page content" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            content: data.content,
            section_key: data.section_key,
            updated_at: data.updated_at
        });
    } catch (error) {
        console.error("Page content update error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
