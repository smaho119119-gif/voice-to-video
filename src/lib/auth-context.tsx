"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// エラーメッセージを日本語に翻訳
function translateAuthError(message: string): string {
    const errorMap: Record<string, string> = {
        "Invalid login credentials": "メールアドレスまたはパスワードが正しくありません。",
        "User already registered": "このメールアドレスは既に登録されています。",
        "Email not confirmed": "メールアドレスの確認が完了していません。確認メールをご確認ください。",
        "Invalid email": "有効なメールアドレスを入力してください。",
        "Signup requires a valid password": "パスワードを入力してください。",
        "Password should be at least 6 characters": "パスワードは6文字以上で入力してください。",
        "Unable to validate email address: invalid format": "メールアドレスの形式が正しくありません。",
        "Email rate limit exceeded": "しばらく時間をおいてから再度お試しください。",
        "Network error": "ネットワークエラーが発生しました。接続を確認してください。",
    };

    for (const [key, value] of Object.entries(errorMap)) {
        if (message.includes(key)) {
            return value;
        }
    }
    return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkAdminStatus(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await checkAdminStatus(session.user.id);
                } else {
                    setIsAdmin(false);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const checkAdminStatus = async (userId: string) => {
        // Temporarily disabled until admin_users table migration is applied
        // TODO: Enable after running supabase/migrations/20260125_create_core_tables.sql
        setIsAdmin(false);
        return;

        /* try {
            const { data } = await supabase
                .from("admin_users")
                .select("role")
                .eq("id", userId)
                .single();
            setIsAdmin(!!data);
        } catch {
            setIsAdmin(false);
        } */
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            return { error: new Error(translateAuthError(error.message)) };
        }
        return { error: null };
    };

    const signUp = async (email: string, password: string, username?: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username || email.split("@")[0],
                },
            },
        });
        if (error) {
            return { error: new Error(translateAuthError(error.message)) };
        }
        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signIn,
                signUp,
                signOut,
                isAdmin,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
