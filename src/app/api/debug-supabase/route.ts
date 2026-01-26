import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Use service key if available, otherwise anon key
        const supabase = createClient(
            supabaseUrl,
            supabaseServiceKey || supabaseAnonKey
        );

        // Check if tables exist
        const tables = ["vg_projects", "vg_theme_history"];
        const results: Record<string, any> = {};

        for (const table of tables) {
            try {
                const { data, error, status } = await supabase
                    .from(table)
                    .select("id")
                    .limit(1);

                results[table] = {
                    exists: !error && status !== 406,
                    status,
                    error: error?.message || null,
                    errorCode: error?.code || null,
                };
            } catch (e: any) {
                results[table] = {
                    exists: false,
                    error: e.message,
                };
            }
        }

        // Check if service role key is set
        const hasServiceKey = !!supabaseServiceKey;

        return NextResponse.json({
            supabaseUrl,
            hasServiceKey,
            tables: results,
            message: hasServiceKey
                ? "Service role key found - can create tables"
                : "No service role key - use SQL Editor in Supabase dashboard",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST to create tables (requires service role key)
export async function POST(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return NextResponse.json({
                error: "SUPABASE_SERVICE_ROLE_KEY not set",
                action: "Please add SUPABASE_SERVICE_ROLE_KEY to .env.local or run SQL manually in Supabase dashboard",
            }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Create tables using raw SQL via RPC
        const sql = `
-- Drop existing (for clean slate)
DROP TABLE IF EXISTS vg_theme_history CASCADE;
DROP TABLE IF EXISTS vg_projects CASCADE;

-- Create vg_projects
CREATE TABLE vg_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '新規プロジェクト',
    theme_text TEXT,
    url_input TEXT,
    aspect_ratio TEXT DEFAULT '16:9',
    status TEXT DEFAULT 'draft',
    generation_step TEXT DEFAULT 'idle',
    current_scene_index INTEGER DEFAULT 0,
    scenes JSONB,
    settings JSONB,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vg_theme_history
CREATE TABLE vg_theme_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_text TEXT NOT NULL,
    input_mode TEXT DEFAULT 'theme',
    project_id UUID REFERENCES vg_projects(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vg_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vg_theme_history ENABLE ROW LEVEL SECURITY;

-- Policies for vg_projects
CREATE POLICY "vg_projects_select" ON vg_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vg_projects_insert" ON vg_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vg_projects_update" ON vg_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vg_projects_delete" ON vg_projects FOR DELETE USING (auth.uid() = user_id);

-- Policies for vg_theme_history
CREATE POLICY "vg_theme_history_select" ON vg_theme_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vg_theme_history_insert" ON vg_theme_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vg_theme_history_delete" ON vg_theme_history FOR DELETE USING (auth.uid() = user_id);
`;

        // Execute via rpc if available, otherwise return SQL
        return NextResponse.json({
            message: "Run this SQL in Supabase SQL Editor:",
            sql: sql.trim(),
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
