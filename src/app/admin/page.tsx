"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { formatCostJPY, formatCostUSD, COST_RATES } from "@/lib/cost-tracker";
import { Button } from "@/components/ui/button";
import {
    Loader2, ArrowLeft, Users, Video, DollarSign,
    TrendingUp, BarChart3, RefreshCw, FileEdit, ExternalLink
} from "lucide-react";
import Link from "next/link";

interface UserStats {
    id: string;
    email: string;
    username: string;
    videoCount: number;
    totalCost: number;
    lastActive: string;
}

interface SystemStats {
    totalUsers: number;
    totalVideos: number;
    totalCost: number;
    todayCost: number;
    thisMonthCost: number;
    costByService: Record<string, number>;
}

export default function AdminPage() {
    const router = useRouter();
    const { user, loading: authLoading, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserStats[]>([]);
    const [stats, setStats] = useState<SystemStats>({
        totalUsers: 0,
        totalVideos: 0,
        totalCost: 0,
        todayCost: 0,
        thisMonthCost: 0,
        costByService: {},
    });

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, authLoading, isAdmin, router]);

    useEffect(() => {
        if (user && isAdmin) {
            loadData();
        }
    }, [user, isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all users with their stats
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username");

            // Load videos count per user
            const { data: videos } = await supabase
                .from("videos")
                .select("user_id, created_at");

            // Load costs
            const { data: costs } = await supabase
                .from("ai_costs")
                .select("user_id, service, cost_usd, created_at");

            // Process data
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const userMap: Record<string, UserStats> = {};
            let totalCost = 0;
            let todayCost = 0;
            let thisMonthCost = 0;
            const costByService: Record<string, number> = {};

            // Process profiles
            profiles?.forEach(p => {
                userMap[p.id] = {
                    id: p.id,
                    email: "",
                    username: p.username || "Unknown",
                    videoCount: 0,
                    totalCost: 0,
                    lastActive: "",
                };
            });

            // Process videos
            videos?.forEach(v => {
                if (userMap[v.user_id]) {
                    userMap[v.user_id].videoCount++;
                    if (!userMap[v.user_id].lastActive || v.created_at > userMap[v.user_id].lastActive) {
                        userMap[v.user_id].lastActive = v.created_at;
                    }
                }
            });

            // Process costs
            costs?.forEach(c => {
                const cost = Number(c.cost_usd) || 0;
                totalCost += cost;
                costByService[c.service] = (costByService[c.service] || 0) + cost;

                const createdAt = new Date(c.created_at);
                if (createdAt >= startOfToday) {
                    todayCost += cost;
                }
                if (createdAt >= startOfMonth) {
                    thisMonthCost += cost;
                }

                if (userMap[c.user_id]) {
                    userMap[c.user_id].totalCost += cost;
                }
            });

            setUsers(Object.values(userMap).sort((a, b) => b.totalCost - a.totalCost));
            setStats({
                totalUsers: profiles?.length || 0,
                totalVideos: videos?.length || 0,
                totalCost,
                todayCost,
                thisMonthCost,
                costByService,
            });
        } catch (error) {
            console.error("Failed to load admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (!user || !isAdmin) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-slate-300">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="font-bold text-white">管理画面</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadData} className="text-slate-300">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto p-4 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Users className="w-4 h-4" />
                            <span className="text-xs">ユーザー数</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Video className="w-4 h-4" />
                            <span className="text-xs">総動画数</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.totalVideos}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs">今日のコスト</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">{formatCostJPY(stats.todayCost)}</p>
                        <p className="text-xs text-slate-500">{formatCostUSD(stats.todayCost)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">今月のコスト</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">{formatCostJPY(stats.thisMonthCost)}</p>
                        <p className="text-xs text-slate-500">{formatCostUSD(stats.thisMonthCost)}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/admin/page-editor">
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30 hover:border-purple-400/50 transition-colors cursor-pointer group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                                        <FileEdit className="w-5 h-5 text-purple-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">LP編集</h3>
                                        <p className="text-xs text-slate-400">ランディングページのコンテンツを編集</p>
                                    </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </Link>
                    <Link href="/" target="_blank">
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-500/30 hover:border-blue-400/50 transition-colors cursor-pointer group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
                                        <ExternalLink className="w-5 h-5 text-blue-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">LP確認</h3>
                                        <p className="text-xs text-slate-400">公開中のLPを新しいタブで確認</p>
                                    </div>
                                </div>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        <h2 className="font-bold text-white">サービス別コスト</h2>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(stats.costByService).map(([service, cost]) => (
                            <div key={service} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-300">
                                        {COST_RATES[service as keyof typeof COST_RATES]?.name || service}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-medium text-green-400">{formatCostJPY(cost)}</span>
                                    <span className="text-xs text-slate-500 ml-2">({formatCostUSD(cost)})</span>
                                </div>
                            </div>
                        ))}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                            <span className="font-medium text-white">合計</span>
                            <div className="text-right">
                                <span className="font-bold text-green-400">{formatCostJPY(stats.totalCost)}</span>
                                <span className="text-xs text-slate-500 ml-2">({formatCostUSD(stats.totalCost)})</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="font-bold text-white">ユーザー一覧</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">ユーザー</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">動画数</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">コスト</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">最終アクティブ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-white">{u.username}</p>
                                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{u.id}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-white">{u.videoCount}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-green-400">{formatCostJPY(u.totalCost)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs text-slate-400">
                                                {u.lastActive
                                                    ? new Date(u.lastActive).toLocaleDateString("ja-JP")
                                                    : "-"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cost Rate Reference */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h2 className="font-bold text-white mb-4">料金レート参考</h2>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-400 mb-1">Gemini (台本生成)</p>
                            <p className="text-slate-300">入力: $0.075/1M tokens, 出力: $0.30/1M tokens</p>
                        </div>
                        <div>
                            <p className="text-slate-400 mb-1">Gemini (画像生成)</p>
                            <p className="text-slate-300">約$0.02/画像</p>
                        </div>
                        <div>
                            <p className="text-slate-400 mb-1">Google TTS</p>
                            <p className="text-slate-300">$4.00/100万文字 (Neural2)</p>
                        </div>
                        <div>
                            <p className="text-slate-400 mb-1">ElevenLabs TTS</p>
                            <p className="text-slate-300">$0.30/1000文字</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
