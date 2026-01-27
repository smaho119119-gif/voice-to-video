"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
    Video, Sparkles, Mic, Image as ImageIcon, Wand2,
    Play, ChevronRight, Zap, Clock, Check,
    ArrowRight, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// Types for dynamic content
interface HeroContent {
    badge: string;
    title_gradient: string;
    title_white: string;
    description: string;
    description_highlight: string;
    cta_primary: string;
    cta_secondary: string;
    hero_image: string;
}

interface FeatureItem {
    id: string;
    title: string;
    description: string;
    image: string;
    gradient: string;
}

interface FeaturesContent {
    title: string;
    subtitle: string;
    items: FeatureItem[];
}

interface StepItem {
    number: number;
    title: string;
    description: string;
    image: string;
}

interface StepsContent {
    title: string;
    subtitle: string;
    items: StepItem[];
}

interface StatsContent {
    items: { value: string; label: string; }[];
}

interface UseCaseItem {
    title: string;
    description: string;
    features: string[];
}

interface UseCasesContent {
    title: string;
    items: UseCaseItem[];
}

interface CtaContent {
    title: string;
    description: string;
    button_text: string;
}

interface PageContent {
    hero?: HeroContent;
    features?: FeaturesContent;
    steps?: StepsContent;
    stats?: StatsContent;
    use_cases?: UseCasesContent;
    cta?: CtaContent;
}

// Default content (fallback)
const DEFAULT_CONTENT: PageContent = {
    hero: {
        badge: "YouTube Shorts・TikTok・Reels向け動画を自動作成",
        title_gradient: "テキストから動画を",
        title_white: "自動生成",
        description: "「睡眠の質を上げる方法」などテーマを入力 → AIが台本を作成 → 画像・ナレーション・字幕を自動生成 → 完成した動画をダウンロード。",
        description_highlight: "編集スキル不要、最短1分で完成。",
        cta_primary: "無料で動画を作成",
        cta_secondary: "デモを見る",
        hero_image: "/images/hero_ui_mockup.png"
    },
    features: {
        title: "4つのAIが連携して動画を自動生成",
        subtitle: "Premiere ProやAfter Effectsは不要。テーマを入力するだけで、4つのAIが連携して高品質な縦型動画を自動で作成します。",
        items: [
            { id: "script-ai", title: "① 台本AI", description: "Gemini/GPT-4が視聴者を引きつける構成の台本を自動生成。フック→本題→まとめの流れで離脱を防ぎます。", image: "/images/feature-script-ai.png", gradient: "from-blue-500 to-purple-600" },
            { id: "image-ai", title: "② 画像生成AI", description: "各シーンの内容に合わせた画像をDALL-E/Imagen等で自動生成。アニメ風・写実風など画風も選べます。", image: "/images/feature-image-ai.png", gradient: "from-purple-500 to-pink-600" },
            { id: "voice-ai", title: "③ 音声合成AI", description: "Google/ElevenLabs/Gemini TTSで自然な日本語ナレーション。男女8種類以上の声から選択可能。", image: "/images/feature-voice-ai.png", gradient: "from-green-500 to-teal-600" },
            { id: "video-composition", title: "④ 動画合成", description: "Remotionエンジンで画像・音声・字幕を合成。Ken Burns効果やトランジションで動きのある動画に。", image: "/images/feature-video-composition.png", gradient: "from-orange-500 to-red-600" }
        ]
    },
    steps: {
        title: "3ステップで完成",
        subtitle: "動画編集ソフトは一切不要。テーマを入力して待つだけ。",
        items: [
            { number: 1, title: "テーマを入力", description: "「ダイエット豆知識」「仕事効率化」など、テーマを入力。ブログURLを貼り付けて自動要約も可能。", image: "/images/step_input_ui.png" },
            { number: 2, title: "AIが自動生成", description: "Geminiが台本を書き、画像AIがシーンを描き、音声AIがナレーションを読み上げ。Remotionが全てを合成。", image: "/images/step_processing_visual.png" },
            { number: 3, title: "MP4をダウンロード", description: "1080×1920の縦型動画（MP4）をダウンロード。そのままYouTube Shorts・TikTok・Reelsに投稿可能。", image: "/images/step_result_mobile.png" }
        ]
    },
    stats: {
        items: [
            { value: "1分〜", label: "動画生成時間" },
            { value: "1080p", label: "縦型HD画質" },
            { value: "8+", label: "AI音声バリエーション" },
            { value: "無制限", label: "ローカル生成" }
        ]
    },
    use_cases: {
        title: "こんな方におすすめ",
        items: [
            { title: "YouTuber / TikToker", description: "短尺動画を大量に投稿したい方。毎日の投稿も楽々。", features: ["ショート動画に最適", "一括生成可能", "トレンドに素早く対応"] },
            { title: "マーケター", description: "商品紹介や広告動画を素早く作成したい方。", features: ["A/Bテスト用に量産", "多言語対応可能", "ブランドに合わせた編集"] },
            { title: "教育者 / コンテンツクリエイター", description: "解説動画や教材を効率的に作成したい方。", features: ["わかりやすい構成", "字幕自動生成", "編集知識不要"] }
        ]
    },
    cta: {
        title: "今すぐ動画を作ろう",
        description: "テーマを入力 → 台本・画像・音声・字幕を自動生成 → MP4ダウンロード。編集スキル不要で、ショート動画の量産体制が整います。",
        button_text: "無料で始める"
    }
};

