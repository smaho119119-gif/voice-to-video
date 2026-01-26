"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
    Video, Sparkles, Mic, Image as ImageIcon, Wand2,
    Play, ChevronRight, Zap, Clock, Check,
    ArrowRight, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// Animated section wrapper
function AnimatedSection({ children, className = "", delay = 0 }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Feature card with hover animation
function FeatureCard({ icon: Icon, title, description, delay, image }: {
    icon: React.ElementType;
    title: string;
    description: string;
    delay: number;
    image?: string;
}) {
    return (
        <AnimatedSection delay={delay}>
            <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm h-full"
            >
                {image && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Image
                            src={image}
                            alt={title}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                    </div>
                )}
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                </div>
            </motion.div>
        </AnimatedSection>
    );
}

// Step card for workflow section
function StepCard({ number, title, description, delay, image }: {
    number: number;
    title: string;
    description: string;
    delay: number;
    image: string;
}) {
    return (
        <AnimatedSection delay={delay}>
            <div className="relative group">
                <div className="absolute -left-4 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm z-20 shadow-lg shadow-blue-500/30">
                    {number}
                </div>
                <div className="pl-6 pt-2">
                    <div className="relative aspect-square mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-900/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 z-10" />
                        <Image
                            src={image}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                </div>
            </div>
        </AnimatedSection>
    );
}

