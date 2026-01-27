"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Image as ImageIcon, ArrowLeft, Palette, Layers, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageAIPage() {
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
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mb-6 shadow-lg shadow-pink-500/30">
                            <ImageIcon className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                画像生成AI
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            各シーンの内容に合わせた画像をDALL-E / Imagen等で自動生成。
                            アニメ風・写実風など画風も選べます。
                        </p>
                    </motion.div>

                    {/* Feature Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-16 bg-gradient-to-br from-purple-900/20 to-pink-900/20"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                                <ImageIcon className="w-24 h-24 text-purple-400/50 mx-auto mb-4" />
                                <p className="text-slate-500">画像生成のイメージ</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">主な機能</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Wand2,
                                title: "台本から自動生成",
                                description: "台本の各シーンに合わせて、最適な画像を自動で生成。手動でプロンプトを書く必要なし。"
                            },
                            {
                                icon: Palette,
                                title: "画風を自由に選択",
                                description: "アニメ風、写実風、イラスト風、3D風など、コンテンツに合わせた画風を選択可能。"
                            },
                            {
                                icon: Layers,
                                title: "一括生成",
                                description: "全シーンの画像をワンクリックで一括生成。生成後の個別差し替えも可能。"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10"
                            >
                                <feature.icon className="w-10 h-10 text-purple-400 mb-4" />
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Style Examples */}
            <section className="py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">選べる画風</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: "アニメ風", color: "from-pink-500/20 to-purple-500/20" },
                            { name: "写実風", color: "from-blue-500/20 to-cyan-500/20" },
                            { name: "イラスト風", color: "from-yellow-500/20 to-orange-500/20" },
                            { name: "3D風", color: "from-green-500/20 to-teal-500/20" },
                            { name: "水彩画風", color: "from-indigo-500/20 to-blue-500/20" },
                            { name: "ミニマル", color: "from-slate-500/20 to-gray-500/20" },
                            { name: "サイバーパンク", color: "from-fuchsia-500/20 to-violet-500/20" },
                            { name: "レトロ", color: "from-amber-500/20 to-red-500/20" }
                        ].map((style, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
                                className={`aspect-square rounded-xl bg-gradient-to-br ${style.color} border border-white/10 flex items-center justify-center`}
                            >
                                <span className="font-medium">{style.name}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Supported Models */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-pink-950/20 to-transparent">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-8">対応AIモデル</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {["DALL-E 3", "Imagen 3", "Flux Pro", "Stable Diffusion XL", "Midjourney API"].map((model, i) => (
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
                    <h2 className="text-3xl font-bold mb-4">今すぐ画像を生成</h2>
                    <p className="text-slate-400 mb-8">無料で始められます。クレジットカード不要。</p>
                    <Link href="/login">
                        <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-lg px-8 py-6">
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
