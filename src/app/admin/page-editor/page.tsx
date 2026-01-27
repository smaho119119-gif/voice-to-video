"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft, Save, Upload, RefreshCw, Check, X,
    FileText, ImageIcon, Mic, Video, Eye, Loader2,
    ChevronDown, ChevronRight, Pencil, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SectionKey = "hero" | "features" | "steps" | "stats" | "use_cases" | "cta";

interface FeatureItem {
    id: string;
    title: string;
    description: string;
    image: string;
    gradient: string;
}

interface StepItem {
    number: number;
    title: string;
    description: string;
    image: string;
}

interface StatItem {
    value: string;
    label: string;
}

interface UseCaseItem {
    title: string;
    description: string;
    features: string[];
}

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

interface FeaturesContent {
    title: string;
    subtitle: string;
    items: FeatureItem[];
}

interface StepsContent {
    title: string;
    subtitle: string;
    items: StepItem[];
}

interface StatsContent {
    items: StatItem[];
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

type ContentMap = {
    hero?: HeroContent;
    features?: FeaturesContent;
    steps?: StepsContent;
    stats?: StatsContent;
    use_cases?: UseCasesContent;
    cta?: CtaContent;
};

const SECTION_LABELS: Record<SectionKey, string> = {
    hero: "ヒーローセクション",
    features: "機能紹介",
    steps: "ステップ説明",
    stats: "統計データ",
    use_cases: "ユースケース",
    cta: "CTA（行動喚起）"
};

const ICON_MAP: Record<string, React.ElementType> = {
    "script-ai": FileText,
    "image-ai": ImageIcon,
    "voice-ai": Mic,
    "video-composition": Video
};

export default function PageEditorPage() {
    const [content, setContent] = useState<ContentMap>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionKey>("hero");
    const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(["hero"]));
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<{ section: SectionKey; field: string; index?: number } | null>(null);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/page-content");
            const data = await res.json();
            if (data.success) {
                setContent(data.content);
            }
        } catch (error) {
            console.error("Failed to fetch content:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveSection = async (section: SectionKey) => {
        try {
            setSaving(true);
            setSaveStatus("saving");
            const res = await fetch("/api/page-content", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    section_key: section,
                    content: content[section]
                })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 2000);
            } else {
                setSaveStatus("error");
            }
        } catch (error) {
            console.error("Failed to save:", error);
            setSaveStatus("error");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/page-content/upload", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                updateField(uploadTarget.section, uploadTarget.field, data.url, uploadTarget.index);
            }
        } catch (error) {
            console.error("Upload failed:", error);
        }
        setUploadTarget(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const updateField = (section: SectionKey, field: string, value: unknown, index?: number) => {
        setContent(prev => {
            const sectionContent = { ...prev[section] } as Record<string, unknown>;
            if (index !== undefined && field.includes(".")) {
                const [arrayField, itemField] = field.split(".");
                const arr = [...(sectionContent[arrayField] as unknown[])];
                (arr[index] as Record<string, unknown>)[itemField] = value;
                sectionContent[arrayField] = arr;
            } else if (index !== undefined) {
                const arr = [...(sectionContent[field] as unknown[])];
                arr[index] = value;
                sectionContent[field] = arr;
            } else {
                sectionContent[field] = value;
            }
            return { ...prev, [section]: sectionContent };
        });
    };

    const toggleSection = (section: SectionKey) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
        setActiveSection(section);
    };

    const triggerImageUpload = (section: SectionKey, field: string, index?: number) => {
        setUploadTarget({ section, field, index });
        fileInputRef.current?.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold">ランディングページ編集</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/" target="_blank">
                            <Button variant="outline" size="sm" className="gap-2 border-white/20 text-slate-300 hover:text-white">
                                <Eye className="w-4 h-4" />
                                プレビュー
                            </Button>
                        </Link>
                        <Button
                            onClick={() => saveSection(activeSection)}
                            disabled={saving}
                            className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                            {saveStatus === "saving" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saveStatus === "saved" ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saveStatus === "saved" ? "保存完了" : "保存"}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Sidebar - Section List */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-2">
                            {(Object.keys(SECTION_LABELS) as SectionKey[]).map((section) => (
                                <button
                                    key={section}
                                    onClick={() => toggleSection(section)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                                        activeSection === section
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-transparent"
                                    }`}
                                >
                                    <span>{SECTION_LABELS[section]}</span>
                                    {expandedSections.has(section) ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content - Editor */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Hero Section */}
                        {expandedSections.has("hero") && content.hero && (
                            <EditorSection title="ヒーローセクション" onSave={() => saveSection("hero")}>
                                <div className="space-y-4">
                                    <InputField
                                        label="バッジテキスト"
                                        value={content.hero.badge}
                                        onChange={(v) => updateField("hero", "badge", v)}
                                    />
                                    <InputField
                                        label="タイトル（グラデーション部分）"
                                        value={content.hero.title_gradient}
                                        onChange={(v) => updateField("hero", "title_gradient", v)}
                                    />
                                    <InputField
                                        label="タイトル（白文字部分）"
                                        value={content.hero.title_white}
                                        onChange={(v) => updateField("hero", "title_white", v)}
                                    />
                                    <TextareaField
                                        label="説明文"
                                        value={content.hero.description}
                                        onChange={(v) => updateField("hero", "description", v)}
                                    />
                                    <InputField
                                        label="説明文ハイライト"
                                        value={content.hero.description_highlight}
                                        onChange={(v) => updateField("hero", "description_highlight", v)}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="プライマリボタン"
                                            value={content.hero.cta_primary}
                                            onChange={(v) => updateField("hero", "cta_primary", v)}
                                        />
                                        <InputField
                                            label="セカンダリボタン"
                                            value={content.hero.cta_secondary}
                                            onChange={(v) => updateField("hero", "cta_secondary", v)}
                                        />
                                    </div>
                                    <ImageField
                                        label="ヒーロー画像"
                                        value={content.hero.hero_image}
                                        onUpload={() => triggerImageUpload("hero", "hero_image")}
                                        onChange={(v) => updateField("hero", "hero_image", v)}
                                        defaultPrompt="A modern SaaS dashboard UI mockup showing video generation interface, floating 3D elements, dark purple and blue gradient background, professional tech design, glowing neon accents, abstract geometric shapes, premium quality"
                                    />
                                </div>
                            </EditorSection>
                        )}

                        {/* Features Section */}
                        {expandedSections.has("features") && content.features && (
                            <EditorSection title="機能紹介" onSave={() => saveSection("features")}>
                                <div className="space-y-4">
                                    <InputField
                                        label="セクションタイトル"
                                        value={content.features.title}
                                        onChange={(v) => updateField("features", "title", v)}
                                    />
                                    <TextareaField
                                        label="サブタイトル"
                                        value={content.features.subtitle}
                                        onChange={(v) => updateField("features", "subtitle", v)}
                                    />
                                    <div className="space-y-4 mt-6">
                                        <h4 className="text-sm font-medium text-slate-300">機能カード</h4>
                                        {content.features.items.map((item, index) => {
                                            const IconComponent = ICON_MAP[item.id] || FileText;
                                            return (
                                                <div key={item.id} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                                                            <IconComponent className="w-5 h-5 text-white" />
                                                        </div>
                                                        <span className="font-medium">{item.title}</span>
                                                    </div>
                                                    <InputField
                                                        label="タイトル"
                                                        value={item.title}
                                                        onChange={(v) => updateField("features", "items.title", v, index)}
                                                    />
                                                    <TextareaField
                                                        label="説明"
                                                        value={item.description}
                                                        onChange={(v) => updateField("features", "items.description", v, index)}
                                                    />
                                                    <ImageField
                                                        label="サムネイル画像"
                                                        value={item.image}
                                                        onUpload={() => triggerImageUpload("features", "items.image", index)}
                                                        onChange={(v) => updateField("features", "items.image", v, index)}
                                                        defaultPrompt={
                                                            item.id === "script-ai"
                                                                ? "AI script writing interface, floating text bubbles and screenplay formatting, dark theme with blue glow, modern tech UI, abstract neural network visualization"
                                                            : item.id === "image-ai"
                                                                ? "AI image generation concept art, colorful creative explosion, multiple artistic styles morphing together, dark background with purple and pink gradients, digital art studio visualization"
                                                            : item.id === "voice-ai"
                                                                ? "AI voice synthesis visualization, sound waves and audio waveforms, modern podcast recording studio, dark theme with green and teal glow, voice avatar concept"
                                                            : "Video composition software interface, timeline editor with multiple tracks, video transitions and effects preview, dark theme with orange and red accents, professional editing suite"
                                                        }
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </EditorSection>
                        )}

                        {/* Steps Section */}
                        {expandedSections.has("steps") && content.steps && (
                            <EditorSection title="ステップ説明" onSave={() => saveSection("steps")}>
                                <div className="space-y-4">
                                    <InputField
                                        label="セクションタイトル"
                                        value={content.steps.title}
                                        onChange={(v) => updateField("steps", "title", v)}
                                    />
                                    <InputField
                                        label="サブタイトル"
                                        value={content.steps.subtitle}
                                        onChange={(v) => updateField("steps", "subtitle", v)}
                                    />
                                    <div className="space-y-4 mt-6">
                                        <h4 className="text-sm font-medium text-slate-300">ステップ</h4>
                                        {content.steps.items.map((item, index) => (
                                            <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                                                        {item.number}
                                                    </div>
                                                    <span className="font-medium">{item.title}</span>
                                                </div>
                                                <InputField
                                                    label="タイトル"
                                                    value={item.title}
                                                    onChange={(v) => updateField("steps", "items.title", v, index)}
                                                />
                                                <TextareaField
                                                    label="説明"
                                                    value={item.description}
                                                    onChange={(v) => updateField("steps", "items.description", v, index)}
                                                />
                                                <ImageField
                                                    label="ステップ画像"
                                                    value={item.image}
                                                    onUpload={() => triggerImageUpload("steps", "items.image", index)}
                                                    onChange={(v) => updateField("steps", "items.image", v, index)}
                                                    defaultPrompt={
                                                        item.number === 1
                                                            ? "Clean input form UI, text input field with microphone icon, dark theme modern interface, minimalist design, blue and purple gradient accents"
                                                        : item.number === 2
                                                            ? "AI processing visualization, multiple gears and neural networks working, loading progress indicators, dark background with vibrant glowing elements, abstract automation concept"
                                                        : "Mobile phone showing vertical video playback, TikTok/YouTube Shorts style, download button highlighted, dark theme UI mockup, success completion state"
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </EditorSection>
                        )}

                        {/* Stats Section */}
                        {expandedSections.has("stats") && content.stats && (
                            <EditorSection title="統計データ" onSave={() => saveSection("stats")}>
                                <div className="grid grid-cols-2 gap-4">
                                    {content.stats.items.map((item, index) => (
                                        <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                            <InputField
                                                label="数値"
                                                value={item.value}
                                                onChange={(v) => updateField("stats", "items.value", v, index)}
                                            />
                                            <InputField
                                                label="ラベル"
                                                value={item.label}
                                                onChange={(v) => updateField("stats", "items.label", v, index)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </EditorSection>
                        )}

                        {/* Use Cases Section */}
                        {expandedSections.has("use_cases") && content.use_cases && (
                            <EditorSection title="ユースケース" onSave={() => saveSection("use_cases")}>
                                <div className="space-y-4">
                                    <InputField
                                        label="セクションタイトル"
                                        value={content.use_cases.title}
                                        onChange={(v) => updateField("use_cases", "title", v)}
                                    />
                                    <div className="space-y-4 mt-6">
                                        {content.use_cases.items.map((item, index) => (
                                            <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                                <InputField
                                                    label="ターゲット"
                                                    value={item.title}
                                                    onChange={(v) => updateField("use_cases", "items.title", v, index)}
                                                />
                                                <TextareaField
                                                    label="説明"
                                                    value={item.description}
                                                    onChange={(v) => updateField("use_cases", "items.description", v, index)}
                                                />
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1">特徴（カンマ区切り）</label>
                                                    <input
                                                        type="text"
                                                        value={item.features.join(", ")}
                                                        onChange={(e) => updateField("use_cases", "items.features", e.target.value.split(", "), index)}
                                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </EditorSection>
                        )}

                        {/* CTA Section */}
                        {expandedSections.has("cta") && content.cta && (
                            <EditorSection title="CTA（行動喚起）" onSave={() => saveSection("cta")}>
                                <div className="space-y-4">
                                    <InputField
                                        label="タイトル"
                                        value={content.cta.title}
                                        onChange={(v) => updateField("cta", "title", v)}
                                    />
                                    <TextareaField
                                        label="説明文"
                                        value={content.cta.description}
                                        onChange={(v) => updateField("cta", "description", v)}
                                    />
                                    <InputField
                                        label="ボタンテキスト"
                                        value={content.cta.button_text}
                                        onChange={(v) => updateField("cta", "button_text", v)}
                                    />
                                </div>
                            </EditorSection>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function EditorSection({ title, children, onSave }: {
    title: string;
    children: React.ReactNode;
    onSave: () => void
}) {
    return (
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">{title}</h3>
                <Button
                    size="sm"
                    onClick={onSave}
                    className="gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                >
                    <Save className="w-4 h-4" />
                    このセクションを保存
                </Button>
            </div>
            {children}
        </div>
    );
}

function InputField({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="block text-sm text-slate-400 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );
}

function TextareaField({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="block text-sm text-slate-400 mb-1">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
        </div>
    );
}

function ImageField({ label, value, onUpload, onChange, defaultPrompt }: {
    label: string;
    value: string;
    onUpload: () => void;
    onChange: (value: string) => void;
    defaultPrompt?: string;
}) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [prompt, setPrompt] = useState(defaultPrompt || "");
    const [generating, setGenerating] = useState(false);

    const generateImage = async () => {
        if (!prompt.trim()) return;
        setGenerating(true);
        try {
            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    aspectRatio: "16:9",
                    model: "2.5-flash"
                })
            });
            const data = await res.json();
            if (data.imageUrl) {
                onChange(data.imageUrl);
            }
        } catch (error) {
            console.error("Image generation failed:", error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm text-slate-400 mb-1">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="/images/example.png"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <Button
                    type="button"
                    onClick={onUpload}
                    variant="outline"
                    size="sm"
                    className="gap-1 border-white/20 text-xs"
                >
                    <Upload className="w-3 h-3" />
                    UP
                </Button>
                <Button
                    type="button"
                    onClick={() => setShowPrompt(!showPrompt)}
                    variant="outline"
                    size="sm"
                    className={`gap-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs ${showPrompt ? "bg-purple-500/20" : ""}`}
                >
                    <Sparkles className="w-3 h-3" />
                    AI
                </Button>
            </div>

            {/* AI Generation Panel */}
            {showPrompt && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-purple-300">
                        <Sparkles className="w-3 h-3" />
                        <span>AI画像生成プロンプト</span>
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="例: A modern tech dashboard UI mockup showing video editing interface, dark theme, purple and blue gradients, professional design"
                        rows={3}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Gemini 2.5 Flash で生成</span>
                        <Button
                            type="button"
                            onClick={generateImage}
                            disabled={generating || !prompt.trim()}
                            size="sm"
                            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3" />
                                    画像を生成
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Preview */}
            {value && (
                <div className="mt-2 relative w-40 h-24 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <Image
                        src={value}
                        alt={label}
                        fill
                        className="object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}
        </div>
    );
}