export default function LandingPage() {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    });
    const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20
            });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
                    style={{
                        transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
                    }}
                />
                <div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
                    style={{
                        transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`
                    }}
                />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Video className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl">Video AI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="text-slate-300 hover:text-white">
                                ログイン
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                                無料で始める
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <motion.section
                ref={heroRef}
                style={{ opacity: heroOpacity, y: heroY }}
                className="relative min-h-screen flex items-center justify-center pt-16"
            >
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-slate-300">AIが動画制作を革命的に変える</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                    >
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            テキストから動画を
                        </span>
                        <br />
                        <span className="text-white">自動生成</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto"
                    >
                        テーマを入力するだけで、AIが台本作成から画像生成、ナレーション、
                        動画編集まですべて自動で行います。YouTube Shorts、TikTokに最適。
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Link href="/login">
                            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-6">
                                無料で動画を作成
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="ghost" className="border border-white/30 bg-white/10 text-white hover:bg-white/20 text-lg px-8 py-6">
                            <Play className="w-5 h-5 mr-2" />
                            デモを見る
                        </Button>
                    </motion.div>

                    {/* Demo video preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="mt-16 relative perspective-1000"
                    >
                        <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-2xl shadow-purple-500/20 group">
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                            <Image
                                src="/images/hero_ui_mockup.png"
                                alt="Video AI Dashboard Interface"
                                width={1280}
                                height={720}
                                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                                priority
                            />
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-110 transition-all duration-300 border border-white/20 shadow-xl shadow-purple-500/30">
                                    <Play className="w-8 h-8 text-white ml-1 fill-white" />
                                </div>
                            </div>
                            <div className="absolute bottom-6 left-0 right-0 text-center z-20">
                                <p className="text-slate-300 font-medium tracking-wide">クリックしてデモを見る</p>
                            </div>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl -z-10" />
                    </motion.div>
                </div>
            </motion.section>

            {/* Features Section */}
            <section className="py-32 relative">
                <div className="max-w-6xl mx-auto px-4">
                    <AnimatedSection className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">すべてがAIで自動化</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            従来の動画制作に必要だった専門スキルや時間は不要。
                            AIがすべてのプロセスを最適化します。
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard
                            icon={FileText}
                            title="AI台本生成"
                            description="テーマを入力するだけで、構成の取れた魅力的な台本をAIが自動生成します。"
                            delay={0}
                            image="/images/feature_text_to_video.png"
                        />
                        <FeatureCard
                            icon={ImageIcon}
                            title="画像自動生成"
                            description="各シーンに最適な画像をAIが自動で生成。スタイルも選べます。"
                            delay={0.1}
                            image="/images/feature_image_generation.png"
                        />
                        <FeatureCard
                            icon={Mic}
                            title="AIナレーション"
                            description="自然な日本語音声でナレーションを自動生成。複数の声から選択可能。"
                            delay={0.2}
                            image="/images/feature_ai_narration.png"
                        />
                        <FeatureCard
                            icon={Video}
                            title="動画自動編集"
                            description="トランジション、字幕、BGMまで自動で追加。プロ品質の動画が完成。"
                            delay={0.3}
                        // Using the processing visual again or a generic one if needed
                        />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-32 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
                <div className="max-w-6xl mx-auto px-4">
                    <AnimatedSection className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">3ステップで完成</h2>
                        <p className="text-slate-400">驚くほど簡単。誰でもプロ品質の動画が作れます。</p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
                        <StepCard
                            number={1}
                            title="テーマを入力"
                            description="作りたい動画のテーマやキーワードを入力するだけ。URLからの自動抽出も可能。"
                            delay={0}
                            image="/images/step_input_ui.png"
                        />
                        <StepCard
                            number={2}
                            title="AIが自動生成"
                            description="台本、画像、ナレーション、編集をAIが自動で実行。リアルタイムでプレビュー確認。"
                            delay={0.1}
                            image="/images/step_processing_visual.png"
                        />
                        <StepCard
                            number={3}
                            title="ダウンロード"
                            description="完成した動画をダウンロード。YouTube Shorts、TikTok、Instagram Reelsに最適化。"
                            delay={0.2}
                            image="/images/step_result_mobile.png"
                        />
                    </div>

                    {/* Process visualization */}
                    <AnimatedSection delay={0.3} className="mt-16">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 p-8">
                            <div className="flex items-center justify-between max-w-3xl mx-auto">
                                {[
                                    { icon: FileText, label: "テーマ" },
                                    { icon: Wand2, label: "AI処理" },
                                    { icon: Video, label: "動画" }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3"
                                        >
                                            <item.icon className="w-8 h-8 text-white" />
                                        </motion.div>
                                        <span className="text-sm text-slate-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Animated connection lines */}
                            <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 -translate-y-1/2" />
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-32">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        {[
                            { value: "10秒", label: "平均生成時間", icon: Clock },
                            { value: "1080p", label: "高画質出力", icon: Zap },
                            { value: "8+", label: "AI音声種類", icon: Mic },
                            { value: "∞", label: "生成可能数", icon: Sparkles }
                        ].map((stat, i) => (
                            <AnimatedSection key={i} delay={i * 0.1}>
                                <div className="p-6">
                                    <stat.icon className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                        {stat.value}
                                    </div>
                                    <div className="text-slate-400">{stat.label}</div>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-32 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
                <div className="max-w-6xl mx-auto px-4">
                    <AnimatedSection className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">こんな方におすすめ</h2>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "YouTuber / TikToker",
                                description: "短尺動画を大量に投稿したい方。毎日の投稿も楽々。",
                                features: ["ショート動画に最適", "一括生成可能", "トレンドに素早く対応"]
                            },
                            {
                                title: "マーケター",
                                description: "商品紹介や広告動画を素早く作成したい方。",
                                features: ["A/Bテスト用に量産", "多言語対応可能", "ブランドに合わせた編集"]
                            },
                            {
                                title: "教育者 / コンテンツクリエイター",
                                description: "解説動画や教材を効率的に作成したい方。",
                                features: ["わかりやすい構成", "字幕自動生成", "編集知識不要"]
                            }
                        ].map((useCase, i) => (
                            <AnimatedSection key={i} delay={i * 0.1}>
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 h-full">
                                    <h3 className="text-xl font-bold text-white mb-3">{useCase.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4">{useCase.description}</p>
                                    <ul className="space-y-2">
                                        {useCase.features.map((feature, j) => (
                                            <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                                                <Check className="w-4 h-4 text-green-400" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <AnimatedSection>
                        <div className="relative p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10">
                            <h2 className="text-4xl font-bold mb-4">今すぐ始めよう</h2>
                            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                                無料で始められます。クレジットカード不要。
                                AIの力で、あなたのアイデアを動画に変えましょう。
                            </p>
                            <Link href="/login">
                                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-12 py-6">
                                    無料で始める
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>

                            {/* Decorative elements */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl" />
                            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-500/30 rounded-full blur-2xl" />
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Video className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold">Video AI Generator</span>
                        </div>
                        <div className="text-slate-400 text-sm">
                            © 2024 Video AI Generator. All rights reserved.
                        </div>
                        <div className="flex gap-6 text-sm text-slate-400">
                            <Link href="/login" className="hover:text-white transition-colors">ログイン</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
