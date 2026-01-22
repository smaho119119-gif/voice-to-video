import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Session timeout in minutes (users inactive for this long are not counted)
const SESSION_TIMEOUT_MINUTES = 5;

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        // Get client IP
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

        const now = new Date();

        // Upsert active session
        const { error: upsertError } = await supabaseAdmin
            .from("active_sessions")
            .upsert(
                {
                    ip_address: ip,
                    user_id: userId || null,
                    last_activity: now.toISOString(),
                    page_views: 1,
                },
                {
                    onConflict: "ip_address",
                }
            );

        if (upsertError) {
            console.error("Failed to upsert session:", upsertError);
        }

        // Update page views for existing session
        await supabaseAdmin
            .from("active_sessions")
            .update({
                last_activity: now.toISOString(),
                user_id: userId || null,
            })
            .eq("ip_address", ip);

        // Count active users (within timeout period)
        const timeoutThreshold = new Date(now.getTime() - SESSION_TIMEOUT_MINUTES * 60 * 1000);

        const { count, error: countError } = await supabaseAdmin
            .from("active_sessions")
            .select("*", { count: "exact", head: true })
            .gte("last_activity", timeoutThreshold.toISOString());

        if (countError) {
            console.error("Failed to count active users:", countError);
        }

        // Clean up old sessions (older than 1 hour)
        const cleanupThreshold = new Date(now.getTime() - 60 * 60 * 1000);
        await supabaseAdmin
            .from("active_sessions")
            .delete()
            .lt("last_activity", cleanupThreshold.toISOString());

        // Update user usage stats if logged in
        if (userId) {
            const today = now.toISOString().split("T")[0];

            // Try to update existing record
            const { data: existing } = await supabaseAdmin
                .from("user_usage_stats")
                .select("id, total_duration_seconds")
                .eq("user_id", userId)
                .eq("date", today)
                .single();

            if (existing) {
                // Add 30 seconds per heartbeat
                await supabaseAdmin
                    .from("user_usage_stats")
                    .update({
                        total_duration_seconds: existing.total_duration_seconds + 30,
                    })
                    .eq("id", existing.id);
            } else {
                // Create new record
                await supabaseAdmin
                    .from("user_usage_stats")
                    .insert({
                        user_id: userId,
                        date: today,
                        total_duration_seconds: 30,
                        session_count: 1,
                    });
            }
        }

        return NextResponse.json({
            success: true,
            activeUsers: count || 0,
        });
    } catch (error: any) {
        console.error("Active users tracking error:", error);
        return NextResponse.json(
            { error: "Failed to track active users", activeUsers: 0 },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const now = new Date();
        const timeoutThreshold = new Date(now.getTime() - SESSION_TIMEOUT_MINUTES * 60 * 1000);

        const { count, error } = await supabaseAdmin
            .from("active_sessions")
            .select("*", { count: "exact", head: true })
            .gte("last_activity", timeoutThreshold.toISOString());

        if (error) {
            console.error("Failed to count active users:", error);
            return NextResponse.json({ activeUsers: 0 });
        }

        return NextResponse.json({
            activeUsers: count || 0,
        });
    } catch (error: any) {
        console.error("Active users fetch error:", error);
        return NextResponse.json({ activeUsers: 0 });
    }
}
