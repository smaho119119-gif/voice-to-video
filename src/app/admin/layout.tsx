"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

// Create Supabase client for auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin email whitelist
const ADMIN_EMAILS = ["info@usmc.jp"];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = async () => {
            // Skip auth check for login page
            if (pathname === "/admin/login") {
                setIsAuthorized(true);
                setIsLoading(false);
                return;
            }

            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push("/admin/login");
                    return;
                }

                // Check if user is in admin whitelist
                if (!ADMIN_EMAILS.includes(user.email || "")) {
                    console.warn("Unauthorized admin access attempt:", user.email);
                    router.push("/admin/login");
                    return;
                }

                setIsAuthorized(true);
            } catch (error) {
                console.error("Auth check error:", error);
                router.push("/admin/login");
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_OUT") {
                    router.push("/admin/login");
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [pathname, router, supabase]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
            </div>
        );
    }

    if (!isAuthorized && pathname !== "/admin/login") {
        return null;
    }

    return <>{children}</>;
}
