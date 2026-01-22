import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        // Demo User 1: testユーザー
        const testUser = {
            id: "00000000-0000-0000-0000-000000000001",
            username: "test_user",
            full_name: "testユーザー"
        };

        // Demo User 2: NSXユーザー
        const nsxUser = {
            id: "00000000-0000-0000-0000-000000000002",
            username: "nsx_user",
            full_name: "NSXユーザー"
        };

        const { error: error1 } = await supabase
            .from("profiles")
            .upsert(testUser, { onConflict: "id" });

        const { error: error2 } = await supabase
            .from("profiles")
            .upsert(nsxUser, { onConflict: "id" });

        if (error1 || error2) {
            throw new Error(error1?.message || error2?.message);
        }

        return NextResponse.json({
            message: "デモユーザー（testユーザー、NSXユーザー）の設定が完了しました！",
            users: [testUser, nsxUser]
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
