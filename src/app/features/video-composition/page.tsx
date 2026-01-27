"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Video, ArrowLeft, Play, Layers, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VideoCompositionPage() {
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
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-6 shadow-lg shadow-red-500/30">
                            <Video className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                                動画合成
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Remotionエンジンで画像・音声・字幕を合成。
                            Ken Burns効果やトランジションで動きのある動画に。
                        </p>
                    </motion.div>

                    {/* Feature Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-16 bg-gradient-to-br from-orange-900/20 to-red-900/20"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                                <Video className="w-24 h-24 text-orange-400/50 mx-auto mb-4" />
                                <p className="text-slate-500">動画合成のイメージ</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-orange-950/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">主な機能</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Play,
                                title: "Ken Burns効果",
                                description: "静止画にズーム・パンの動きを付けて、動画らしさを演出。視聴者を飽きさせません。"
                            },
                            {
                                icon: Layers,
                                title: "シーントランジション",
                                description: "フェード、スライド、ズームなど様々なトランジションでシーン切り替えをスムーズに。"
                            },
                            {
                                icon: Sparkles,
                                title: "自動字幕生成",
                                description: "台本から字幕を自動生成。タイミング調整もAIが最適化。"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10"
                            >
                                <feature.icon className="w-10 h-10 text-orange-400 mb-4" />
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Remotion Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Remotionとは</h2>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10"
                    >
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-4">React製の動画作成フレームワーク</h3>
                                <p className="text-slate-400 mb-4">
                                    RemotionはReactコンポーネントで動画を作成できるオープンソースのフレームワークです。
                                    コードベースで動画を生成するため、大量の動画を自動生成するのに最適です。
                                </p>
                                <ul className="space-y-2 text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                                        プログラマブルな動画生成
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                                        高品質なMP4出力
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-400" />
                                        リアルタイムプレビュー
                                    </li>
                                </ul>
                            </div>
                            <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border border-white/10">
                                <Video className="w-20 h-20 text-orange-400" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Output Formats */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-red-950/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">出力形式</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                format: "YouTube Shorts",
                                resolution: "1080 × 1920",
                                ratio: "9:16",
                                color: "from-red-500/20 to-red-600/20"
                            },
                            {
                                format: "TikTok",
                                resolution: "1080 × 1920",
                                ratio: "9:16",
                                color: "from-pink-500/20 to-purple-500/20"
                            },
                            {
                                format: "Instagram Reels",
                                resolution: "1080 × 1920",
                                ratio: "9:16",
                                color: "from-orange-500/20 to-pink-500/20"
                            }
                        ].map((output, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                                className={`p-6 rounded-2xl bg-gradient-to-br ${output.color} border border-white/10 text-center`}
                            >
                                <Download className="w-10 h-10 text-white mx-auto mb-4" />
                                <h3 className="text-xl font-bold mb-2">{output.format}</h3>
                                <p className="text-slate-400 text-sm">{output.resolution}</p>
                                <p className="text-slate-500 text-xs">{output.ratio}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">今すぐ動画を作成</h2>
                    <p className="text-slate-400 mb-8">無料で始められます。クレジットカード不要。</p>
                    <Link href="/login">
                        <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-lg px-8 py-6">
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
