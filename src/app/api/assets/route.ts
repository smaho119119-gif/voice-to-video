import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Save asset (image, audio, video)
 * POST /api/assets
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

        const { projectId, assetType, fileUrl, metadata } = await request.json();

        if (!assetType || !fileUrl) {
            return NextResponse.json(
                { error: "Asset type and file URL are required" },
                { status: 400 }
            );
        }

        // Save asset to database
        const { data: asset, error } = await supabase
            .from("assets")
            .insert([
                {
                    project_id: projectId || null,
                    user_id: user.id,
                    asset_type: assetType,
                    file_url: fileUrl,
                    metadata: metadata || {},
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Asset save error:", error);
            return NextResponse.json(
                { error: "Failed to save asset" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            asset,
        });
    } catch (error) {
        console.error("Asset save error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Get assets for a project
 * GET /api/assets?projectId=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("projectId");

        let query = supabase
            .from("assets")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (projectId) {
            query = query.eq("project_id", projectId);
        }

        const { data: assets, error } = await query;

        if (error) {
            console.error("Assets fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch assets" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            assets: assets || [],
        });
    } catch (error) {
        console.error("Assets fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
