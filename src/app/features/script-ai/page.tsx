"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FileText, ArrowLeft, Check, Sparkles, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScriptAIPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>戻る</span>
                    </Link>
                    <Link href="/login">
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                            無料で始める
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-purple-500/30">
                            <FileText className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                台本AI
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Gemini / GPT-4が視聴者を引きつける構成の台本を自動生成。
                            フック→本題→まとめの流れで離脱を防ぎます。
                        </p>
                    </motion.div>

                    {/* Feature Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-16 bg-gradient-to-br from-blue-900/20 to-purple-900/20"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                                <FileText className="w-24 h-24 text-blue-400/50 mx-auto mb-4" />
                                <p className="text-slate-500">台本生成のイメージ画像</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">主な機能</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Sparkles,
                                title: "テーマから自動生成",
                                description: "「ダイエット豆知識」「投資入門」など、テーマを入力するだけでショート動画に最適な台本を自動作成。"
                            },
                            {
                                icon: MessageSquare,
                                title: "視聴者を逃さない構成",
                                description: "冒頭のフック、本題の展開、まとめのCTAまで、視聴維持率を高める構成を自動設計。"
                            },
                            {
                                icon: Zap,
                                title: "URLから要約生成",
                                description: "ブログ記事やニュースのURLを貼り付けるだけで、内容を要約した台本を自動生成。"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10"
                            >
                                <feature.icon className="w-10 h-10 text-blue-400 mb-4" />
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">使い方</h2>
                    <div className="space-y-6">
                        {[
                            { step: 1, title: "テーマを入力", description: "作りたい動画のテーマやキーワードを入力します。URLを貼り付けることも可能。" },
                            { step: 2, title: "AIが台本を生成", description: "Gemini/GPT-4が視聴者を引きつける構成で台本を自動作成します。" },
                            { step: 3, title: "編集・調整", description: "生成された台本を確認し、必要に応じて編集。そのまま画像・音声生成へ進めます。" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                                className="flex gap-6 items-start"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 font-bold">
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                                    <p className="text-slate-400">{item.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Supported Models */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-8">対応AIモデル</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {["Gemini 2.0 Flash", "Gemini 1.5 Pro", "GPT-4o", "GPT-4o mini", "Claude 3.5"].map((model, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.6 + i * 0.05 }}
                                className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm"
                            >
                                {model}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">今すぐ台本を生成</h2>
                    <p className="text-slate-400 mb-8">無料で始められます。クレジットカード不要。</p>
                    <Link href="/login">
                        <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-6">
                            無料で始める
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/10">
                <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
                    © 2024 Video AI Generator. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
