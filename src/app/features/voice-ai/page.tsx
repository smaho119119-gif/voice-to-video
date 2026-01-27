"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mic, ArrowLeft, Volume2, Languages, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VoiceAIPage() {
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
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 mb-6 shadow-lg shadow-teal-500/30">
                            <Mic className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                                音声合成AI
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Google / ElevenLabs / Gemini TTSで自然な日本語ナレーション。
                            男女8種類以上の声から選択可能。
                        </p>
                    </motion.div>

                    {/* Feature Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 mb-16 bg-gradient-to-br from-green-900/20 to-teal-900/20"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                                <Mic className="w-24 h-24 text-green-400/50 mx-auto mb-4" />
                                <p className="text-slate-500">音声合成のイメージ</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-green-950/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">主な機能</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Volume2,
                                title: "自然な日本語音声",
                                description: "最新のTTSエンジンで、機械的でない自然な日本語ナレーションを生成。"
                            },
                            {
                                icon: Languages,
                                title: "多彩な声の選択",
                                description: "男性4種類、女性4種類以上の声から選択。コンテンツに合った声で読み上げ。"
                            },
                            {
                                icon: Settings,
                                title: "演技指導",
                                description: "「元気に」「落ち着いて」など、感情やトーンを自然言語で指定可能。"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10"
                            >
                                <feature.icon className="w-10 h-10 text-green-400 mb-4" />
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Voice Types */}
            <section className="py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">選べる声</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Female voices */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <h3 className="text-xl font-bold mb-4 text-pink-400">女性ボイス</h3>
                            <div className="space-y-3">
                                {[
                                    { name: "Zephyr", desc: "明るく元気な声" },
                                    { name: "Kore", desc: "落ち着いた知的な声" },
                                    { name: "Leda", desc: "柔らかく優しい声" },
                                    { name: "Aoede", desc: "クールでプロフェッショナルな声" }
                                ].map((voice, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                                            <Mic className="w-5 h-5 text-pink-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{voice.name}</div>
                                            <div className="text-sm text-slate-400">{voice.desc}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Male voices */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <h3 className="text-xl font-bold mb-4 text-blue-400">男性ボイス</h3>
                            <div className="space-y-3">
                                {[
                                    { name: "Puck", desc: "フレンドリーで親しみやすい声" },
                                    { name: "Charon", desc: "重厚で説得力のある声" },
                                    { name: "Fenrir", desc: "力強くエネルギッシュな声" },
                                    { name: "Orus", desc: "穏やかで信頼感のある声" }
                                ].map((voice, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Mic className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{voice.name}</div>
                                            <div className="text-sm text-slate-400">{voice.desc}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Supported Models */}
            <section className="py-20 px-4 bg-gradient-to-b from-transparent via-teal-950/20 to-transparent">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-8">対応TTSエンジン</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {["Gemini 2.5 Flash TTS", "Gemini 2.5 Pro TTS", "Google Cloud TTS", "ElevenLabs", "OpenAI TTS"].map((model, i) => (
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
                    <h2 className="text-3xl font-bold mb-4">今すぐナレーションを生成</h2>
                    <p className="text-slate-400 mb-8">無料で始められます。クレジットカード不要。</p>
                    <Link href="/login">
                        <Button size="lg" className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-lg px-8 py-6">
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