const ICON_MAP: Record<string, React.ElementType> = {
    "script-ai": FileText,
    "image-ai": ImageIcon,
    "voice-ai": Mic,
    "video-composition": Video
};

const STAT_ICONS = [Clock, Zap, Mic, Sparkles];

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
function FeatureCard({ icon: Icon, title, description, delay, image, href, gradient }: {
    icon: React.ElementType;
    title: string;
    description: string;
    delay: number;
    image?: string;
    href?: string;
    gradient?: string;
}) {
    const content = (
        <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm h-full cursor-pointer"
        >
            {/* Thumbnail area */}
            <div className={`relative h-32 overflow-hidden ${gradient || "bg-gradient-to-br from-blue-900/30 to-purple-900/30"}`}>
                {image ? (
                    <>
                        <Image
                            src={image}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="w-16 h-16 text-white/30 group-hover:text-white/50 transition-colors" />
                    </div>
                )}
                <div className="absolute bottom-3 left-3">
                    <div className={`w-10 h-10 rounded-xl ${gradient || "bg-gradient-to-br from-blue-500 to-purple-600"} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{description}</p>
                {href && (
                    <div className="mt-3 flex items-center text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
                        <span>詳しく見る</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                )}
            </div>
        </motion.div>
    );

    return (
        <AnimatedSection delay={delay}>
            {href ? <Link href={href}>{content}</Link> : content}
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
    const [pageContent, setPageContent] = useState<PageContent>(DEFAULT_CONTENT);

    // Fetch dynamic content from API
    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch("/api/page-content");
                const data = await res.json();
                if (data.success && data.content) {
                    setPageContent(prev => ({ ...prev, ...data.content }));
                }
            } catch (error) {
                console.error("Failed to fetch page content:", error);
                // Keep default content on error
            }
        };
        fetchContent();
    }, []);

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

    // Memoize content to avoid unnecessary re-renders
    const hero = useMemo(() => pageContent.hero || DEFAULT_CONTENT.hero!, [pageContent.hero]);
    const features = useMemo(() => pageContent.features || DEFAULT_CONTENT.features!, [pageContent.features]);
    const steps = useMemo(() => pageContent.steps || DEFAULT_CONTENT.steps!, [pageContent.steps]);
    const stats = useMemo(() => pageContent.stats || DEFAULT_CONTENT.stats!, [pageContent.stats]);
    const useCases = useMemo(() => pageContent.use_cases || DEFAULT_CONTENT.use_cases!, [pageContent.use_cases]);
    const cta = useMemo(() => pageContent.cta || DEFAULT_CONTENT.cta!, [pageContent.cta]);

    return (
        <div className="h-screen bg-slate-950 text-white overflow-y-scroll snap-y snap-mandatory scroll-smooth">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl transition-transform duration-1000 ease-out"
                    style={{
                        transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
                    }}
                />
                <div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl transition-transform duration-1000 ease-out"
                    style={{
                        transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`
                    }}
                />
            </div>

            {/* Header - Fixed */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/0 backdrop-blur-sm transition-all duration-300">
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
            <section className="relative h-screen w-full snap-start flex items-center justify-center pt-16">
                <div className="max-w-6xl mx-auto px-4 text-center w-full">
                    <AnimatedSection>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-slate-300">{hero.badge}</span>
                            </div>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                        >
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                {hero.title_gradient}
                            </span>
                            <br />
                            <span className="text-white">{hero.title_white}</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto"
                        >
                            {hero.description}
                            <span className="text-white font-medium">{hero.description_highlight}</span>
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
                        >
                            <Link href="/login">
                                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-6">
                                    {hero.cta_primary}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="ghost" className="border border-white/30 bg-white/10 text-white hover:bg-white/20 text-lg px-8 py-6">
                                <Play className="w-5 h-5 mr-2" />
                                {hero.cta_secondary}
                            </Button>
                        </motion.div>

                        {/* Demo video preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="relative perspective-1000 max-w-4xl mx-auto"
                        >
                            <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-2xl shadow-purple-500/20 group">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                                <Image
                                    src={hero.hero_image}
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
                            </div>
                            {/* Glow effect */}
                            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl -z-10" />
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Features Section */}
            <section className="h-screen w-full snap-start flex items-center justify-center relative bg-slate-950/50">
                <div className="max-w-6xl mx-auto px-4 w-full">
                    <AnimatedSection className="text-center mb-12">
                        <h2 className="text-4xl font-bold mb-4">{features.title}</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            {features.subtitle}
                        </p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.items.map((item, index) => {
                            const IconComponent = ICON_MAP[item.id] || FileText;
                            return (
                                <FeatureCard
                                    key={item.id}
                                    icon={IconComponent}
                                    title={item.title}
                                    description={item.description}
                                    delay={index * 0.1}
                                    href={`/features/${item.id}`}
                                    gradient={`bg-gradient-to-br ${item.gradient}`}
                                    image={item.image}
                                />
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="h-screen w-full snap-start flex items-center justify-center bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
                <div className="max-w-6xl mx-auto px-4 w-full">
                    <AnimatedSection className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">{steps.title}</h2>
                        <p className="text-slate-400">{steps.subtitle}</p>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
                        {steps.items.map((item, index) => (
                            <StepCard
                                key={item.number}
                                number={item.number}
                                title={item.title}
                                description={item.description}
                                delay={index * 0.1}
                                image={item.image}
                            />
                        ))}
                    </div>

                    {/* Simple flow visualization */}
                    <AnimatedSection delay={0.3} className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between opacity-50">
                            {[FileText, Wand2, Video].map((Icon, i) => (
                                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}>
                                    <Icon className="w-8 h-8 text-white" />
                                </motion.div>
                            ))}
                        </div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Stats & Use Cases Combined for better flow */}
            <section className="h-screen w-full snap-start flex items-center justify-center">
                <div className="max-w-6xl mx-auto px-4 w-full">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-24">
                        {stats.items.map((stat, i) => {
                            const StatIcon = STAT_ICONS[i] || Sparkles;
                            return (
                                <AnimatedSection key={i} delay={i * 0.1}>
                                    <div className="p-4">
                                        <StatIcon className="w-8 h-8 text-purple-400 mx-auto mb-4" />
                                        <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                            {stat.value}
                                        </div>
                                        <div className="text-slate-400 text-sm">{stat.label}</div>
                                    </div>
                                </AnimatedSection>
                            );
                        })}
                    </div>

                    <AnimatedSection className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">{useCases.title}</h2>
                    </AnimatedSection>

                    <div className="grid md:grid-cols-3 gap-6">
                        {useCases.items.map((useCase, i) => (
                            <AnimatedSection key={i} delay={i * 0.1}>
                                <div className="p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 h-full hover:bg-white/10 transition-colors">
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

            {/* CTA & Footer Section */}
            <section className="h-screen w-full snap-start flex flex-col items-center justify-center relative bg-gradient-to-t from-blue-950/20 to-transparent">
                <div className="flex-1 flex items-center justify-center w-full">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <AnimatedSection>
                            <div className="relative p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-4xl md:text-5xl font-bold mb-6">{cta.title}</h2>
                                    <p className="text-slate-300 mb-10 max-w-xl mx-auto text-lg">
                                        {cta.description}
                                    </p>
                                    <Link href="/login">
                                        <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xl px-16 py-8 h-auto shadow-xl shadow-blue-500/20">
                                            {cta.button_text}
                                            <ChevronRight className="w-6 h-6 ml-2" />
                                        </Button>
                                    </Link>
                                </div>

                                {/* Decorative elements */}
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
                                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
                            </div>
                        </AnimatedSection>
                    </div>
                </div>

                <footer className="w-full py-8 border-t border-white/5 bg-slate-950/50 backdrop-blur-sm">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Video className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold">Video AI Generator</span>
                            </div>
                            <div className="text-slate-500 text-sm">
                                © 2024 Video AI Generator. All rights reserved.
                            </div>
                            <div className="flex gap-6 text-sm text-slate-500">
                                <Link href="/login" className="hover:text-white transition-colors">ログイン</Link>
                                <Link href="#" className="hover:text-white transition-colors">利用規約</Link>
                                <Link href="#" className="hover:text-white transition-colors">プライバシー</Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </section>
        </div>
    );
}
