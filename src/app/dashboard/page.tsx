"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AudioRecorder } from "@/components/AudioRecorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2, Wand2, Image as ImageIcon, Video,
    Mic, Sparkles, Globe, History, Trash2, LogOut, Settings,
    DollarSign, Menu, X, ChevronDown, ChevronUp, Users,
    Eye, Play, RefreshCw, Check, ChevronLeft, ChevronRight, Edit3, Volume2
} from "lucide-react";
import {
    saveVideoToSupabase, getUserVideos, loadVideoFromSupabase,
    deleteVideo, DBVideo, saveUrlToHistory, getUrlHistory, deleteUrlFromHistory
} from "@/lib/supabase";
import { getUserTotalCosts, formatCostJPY, formatCostUSD, saveCost } from "@/lib/cost-tracker";
import { applyPronunciationDictionary } from "@/lib/pronunciation";
import { generateLipSyncVideo, getDefaultAvatarImage } from "@/lib/lipsync";
import AvatarManager, { Avatar } from "@/components/AvatarManager";
import LipSyncTester from "@/components/LipSyncTester";
import ThemeHistorySlider from "@/components/ThemeHistorySlider";
import {
    getCurrentProject, createProject, updateProject, saveScenesToProject,
    getThemeHistory, addThemeToHistory, deleteThemeFromHistory, debouncedSave,
    Project, ThemeHistoryItem, ProjectSettings
} from "@/lib/project-storage";
import {
    loadSession, saveSession, autoSaveVideoConfig, clearSession,
    hasResumableSession, getSessionSummary, SavedVideoConfig
} from "@/lib/session-storage";
import axios from "axios";
import { Progress } from "@/components/ui/progress";
import { Player } from "@remotion/player";
import { MainVideo } from "@/remotion/MainVideo";

// Types
interface SoundEffect {
    type: "ambient" | "action" | "transition" | "emotion";
    keyword: string;
    timing: "start" | "middle" | "end" | "throughout";
    volume: number;
    url?: string;
}

type TransitionType = "fade" | "slide" | "zoom" | "wipe";

interface Scene {
    duration: number;
    avatar_script: string;
    subtitle: string;
    image_prompt: string;
    imageUrl?: string;
    audioUrl?: string;
    lipSyncVideoUrl?: string;
    sound_effects?: SoundEffect[];
    emotion?: "neutral" | "happy" | "serious" | "excited" | "thoughtful";
    transition?: TransitionType;
    emphasis_words?: string[];
}

interface BGMConfig {
    url: string;
    volume: number;
}

interface OpeningConfig {
    enabled: boolean;
    duration?: number;
    subtitle?: string;
}

interface EndingConfig {
    enabled: boolean;
    duration?: number;
    callToAction?: string;
    channelName?: string;
}

interface AvatarConfig {
    enabled: boolean;
    position?: "left" | "right" | "center";
    size?: "small" | "medium" | "large";
    imageUrl?: string;
}

interface VideoConfig {
    title: string;
    scenes: Scene[];
    bgm?: BGMConfig;
    aspectRatio: AspectRatio;
    opening?: OpeningConfig;
    ending?: EndingConfig;
    avatar?: AvatarConfig;
    textOnly?: boolean; // テキストのみモード（画像なし）
}

type InputMode = "voice" | "theme" | "url";
type TTSProvider = "google" | "elevenlabs" | "gemini";
type AspectRatio = "16:9" | "9:16";
type GenerationStep = "idle" | "script" | "images" | "audio" | "preview";
type GenerationMode = "auto" | "step"; // auto = 従来モード, step = みながらモード

const RESOLUTIONS = {
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 }
};

// Avatar characters
interface AvatarCharacter {
    id: string;
    name: string;
    gender: "female" | "male";
    emoji: string;
    personality: string;
    googleVoiceId: string;
    elevenLabsVoiceId: string;
    geminiVoiceId: string;
    color: string;
    avatarImageUrl?: string; // For lip sync
}

// プロバイダーごとのボイスリスト
interface VoiceOption {
    id: string;
    name: string;
    gender: "female" | "male";
    emoji: string;
    description: string;
    color: string;
}

// Google Cloud TTS 日本語音声（実動作確認済み）
// A=女性, D=男性 のパターン
const GOOGLE_VOICE_OPTIONS: VoiceOption[] = [
    { id: "ja-JP-Wavenet-A", name: "ハナ", gender: "female", emoji: "🌷", description: "落ち着いた女性ボイス", color: "from-pink-400 to-rose-500" },
    { id: "ja-JP-Wavenet-D", name: "タケシ", gender: "male", emoji: "👨‍🏫", description: "信頼感のある男性ボイス", color: "from-blue-400 to-indigo-500" },
];

const ELEVENLABS_VOICE_OPTIONS: VoiceOption[] = [
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", emoji: "👩", description: "ニュースキャスター風", color: "from-pink-400 to-rose-500" },
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", emoji: "💃", description: "落ち着いた大人の女性", color: "from-purple-400 to-pink-500" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "female", emoji: "🎵", description: "元気で明るい女性", color: "from-cyan-400 to-blue-500" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "male", emoji: "🎬", description: "深みのある男性", color: "from-blue-400 to-indigo-500" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", emoji: "🎧", description: "ナレーター風", color: "from-green-400 to-emerald-500" },
    { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "male", emoji: "📻", description: "若々しい男性", color: "from-amber-400 to-orange-500" },
];

const GEMINI_VOICE_OPTIONS: VoiceOption[] = [
    // 女性ボイス (4)
    { id: "Zephyr", name: "Zephyr", gender: "female", emoji: "🌸", description: "明るい女性声", color: "from-pink-400 to-rose-500" },
    { id: "Kore", name: "Kore", gender: "female", emoji: "🌙", description: "柔らかい女性声", color: "from-purple-400 to-pink-500" },
    { id: "Leda", name: "Leda", gender: "female", emoji: "💫", description: "温かみのある女性声", color: "from-cyan-400 to-blue-500" },
    { id: "Aoede", name: "Aoede", gender: "female", emoji: "🎭", description: "自然な女性声", color: "from-violet-400 to-purple-500" },
    // 男性ボイス (4)
    { id: "Puck", name: "Puck", gender: "male", emoji: "🎪", description: "活発な男性声", color: "from-amber-400 to-orange-500" },
    { id: "Charon", name: "Charon", gender: "male", emoji: "⚓", description: "落ち着いた男性声", color: "from-blue-400 to-indigo-500" },
    { id: "Fenrir", name: "Fenrir", gender: "male", emoji: "🐺", description: "力強い男性声", color: "from-green-400 to-emerald-500" },
    { id: "Orus", name: "Orus", gender: "male", emoji: "📚", description: "知的な男性声", color: "from-teal-400 to-cyan-500" },
];

// Gemini TTS Models
const GEMINI_TTS_MODELS = [
    { id: "gemini-2.5-flash-preview-tts", name: "Flash Preview", description: "バランス型（デフォルト）" },
    { id: "gemini-2.5-flash-tts", name: "Flash", description: "高速・安定版" },
    { id: "gemini-2.5-pro-tts", name: "Pro", description: "最高品質（低速）" },
    { id: "gemini-2.5-flash-lite-preview-tts", name: "Flash Lite", description: "最速・軽量" },
];

// Voice Style Presets (演技指導)
const VOICE_STYLE_PRESETS = [
    { id: "neutral", name: "ニュートラル", emoji: "😐", style: "" },
    { id: "cheerful", name: "明るく元気", emoji: "😊", style: "明るく元気に、ハキハキと話す" },
    { id: "calm", name: "落ち着いて", emoji: "😌", style: "落ち着いて穏やかに、ゆっくりと丁寧に" },
    { id: "serious", name: "真剣に", emoji: "😤", style: "真剣に力を込めて、強調するように" },
    { id: "excited", name: "ワクワク", emoji: "🤩", style: "ワクワクした気持ちで、テンション高めに" },
    { id: "whisper", name: "ささやき", emoji: "🤫", style: "囁くように小声で、優しく語りかける" },
    { id: "news", name: "ニュース風", emoji: "📺", style: "ニュースキャスターのように、はっきりと明瞭に" },
    { id: "teacher", name: "先生風", emoji: "👨‍🏫", style: "先生が教えるように、わかりやすく丁寧に説明" },
];

// 後方互換性のための旧AVATAR_CHARACTERS（生成時に使用）
const ELEVENLABS_VOICES = {
    female1: "EXAVITQu4vr4xnSDxMaL",
    female2: "21m00Tcm4TlvDq8ikWAM",
    female3: "AZnzlk1XvdvUeBnXmlld",
    male1: "VR6AewLTigWG4xSOukaG",
    male2: "pNInz6obpgDQGcFmaJgB",
    male3: "yoZ06aMxZJJ28mfd3POQ",
};

const GEMINI_VOICES = {
    female1: "Aoede",
    female2: "Kore",
    male1: "Charon",
    male2: "Fenrir",
    male3: "Puck",
};

// アバターキャラクター（Google音声: A=女性, D=男性）
const AVATAR_CHARACTERS: AvatarCharacter[] = [
    { id: "sakura", name: "サクラ", gender: "female", emoji: "🌸", personality: "落ち着いた大人の女性", googleVoiceId: "ja-JP-Wavenet-A", elevenLabsVoiceId: ELEVENLABS_VOICES.female1, geminiVoiceId: GEMINI_VOICES.female1, color: "from-pink-400 to-rose-500" },
    { id: "tanaka", name: "タナカ", gender: "male", emoji: "👨‍🏫", personality: "頼れる技術者タイプ", googleVoiceId: "ja-JP-Wavenet-D", elevenLabsVoiceId: ELEVENLABS_VOICES.male1, geminiVoiceId: GEMINI_VOICES.male1, color: "from-blue-400 to-indigo-500" },
];

// プロバイダーに応じたボイスリストを取得
function getVoiceOptionsForProvider(provider: TTSProvider): VoiceOption[] {
    switch (provider) {
        case "google": return GOOGLE_VOICE_OPTIONS;
        case "elevenlabs": return ELEVENLABS_VOICE_OPTIONS;
        case "gemini": return GEMINI_VOICE_OPTIONS;
        default: return GOOGLE_VOICE_OPTIONS;
    }
}

function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

async function getAudioDuration(audioUrl: string): Promise<number> {
    return new Promise((resolve) => {
        const audio = new Audio(audioUrl);
        audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
        audio.addEventListener("error", () => resolve(5));
    });
}

export default function Home() {
    const router = useRouter();
    const { user, loading: authLoading, signOut, isAdmin } = useAuth();

    // States
    const [inputMode, setInputMode] = useState<InputMode>("theme");
    const [themeText, setThemeText] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [urlHistory, setUrlHistory] = useState<string[]>([]);
    const [transcribedText, setTranscribedText] = useState("");
    const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [currentCost, setCurrentCost] = useState(0);
    const [selectedAvatar, setSelectedAvatar] = useState<AvatarCharacter>(AVATAR_CHARACTERS[0]);
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>("google");
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(GOOGLE_VOICE_OPTIONS[0].id); // 選択中のボイスID
    const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.5-flash-preview-tts"); // Gemini TTSモデル
    const [selectedVoiceStyle, setSelectedVoiceStyle] = useState<string>("neutral"); // 演技スタイル
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
    const [imageModel, setImageModel] = useState<"flash" | "pro">("flash"); // flash=高速3Flash, pro=高品質3Pro
    const [openingEnabled, setOpeningEnabled] = useState(true);
    const [endingEnabled, setEndingEnabled] = useState(true);
    const [avatarEnabled, setAvatarEnabled] = useState(false);
    const [textOnlyMode, setTextOnlyMode] = useState(false); // テキストのみモード（画像なし）
    const [lipSyncEnabled, setLipSyncEnabled] = useState(false); // リップシンク機能
    const [lipSyncAvailable, setLipSyncAvailable] = useState(false); // サービス利用可能か
    const [avatarImage, setAvatarImage] = useState<File | null>(null); // カスタムアバター画像
    const [customAvatar, setCustomAvatar] = useState<Avatar | null>(null); // カスタムアバター（DB）
    const [showAvatarManager, setShowAvatarManager] = useState(false); // アバター管理画面表示
    const [showLipSyncTester, setShowLipSyncTester] = useState(false); // リップシンクテスト画面
    const [videoHistory, setVideoHistory] = useState<DBVideo[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [totalCosts, setTotalCosts] = useState({ totalUsd: 0, thisMonth: 0 });

    // UI states
    const [showMenu, setShowMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [activeUsers, setActiveUsers] = useState(0);

    // みながらモード (Step-by-step mode) states
    const [generationMode, setGenerationMode] = useState<GenerationMode>("step");
    const [currentStep, setCurrentStep] = useState<GenerationStep>("idle");
    const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
    const [processingIndex, setProcessingIndex] = useState<number>(-1); // 現在処理中のシーンインデックス

    // MP4レンダリング states
    const [isRendering, setIsRendering] = useState(false);

    // Project sync states (cross-device)
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [themeHistory, setThemeHistory] = useState<ThemeHistoryItem[]>([]);
    const [isRestoringProject, setIsRestoringProject] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    // Audio ref for completion sound
    const completionSoundRef = useRef<HTMLAudioElement | null>(null);

    // Play completion sound
    const playCompletionSound = useCallback(() => {
        if (completionSoundRef.current) {
            completionSoundRef.current.currentTime = 0;
            completionSoundRef.current.play().catch(() => {});
        }
    }, []);

    // Voice preview state
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

    // Preview voice sample
    const previewVoice = useCallback(async () => {
        if (isPreviewingVoice) {
            // Stop current preview
            if (previewAudio) {
                previewAudio.pause();
                previewAudio.currentTime = 0;
            }
            setIsPreviewingVoice(false);
            return;
        }

        setIsPreviewingVoice(true);
        try {
            const voiceOptions = getVoiceOptionsForProvider(ttsProvider);
            const currentVoice = voiceOptions.find(v => v.id === selectedVoiceId) || voiceOptions[0];
            const sampleText = `こんにちは、${currentVoice.name}です。よろしくお願いします。`;

            console.log("[Voice Preview] Provider:", ttsProvider, "VoiceId:", selectedVoiceId);

            const stylePreset = VOICE_STYLE_PRESETS.find(s => s.id === selectedVoiceStyle);
            const res = await axios.post("/api/generate-voice", {
                text: sampleText,
                config: {
                    provider: ttsProvider,
                    voice: selectedVoiceId,
                    model: ttsProvider === "gemini" ? selectedGeminiModel : undefined,
                    style: stylePreset?.style || "",
                },
            });

            if (res.data.audioUrl) {
                const audio = new Audio(res.data.audioUrl);
                setPreviewAudio(audio);
                audio.onended = () => setIsPreviewingVoice(false);
                audio.onerror = () => setIsPreviewingVoice(false);
                await audio.play();
            }
        } catch (error) {
            console.error("Voice preview failed:", error);
            setIsPreviewingVoice(false);
        }
    }, [selectedVoiceId, ttsProvider, selectedGeminiModel, selectedVoiceStyle, isPreviewingVoice, previewAudio]);

    // Track active users (heartbeat every 30 seconds)
    useEffect(() => {
        if (!user) return;

        const trackActivity = async () => {
            try {
                const res = await axios.post("/api/active-users", { userId: user.id });
                if (res.data.activeUsers !== undefined) {
                    setActiveUsers(res.data.activeUsers);
                }
            } catch (err) {
                console.error("Failed to track activity:", err);
            }
        };

        // Initial tracking
        trackActivity();

        // Heartbeat every 30 seconds
        const interval = setInterval(trackActivity, 30000);

        return () => clearInterval(interval);
    }, [user]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Lip sync service check disabled - not currently needed
    // useEffect(() => {
    //     const checkAvailability = async () => {
    //         const available = await checkLipSyncAvailability();
    //         setLipSyncAvailable(available);
    //         if (!available) {
    //             console.warn("Lip sync service not available");
    //         }
    //     };
    //     checkAvailability();
    // }, []);

    // Restore theme text from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem("draftThemeText");
        if (savedTheme) {
            setThemeText(savedTheme);
        }
    }, []);

    // Save theme text to localStorage when it changes
    useEffect(() => {
        if (themeText) {
            localStorage.setItem("draftThemeText", themeText);
        }
    }, [themeText]);

    // Restore settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem("videoGeneratorSettings");
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.ttsProvider) setTtsProvider(settings.ttsProvider);
                if (settings.selectedVoiceId) setSelectedVoiceId(settings.selectedVoiceId);
                if (settings.imageModel) setImageModel(settings.imageModel);
                if (settings.aspectRatio) setAspectRatio(settings.aspectRatio);
                if (settings.textOnlyMode !== undefined) setTextOnlyMode(settings.textOnlyMode);
                if (settings.openingEnabled !== undefined) setOpeningEnabled(settings.openingEnabled);
                if (settings.endingEnabled !== undefined) setEndingEnabled(settings.endingEnabled);
                if (settings.avatarEnabled !== undefined) setAvatarEnabled(settings.avatarEnabled);
                if (settings.lipSyncEnabled !== undefined) setLipSyncEnabled(settings.lipSyncEnabled);
            } catch (e) {
                console.error("Failed to restore settings:", e);
            }
        }
    }, []);

    // Save settings to localStorage when they change
    useEffect(() => {
        const settings = {
            ttsProvider,
            selectedVoiceId,
            imageModel,
            aspectRatio,
            textOnlyMode,
            openingEnabled,
            endingEnabled,
            avatarEnabled,
            lipSyncEnabled,
        };
        localStorage.setItem("videoGeneratorSettings", JSON.stringify(settings));
    }, [ttsProvider, selectedVoiceId, imageModel, aspectRatio, textOnlyMode, openingEnabled, endingEnabled, avatarEnabled, lipSyncEnabled]);

    // Load user data
    useEffect(() => {
        if (user) {
            loadUrlHistory();
            loadCosts();
            loadVideoHistory();
            loadThemeHistory();
            loadCurrentProject();
        }
    }, [user]);

    // Load theme history from Supabase
    const loadThemeHistory = async () => {
        if (!user) return;
        try {
            const history = await getThemeHistory(user.id, 50);
            setThemeHistory(history);
        } catch (error) {
            console.error("Failed to load theme history:", error);
        }
    };

    // Load current project (for cross-device restore)
    const loadCurrentProject = async () => {
        if (!user) return;
        try {
            const project = await getCurrentProject(user.id);
            if (project && project.scenes && project.scenes.length > 0) {
                setCurrentProject(project);
                // Ask user if they want to restore
                setIsRestoringProject(true);
            }
        } catch (error) {
            console.error("Failed to load current project:", error);
        }
    };

    // Restore project state
    const restoreProject = (project: Project) => {
        if (project.theme_text) setThemeText(project.theme_text);
        if (project.url_input) setUrlInput(project.url_input);
        if (project.scenes) {
            setVideoConfig({
                title: project.title,
                scenes: project.scenes as Scene[],
                aspectRatio: project.aspect_ratio as AspectRatio,
            });
            setCurrentStep(project.generation_step as GenerationStep || "script");
        }
        if (project.settings) {
            const settings = project.settings as ProjectSettings;
            if (settings.ttsProvider) setTtsProvider(settings.ttsProvider);
            if (settings.selectedVoiceId) setSelectedVoiceId(settings.selectedVoiceId);
            if (settings.imageModel) setImageModel(settings.imageModel);
            if (settings.aspectRatio) setAspectRatio(settings.aspectRatio);
            if (settings.generationMode) setGenerationMode(settings.generationMode);
        }
        setIsRestoringProject(false);
        setShowResult(true);
    };

    // Auto-save project when videoConfig changes
    useEffect(() => {
        if (!user || !videoConfig || !currentProject) return;
        debouncedSave(async () => {
            await saveScenesToProject(
                currentProject.id,
                videoConfig.scenes,
                currentStep,
                processingIndex
            );
        }, 2000);
    }, [videoConfig, currentStep, processingIndex]);

    // Handle theme history selection
    const handleThemeHistorySelect = (item: ThemeHistoryItem) => {
        setThemeText(item.theme_text);
        if (item.input_mode === "url") {
            setInputMode("url");
            setUrlInput(item.theme_text);
        } else {
            setInputMode("theme");
        }
    };

    // Handle theme history delete
    const handleThemeHistoryDelete = async (themeId: string) => {
        if (!user) return;
        await deleteThemeFromHistory(themeId, user.id);
        setThemeHistory(prev => prev.filter(t => t.id !== themeId));
    };

    const loadUrlHistory = async () => {
        if (!user) return;
        const history = await getUrlHistory(user.id);
        setUrlHistory(history);
    };

    const loadCosts = async () => {
        if (!user) return;
        const costs = await getUserTotalCosts(user.id);
        setTotalCosts(costs);
    };

    const loadVideoHistory = async () => {
        if (!user) return;
        setIsLoadingHistory(true);
        try {
            const videos = await getUserVideos(user.id);
            setVideoHistory(videos);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const saveCompletedVideo = async (config: VideoConfig, sourceUrl?: string) => {
        if (!user) return;
        try {
            await saveVideoToSupabase(
                user.id,
                {
                    title: config.title,
                    inputMode: inputMode,
                    themeText: inputMode === "theme" ? themeText : undefined,
                    sourceUrl: sourceUrl,
                    transcribedText: inputMode === "voice" ? transcribedText : undefined,
                    bgmUrl: config.bgm?.url,
                    bgmVolume: config.bgm?.volume,
                },
                config.scenes.map((scene, index) => ({
                    sceneIndex: index,
                    avatarScript: scene.avatar_script,
                    subtitle: scene.subtitle,
                    imagePrompt: scene.image_prompt,
                    imageUrl: scene.imageUrl,
                    audioUrl: scene.audioUrl,
                    duration: scene.duration,
                    soundEffects: scene.sound_effects,
                }))
            );
        } catch (error) {
            console.error("Failed to save video:", error);
        }
    };

    const loadVideoFromHistory = async (videoId: string) => {
        setIsProcessing(true);
        try {
            const data = await loadVideoFromSupabase(videoId);
            if (data) {
                const loadedConfig: VideoConfig = {
                    title: data.video.title,
                    scenes: data.scenes.map(scene => ({
                        duration: scene.duration,
                        avatar_script: scene.avatar_script || "",
                        subtitle: scene.subtitle || "",
                        image_prompt: scene.image_prompt || "",
                        imageUrl: scene.image_url,
                        audioUrl: scene.audio_url,
                        sound_effects: scene.sound_effects as SoundEffect[],
                    })),
                    bgm: data.video.bgm_url ? {
                        url: data.video.bgm_url,
                        volume: data.video.bgm_volume || 0.15,
                    } : undefined,
                    aspectRatio: "16:9",
                };
                setVideoConfig(loadedConfig);
                setShowResult(true);
                setShowHistory(false);
            }
        } catch (error) {
            console.error("Failed to load video:", error);
            alert("動画の読み込みに失敗しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteVideoFromHistory = async (videoId: string) => {
        if (!confirm("この動画を削除しますか？")) return;
        try {
            const success = await deleteVideo(videoId);
            if (success) {
                await loadVideoHistory(); // Reload from database
            }
        } catch (error) {
            console.error("Failed to delete video:", error);
        }
    };

    const handleRecordingComplete = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", audioBlob, "recording.mp4");
            const response = await axios.post("/api/transcribe", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setTranscribedText(response.data.text);
        } catch (error) {
            console.error("Upload failed", error);
            alert("文字起こしに失敗しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerate = async () => {
        if (!user) return;

        const normalizedUrl = inputMode === "url" ? normalizeUrl(urlInput) : undefined;
        if (inputMode === "url" && !normalizedUrl) {
            alert("URLを入力してください");
            return;
        }
        if (inputMode === "theme" && !themeText.trim()) {
            alert("テーマを入力してください");
            return;
        }
        if (inputMode === "voice" && !transcribedText.trim()) {
            alert("音声を録音してください");
            return;
        }

        setIsProcessing(true);
        setShowResult(false);
        setGenerationProgress(5);
        setCurrentCost(0);

        // Save URL to history
        if (inputMode === "url" && normalizedUrl) {
            await saveUrlToHistory(user.id, normalizedUrl);
            loadUrlHistory();
        }

        try {
            // 1. Generate Script
            let scriptEndpoint = "/api/generate-script";
            let scriptPayload: any = { text: transcribedText };

            if (inputMode === "theme") {
                scriptEndpoint = "/api/generate-script-from-theme";
                scriptPayload = { theme: themeText, targetDuration: 60, style: "educational" };
            } else if (inputMode === "url") {
                scriptEndpoint = "/api/generate-script-from-url";
                scriptPayload = { url: normalizedUrl, targetDuration: 60, style: "educational" };
            }

            const scriptRes = await axios.post(scriptEndpoint, scriptPayload);
            const config = scriptRes.data.script || scriptRes.data;
            setVideoConfig(config);
            setGenerationProgress(20);

            // Track script generation cost (estimate)
            await saveCost(user.id, null, {
                service: "gemini_script",
                model: "gemini-2.0-flash",
                inputTokens: 500,
                outputTokens: 1500,
            });
            setCurrentCost(prev => prev + 0.0005);

            // 2. Generate Images
            const updatedScenes = [...config.scenes];
            for (let i = 0; i < updatedScenes.length; i++) {
                const imgRes = await axios.post("/api/generate-image", {
                    prompt: updatedScenes[i].image_prompt,
                    userId: user.id,
                    model: imageModel  // flash or pro
                });
                updatedScenes[i].imageUrl = imgRes.data.imageUrl;
                setGenerationProgress(20 + ((i + 1) / updatedScenes.length) * 30);

                await saveCost(user.id, null, { service: "gemini_image", images: 1 });
                setCurrentCost(prev => prev + 0.02);
            }
            setGenerationProgress(50);

            // 3. Generate Audio - Use selectedVoiceId directly
            const currentVoiceId = selectedVoiceId;

            // Debug: Log voice selection for auto mode
            console.log("[Client Auto] Voice config:", {
                provider: ttsProvider,
                voiceId: currentVoiceId
            });

            for (let i = 0; i < updatedScenes.length; i++) {
                try {
                    const audioRes = await axios.post("/api/generate-voice", {
                        text: applyPronunciationDictionary(updatedScenes[i].avatar_script),
                        config: { provider: ttsProvider, voice: currentVoiceId, speed: ttsProvider === "google" ? 1.0 : undefined, model: ttsProvider === "gemini" ? selectedGeminiModel : undefined },
                        userId: user.id
                    });
                    updatedScenes[i].audioUrl = audioRes.data.audioUrl;

                    const audioDuration = await getAudioDuration(audioRes.data.audioUrl);
                    updatedScenes[i].duration = Math.ceil(audioDuration) + 1;

                    // Generate lip sync video if enabled
                    if (lipSyncEnabled && lipSyncAvailable) {
                        try {
                            // カスタムアバターがあればそれを使う、なければデフォルト
                            const avatarImageUrl = customAvatar?.image_url
                                || selectedAvatar.avatarImageUrl
                                || getDefaultAvatarImage(selectedAvatar.id);
                            if (avatarImageUrl) {
                                console.log(`[Client Auto] Generating lip sync for scene ${i + 1}`);
                                const lipSyncVideoUrl = await generateLipSyncVideo(
                                    audioRes.data.audioUrl,
                                    avatarImageUrl,
                                    { quality: "Improved" }
                                );
                                updatedScenes[i].lipSyncVideoUrl = lipSyncVideoUrl;
                            }
                        } catch (error) {
                            console.error(`[Client Auto] Lip sync failed for scene ${i + 1}:`, error);
                        }
                    }

                    const charCount = updatedScenes[i].avatar_script.length;
                    await saveCost(user.id, null, {
                        service: ttsProvider === "gemini" ? "gemini_tts" : ttsProvider === "elevenlabs" ? "elevenlabs_tts" : "google_tts",
                        characters: charCount,
                    });
                    const ttsCost = ttsProvider === "elevenlabs" ? charCount * 0.0003 : charCount * 0.000004;
                    setCurrentCost(prev => prev + ttsCost);
                } catch (err) {
                    console.error(`Audio generation failed for scene ${i + 1}:`, err);
                }
                setGenerationProgress(50 + ((i + 1) / updatedScenes.length) * 30);
            }
            setGenerationProgress(80);

            // 4. Fetch Sound Effects
            for (const scene of updatedScenes) {
                if (scene.sound_effects?.length) {
                    for (const sfx of scene.sound_effects) {
                        try {
                            const sfxRes = await axios.post("/api/sound-effects", {
                                keyword: sfx.keyword,
                                type: sfx.type
                            });
                            if (sfxRes.data.success) {
                                sfx.url = sfxRes.data.sound.url;
                            }
                        } catch (err) {
                            console.error(`Sound effect fetch failed:`, err);
                        }
                    }
                }
            }
            setGenerationProgress(90);

            // 5. Fetch BGM
            let bgmConfig: BGMConfig | undefined;
            try {
                const bgmRes = await axios.post("/api/bgm", { style: "educational" });
                if (bgmRes.data.success) {
                    bgmConfig = { url: bgmRes.data.bgm.url, volume: bgmRes.data.bgm.recommendedVolume };
                }
            } catch (err) {
                console.error("BGM fetch failed:", err);
            }
            setGenerationProgress(95);

            // Final config
            const finalConfig: VideoConfig = {
                ...config,
                scenes: updatedScenes,
                bgm: bgmConfig,
                aspectRatio,
                opening: openingEnabled ? { enabled: true, duration: 3 } : { enabled: false },
                ending: endingEnabled ? { enabled: true, duration: 4, callToAction: "ご視聴ありがとうございました" } : { enabled: false },
                avatar: avatarEnabled ? { enabled: true, position: "right" as const, size: "medium" as const } : { enabled: false },
            };
            setVideoConfig(finalConfig);
            setGenerationProgress(100);

            await saveCompletedVideo(finalConfig, normalizedUrl);
            await loadCosts();
            await loadVideoHistory();

            // 全自動モード：MP4レンダリングまで自動実行
            try {
                setIsRendering(true);
                setRenderProgress(10);

                // プロジェクトを作成
                const projectRes = await axios.post("/api/projects", {
                    title: finalConfig.title,
                    description: `${inputMode}から生成`,
                    aspectRatio: finalConfig.aspectRatio || "16:9",
                    script: finalConfig,
                    sourceType: inputMode,
                    sourceText: inputMode === "theme" ? themeText : inputMode === "url" ? normalizedUrl : transcribedText,
                });

                let projectId = null;
                if (projectRes.data.success) {
                    projectId = projectRes.data.project.id;
                    setCurrentProjectId(projectId);
                }

                setRenderProgress(30);

                // MP4レンダリング実行
                const renderRes = await axios.post("/api/render", {
                    videoConfig: finalConfig,
                    projectId,
                });

                if (renderRes.data.success) {
                    setRenderedVideoUrl(renderRes.data.videoUrl);
                    setRenderProgress(100);

                    // レンダリングコスト記録（ローカル処理のため無料）
                    await saveCost(user.id, null, { service: "render" });
                    await loadCosts();
                }
            } catch (renderError) {
                console.error("MP4 rendering failed:", renderError);
                alert("MP4レンダリングに失敗しました。プレビューは利用可能です。");
            } finally {
                setIsRendering(false);
            }

            setShowResult(true);
            // playCompletionSound(); // 完了音を再生 - Disabled to prevent 404 error
        } catch (error) {
            console.error("Generation failed", error);
            alert("動画生成に失敗しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    // ========== みながらモード (Step-by-step mode) functions ==========

    // Step 1: 台本のみ生成
    const generateScriptOnly = async () => {
        if (!user) return;

        const normalizedUrl = inputMode === "url" ? normalizeUrl(urlInput) : undefined;
        if (inputMode === "url" && !normalizedUrl) {
            alert("URLを入力してください");
            return;
        }
        if (inputMode === "theme" && !themeText.trim()) {
            alert("テーマを入力してください");
            return;
        }
        if (inputMode === "voice" && !transcribedText.trim()) {
            alert("音声を録音してください");
            return;
        }

        setIsProcessing(true);
        setCurrentStep("script");
        setCurrentCost(0);

        if (inputMode === "url" && normalizedUrl) {
            await saveUrlToHistory(user.id, normalizedUrl);
            loadUrlHistory();
        }

        try {
            let scriptEndpoint = "/api/generate-script";
            let scriptPayload: any = { text: transcribedText };

            if (inputMode === "theme") {
                scriptEndpoint = "/api/generate-script-from-theme";
                scriptPayload = { theme: themeText, targetDuration: 60, style: "educational" };
            } else if (inputMode === "url") {
                scriptEndpoint = "/api/generate-script-from-url";
                scriptPayload = { url: normalizedUrl, targetDuration: 60, style: "educational" };
            }

            const scriptRes = await axios.post(scriptEndpoint, scriptPayload);
            const config = scriptRes.data.script || scriptRes.data;

            // 初期設定を追加
            const initialConfig: VideoConfig = {
                ...config,
                aspectRatio,
                opening: openingEnabled ? { enabled: true, duration: 3 } : { enabled: false },
                ending: endingEnabled ? { enabled: true, duration: 4, callToAction: "ご視聴ありがとうございました" } : { enabled: false },
                avatar: avatarEnabled ? { enabled: true, position: "right" as const, size: "medium" as const } : { enabled: false },
                textOnly: textOnlyMode,
            };

            setVideoConfig(initialConfig);
            await saveCost(user.id, null, { service: "gemini_script", model: "gemini-2.0-flash", inputTokens: 500, outputTokens: 1500 });
            setCurrentCost(0.0005);
        } catch (error) {
            console.error("Script generation failed", error);
            alert("台本生成に失敗しました。");
            setCurrentStep("idle");
        } finally {
            setIsProcessing(false);
        }
    };

    // Step 2: 1シーンの画像を生成
    const generateImageForScene = async (sceneIndex: number) => {
        if (!user || !videoConfig) return;

        setProcessingIndex(sceneIndex);
        try {
            const scene = videoConfig.scenes[sceneIndex];
            const imgRes = await axios.post("/api/generate-image", {
                prompt: scene.image_prompt,
                userId: user.id,
                model: imageModel  // flash or pro
            });

            const updatedScenes = [...videoConfig.scenes];
            updatedScenes[sceneIndex].imageUrl = imgRes.data.imageUrl;
            setVideoConfig({ ...videoConfig, scenes: updatedScenes });

            await saveCost(user.id, null, { service: "gemini_image", images: 1 });
            setCurrentCost(prev => prev + 0.02);
        } catch (error) {
            console.error(`Image generation failed for scene ${sceneIndex + 1}:`, error);
            alert(`シーン${sceneIndex + 1}の画像生成に失敗しました`);
        } finally {
            setProcessingIndex(-1);
        }
    };

    // 全シーンの画像を一括生成
    const generateAllImages = async () => {
        if (!user || !videoConfig) return;

        setIsProcessing(true);
        try {
            for (let i = 0; i < videoConfig.scenes.length; i++) {
                if (!videoConfig.scenes[i].imageUrl) {
                    await generateImageForScene(i);
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Step 3: 1シーンの音声を生成
    const generateAudioForScene = async (sceneIndex: number) => {
        if (!user || !videoConfig) return;

        setProcessingIndex(sceneIndex);
        try {
            const scene = videoConfig.scenes[sceneIndex];
            // Use selectedVoiceId directly
            const currentVoiceId = selectedVoiceId;

            // Debug: Log voice selection
            console.log("[Client] Generating audio with:", {
                provider: ttsProvider,
                voiceId: currentVoiceId,
                sceneIndex
            });

            const audioRes = await axios.post("/api/generate-voice", {
                text: applyPronunciationDictionary(scene.avatar_script),
                config: { provider: ttsProvider, voice: currentVoiceId, speed: ttsProvider === "google" ? 1.0 : undefined, model: ttsProvider === "gemini" ? selectedGeminiModel : undefined },
                userId: user.id
            });

            const audioDuration = await getAudioDuration(audioRes.data.audioUrl);

            const updatedScenes = [...videoConfig.scenes];
            updatedScenes[sceneIndex].audioUrl = audioRes.data.audioUrl;
            updatedScenes[sceneIndex].duration = Math.ceil(audioDuration) + 1;

            // Generate lip sync video if enabled
            if (lipSyncEnabled && lipSyncAvailable) {
                try {
                    // カスタムアバターがあればそれを使う、なければデフォルト
                    const avatarImageUrl = customAvatar?.image_url
                        || selectedAvatar.avatarImageUrl
                        || getDefaultAvatarImage(selectedAvatar.id);
                    if (avatarImageUrl) {
                        console.log("[Client] Generating lip sync video for scene", sceneIndex);
                        const lipSyncVideoUrl = await generateLipSyncVideo(
                            audioRes.data.audioUrl,
                            avatarImageUrl,
                            { quality: "Improved" }
                        );
                        updatedScenes[sceneIndex].lipSyncVideoUrl = lipSyncVideoUrl;
                    } else {
                        console.warn("[Client] No avatar image available for lip sync");
                    }
                } catch (error) {
                    console.error("[Client] Lip sync failed:", error);
                    // Continue without lip sync
                }
            }

            setVideoConfig({ ...videoConfig, scenes: updatedScenes });

            const charCount = scene.avatar_script.length;
            await saveCost(user.id, null, {
                service: ttsProvider === "gemini" ? "gemini_tts" : ttsProvider === "elevenlabs" ? "elevenlabs_tts" : "google_tts",
                characters: charCount,
            });
            const ttsCost = ttsProvider === "elevenlabs" ? charCount * 0.0003 : charCount * 0.000004;
            setCurrentCost(prev => prev + ttsCost);
        } catch (error) {
            console.error(`Audio generation failed for scene ${sceneIndex + 1}:`, error);
            alert(`シーン${sceneIndex + 1}の音声生成に失敗しました`);
        } finally {
            setProcessingIndex(-1);
        }
    };

    // 全シーンの音声を一括生成
    const generateAllAudio = async () => {
        if (!user || !videoConfig) return;

        setIsProcessing(true);
        try {
            for (let i = 0; i < videoConfig.scenes.length; i++) {
                if (!videoConfig.scenes[i].audioUrl) {
                    await generateAudioForScene(i);
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // シーンの台本を更新
    const updateSceneScript = (sceneIndex: number, newScript: string) => {
        if (!videoConfig) return;
        const updatedScenes = [...videoConfig.scenes];
        updatedScenes[sceneIndex].avatar_script = newScript;
        updatedScenes[sceneIndex].subtitle = newScript;
        // 音声を再生成が必要になるのでクリア
        updatedScenes[sceneIndex].audioUrl = undefined;
        setVideoConfig({ ...videoConfig, scenes: updatedScenes });
    };

    // シーンの画像プロンプトを更新
    const updateSceneImagePrompt = (sceneIndex: number, newPrompt: string) => {
        if (!videoConfig) return;
        const updatedScenes = [...videoConfig.scenes];
        updatedScenes[sceneIndex].image_prompt = newPrompt;
        // 画像を再生成が必要になるのでクリア
        updatedScenes[sceneIndex].imageUrl = undefined;
        setVideoConfig({ ...videoConfig, scenes: updatedScenes });
    };

    // 次のステップへ進む
    const proceedToNextStep = () => {
        if (currentStep === "script") {
            setCurrentStep("images");
        } else if (currentStep === "images") {
            setCurrentStep("audio");
        } else if (currentStep === "audio") {
            setCurrentStep("preview");
            finalizeVideo();
        }
    };

    // 前のステップへ戻る
    const goToPreviousStep = () => {
        if (currentStep === "images") {
            setCurrentStep("script");
        } else if (currentStep === "audio") {
            setCurrentStep("images");
        } else if (currentStep === "preview") {
            setCurrentStep("audio");
        }
    };

    // 最終処理（効果音・BGM取得）
    const finalizeVideo = async () => {
        if (!user || !videoConfig) return;

        setIsProcessing(true);
        try {
            const updatedScenes = [...videoConfig.scenes];

            // 効果音取得
            for (const scene of updatedScenes) {
                if (scene.sound_effects?.length) {
                    for (const sfx of scene.sound_effects) {
                        try {
                            const sfxRes = await axios.post("/api/sound-effects", { keyword: sfx.keyword, type: sfx.type });
                            if (sfxRes.data.success) sfx.url = sfxRes.data.sound.url;
                        } catch {}
                    }
                }
            }

            // BGM取得
            let bgmConfig: BGMConfig | undefined;
            try {
                const bgmRes = await axios.post("/api/bgm", { style: "educational" });
                if (bgmRes.data.success) {
                    bgmConfig = { url: bgmRes.data.bgm.url, volume: bgmRes.data.bgm.recommendedVolume };
                }
            } catch {}

            const finalConfig: VideoConfig = {
                ...videoConfig,
                scenes: updatedScenes,
                bgm: bgmConfig,
            };
            setVideoConfig(finalConfig);

            await saveCompletedVideo(finalConfig, inputMode === "url" ? normalizeUrl(urlInput) : undefined);
            await loadCosts();
            await loadVideoHistory();
            // playCompletionSound(); // Disabled to prevent 404 error
        } finally {
            setIsProcessing(false);
        }
    };

    // みながらモードをリセット
    const resetStepMode = () => {
        setCurrentStep("idle");
        setVideoConfig(null);
        setEditingSceneIndex(null);
        setProcessingIndex(-1);
        setCurrentCost(0);
        setRenderedVideoUrl(null);
        setCurrentProjectId(null);
    };

    // MP4レンダリング
    const renderToMP4 = async () => {
        if (!videoConfig || !user) return;

        setIsRendering(true);
        setRenderProgress(0);

        try {
            // プロジェクトを作成または更新
            if (!currentProjectId) {
                const projectRes = await axios.post("/api/projects", {
                    title: videoConfig.title,
                    description: `${inputMode}から生成`,
                    aspectRatio: videoConfig.aspectRatio || "16:9",
                    script: videoConfig,
                    sourceType: inputMode,
                    sourceText: inputMode === "theme" ? themeText : inputMode === "url" ? urlInput : transcribedText,
                });

                if (projectRes.data.success) {
                    setCurrentProjectId(projectRes.data.project.id);
                }
            }

            // レンダリング開始
            setRenderProgress(10);
            const renderRes = await axios.post("/api/render", {
                videoConfig,
                projectId: currentProjectId,
            });

            if (renderRes.data.success) {
                setRenderedVideoUrl(renderRes.data.videoUrl);
                setRenderProgress(100);

                // コスト記録（レンダリング自体は無料、ローカル処理）
                await saveCost(user.id, null, { service: "render" });
                await loadCosts();

                alert("MP4レンダリングが完了しました！");
            }
        } catch (error: any) {
            console.error("Render error:", error);
            alert(`レンダリングに失敗しました: ${error.message || "不明なエラー"}`);
        } finally {
            setIsRendering(false);
        }
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center" suppressHydrationWarning>
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" suppressHydrationWarning>
            {/* Completion Sound - Disabled to prevent 404 error */}
            {/* <audio
                ref={completionSoundRef}
                src="/sounds/complete.mp3"
                preload="auto"
            /> */}

            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Video className="w-6 h-6 text-blue-400" />
                        <span className="font-bold text-white hidden sm:inline">Video AI</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Active users display */}
                        <div className="flex items-center gap-1 px-2 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
                            <Users className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 font-medium">{activeUsers}</span>
                            <span className="text-slate-400 hidden sm:inline">オンライン</span>
                        </div>

                        {/* Cost display */}
                        <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-lg text-xs">
                            <DollarSign className="w-3 h-3 text-green-400" />
                            <span className="text-slate-300">今月: {formatCostJPY(totalCosts.thisMonth)}</span>
                        </div>

                        {/* Editor link */}
                        <Link
                            href="/editor"
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 hover:bg-purple-500/30 transition-colors"
                        >
                            <Edit3 className="w-3 h-3" />
                            <span className="hidden sm:inline">エディター</span>
                        </Link>

                        {/* Studio link */}
                        <a
                            href="http://localhost:3000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-xs text-orange-300 hover:bg-orange-500/30 transition-colors"
                        >
                            <Play className="w-3 h-3" />
                            <span className="hidden sm:inline">Studio</span>
                        </a>

                        {/* Admin link */}
                        {isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="text-slate-300">
                                <Settings className="w-4 h-4" />
                            </Button>
                        )}

                        {/* Menu button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-slate-300"
                        >
                            {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* Dropdown menu */}
                {showMenu && (
                    <div className="absolute right-4 top-14 w-64 bg-slate-800 rounded-lg shadow-xl border border-white/10 p-2">
                        <div className="px-3 py-2 border-b border-white/10 mb-2">
                            <p className="text-sm text-white font-medium truncate">{user.email}</p>
                            <p className="text-xs text-slate-400">累計コスト: {formatCostUSD(totalCosts.totalUsd)}</p>
                        </div>
                        <button
                            onClick={() => { loadVideoHistory(); setShowHistory(true); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-md"
                        >
                            <History className="w-4 h-4" />
                            動画履歴
                        </button>
                        <button
                            onClick={() => { setShowSettings(!showSettings); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-md"
                        >
                            <Settings className="w-4 h-4" />
                            設定
                        </button>
                        <button
                            onClick={signOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-md"
                        >
                            <LogOut className="w-4 h-4" />
                            ログアウト
                        </button>
                    </div>
                )}
            </header>

            {/* Main content */}
            <div className="max-w-4xl mx-auto p-4 pb-32">
                {/* History modal */}
                {showHistory && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                        <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">動画履歴</h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                                    <X className="w-5 h-5 text-white" />
                                </Button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                {isLoadingHistory ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                    </div>
                                ) : videoHistory.length === 0 ? (
                                    <p className="text-center text-slate-400 py-8">履歴がありません</p>
                                ) : (
                                    <div className="space-y-2">
                                        {videoHistory.map((video) => (
                                            <div key={video.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                <button onClick={() => loadVideoFromHistory(video.id)} className="flex-1 text-left">
                                                    <p className="text-sm text-white font-medium truncate">{video.title}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(video.created_at).toLocaleDateString("ja-JP")}
                                                    </p>
                                                </button>
                                                <button
                                                    onClick={() => deleteVideoFromHistory(video.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Result view */}
                {showResult && videoConfig ? (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">{videoConfig.title}</h2>
                            <Button variant="ghost" size="sm" onClick={() => setShowResult(false)} className="text-slate-300">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Video player */}
                        <div className={`w-full overflow-hidden rounded-xl border border-white/10 ${
                            videoConfig.aspectRatio === "9:16" ? "max-w-sm mx-auto" : ""
                        }`} style={{ aspectRatio: videoConfig.aspectRatio === "16:9" ? "16/9" : "9/16" }}>
                            <Player
                                component={MainVideo as any}
                                inputProps={videoConfig}
                                durationInFrames={
                                    (videoConfig.opening?.enabled ? (videoConfig.opening.duration || 3) * 30 : 0) +
                                    videoConfig.scenes.reduce((acc, scene) => acc + scene.duration * 30, 0) +
                                    (videoConfig.ending?.enabled ? (videoConfig.ending.duration || 4) * 30 : 0)
                                }
                                fps={30}
                                compositionWidth={RESOLUTIONS[videoConfig.aspectRatio || "16:9"].width}
                                compositionHeight={RESOLUTIONS[videoConfig.aspectRatio || "16:9"].height}
                                style={{ width: "100%", height: "100%" }}
                                controls
                            />
                        </div>

                        {/* Cost for this video */}
                        <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                            <span className="text-sm text-slate-300">この動画のコスト</span>
                            <span className="text-sm font-medium text-green-400">{formatCostJPY(currentCost)}</span>
                        </div>

                        {/* Scene thumbnails */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {videoConfig.scenes.map((scene, i) => (
                                <div key={i} className="aspect-video bg-slate-700 rounded-lg overflow-hidden relative">
                                    {scene.imageUrl ? (
                                        <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ImageIcon className="w-6 h-6 text-slate-500" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60">
                                        <p className="text-[10px] text-white truncate">{scene.subtitle}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* MP4レンダリングボタン */}
                        {isRendering ? (
                            <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
                                <div className="text-center mb-4">
                                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-blue-300 font-medium">MP4レンダリング中...</p>
                                    <p className="text-xs text-slate-400 mt-1">しばらくお待ちください（数分かかる場合があります）</p>
                                </div>
                                <Progress value={renderProgress} className="w-full" />
                            </div>
                        ) : renderedVideoUrl ? (
                            <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20 space-y-3">
                                <div className="flex items-center gap-2 text-green-400">
                                    <Check className="w-5 h-5" />
                                    <span className="font-medium">レンダリング完了！</span>
                                </div>
                                <a
                                    href={renderedVideoUrl}
                                    download={`${videoConfig.title}.mp4`}
                                    className="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg text-center transition-colors"
                                >
                                    MP4をダウンロード
                                </a>
                            </div>
                        ) : (
                            <Button
                                onClick={renderToMP4}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                            >
                                <Video className="w-5 h-5 mr-2" />
                                MP4として保存
                            </Button>
                        )}

                        <Button
                            onClick={() => { setShowResult(false); setVideoConfig(null); setRenderedVideoUrl(null); setCurrentProjectId(null); }}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
                        >
                            新しく作成
                        </Button>
                    </div>
                ) : (
                    // Input form
                    <div className="space-y-4">
                        {/* Settings panel (collapsible) */}
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="w-full p-4 flex items-center justify-between text-white"
                            >
                                <span className="font-medium">設定</span>
                                {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {showSettings && (
                                <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                                    {/* TTS Provider */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-slate-400">音声エンジン</label>
                                            <Link
                                                href="/voice-test"
                                                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                                            >
                                                音声テスト →
                                            </Link>
                                        </div>
                                        <div className="flex gap-2">
                                            {(["google", "elevenlabs", "gemini"] as TTSProvider[]).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        setTtsProvider(p);
                                                        // プロバイダー切替時にデフォルトボイスを選択
                                                        const voices = getVoiceOptionsForProvider(p);
                                                        setSelectedVoiceId(voices[0].id);
                                                        // Stop preview if playing
                                                        if (previewAudio) {
                                                            previewAudio.pause();
                                                            setIsPreviewingVoice(false);
                                                        }
                                                    }}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium ${
                                                        ttsProvider === p
                                                            ? "bg-blue-500 text-white"
                                                            : "bg-white/5 text-slate-300"
                                                    }`}
                                                >
                                                    {p === "google" ? "Google" : p === "elevenlabs" ? "ElevenLabs" : "Gemini 2.5 TTS"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Gemini TTS Model Selection (only when Gemini is selected) */}
                                    {ttsProvider === "gemini" && (
                                        <div className="mt-3">
                                            <label className="text-xs text-slate-400 mb-2 block">TTSモデル</label>
                                            <div className="grid grid-cols-2 gap-1">
                                                {GEMINI_TTS_MODELS.map((model) => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => setSelectedGeminiModel(model.id)}
                                                        className={`py-1.5 px-2 rounded text-[10px] transition-colors text-left ${
                                                            selectedGeminiModel === model.id
                                                                ? "bg-purple-500/80 text-white"
                                                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                                                        }`}
                                                        title={model.description}
                                                    >
                                                        <span className="font-medium">{model.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Voice Style Selection (演技指導) - Gemini only */}
                                    {ttsProvider === "gemini" && (
                                        <div>
                                            <label className="text-[10px] text-slate-400 mb-1 block">🎭 演技スタイル</label>
                                            <div className="grid grid-cols-4 gap-1">
                                                {VOICE_STYLE_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => setSelectedVoiceStyle(preset.id)}
                                                        className={`py-1.5 px-1 rounded text-[10px] transition-colors text-center ${
                                                            selectedVoiceStyle === preset.id
                                                                ? "bg-amber-500/80 text-white"
                                                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                                                        }`}
                                                        title={preset.style || "デフォルト"}
                                                    >
                                                        <span className="block text-sm">{preset.emoji}</span>
                                                        <span className="block text-[8px] truncate">{preset.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Narrator selection - Provider-specific voices */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-slate-400">
                                                ナレーター: {(() => {
                                                    const voices = getVoiceOptionsForProvider(ttsProvider);
                                                    const voice = voices.find(v => v.id === selectedVoiceId);
                                                    return voice ? `${voice.name} (${voice.description})` : "選択してください";
                                                })()}
                                            </label>
                                            <button
                                                onClick={previewVoice}
                                                disabled={isPreviewingVoice}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                                                    isPreviewingVoice
                                                        ? "bg-green-500 text-white"
                                                        : "bg-white/10 text-slate-300 hover:bg-white/20"
                                                }`}
                                            >
                                                <Volume2 className={`w-3 h-3 ${isPreviewingVoice ? "animate-pulse" : ""}`} />
                                                {isPreviewingVoice ? "再生中..." : "試聴"}
                                            </button>
                                        </div>
                                        <div className="flex justify-center gap-2 flex-wrap">
                                            {getVoiceOptionsForProvider(ttsProvider).map((voice) => (
                                                <button
                                                    key={voice.id}
                                                    onClick={() => {
                                                        setSelectedVoiceId(voice.id);
                                                        // Stop preview if playing
                                                        if (previewAudio) {
                                                            previewAudio.pause();
                                                            setIsPreviewingVoice(false);
                                                        }
                                                    }}
                                                    title={`${voice.name} - ${voice.description}`}
                                                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${voice.color} flex items-center justify-center text-lg transition-all ${
                                                        selectedVoiceId === voice.id
                                                            ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800 scale-110"
                                                            : "opacity-60 hover:opacity-80"
                                                    }`}
                                                >
                                                    {voice.emoji}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-500 text-center mt-2">
                                            Voice ID: {selectedVoiceId}
                                        </p>
                                    </div>

                                    {/* Image Model Selection */}
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">画像生成モデル</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setImageModel("flash")}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium ${
                                                    imageModel === "flash"
                                                        ? "bg-amber-500 text-white"
                                                        : "bg-white/5 text-slate-300"
                                                }`}
                                            >
                                                ⚡ 3Flash (高速)
                                            </button>
                                            <button
                                                onClick={() => setImageModel("pro")}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium ${
                                                    imageModel === "pro"
                                                        ? "bg-amber-500 text-white"
                                                        : "bg-white/5 text-slate-300"
                                                }`}
                                            >
                                                ✨ 3Pro (高品質)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Aspect ratio */}
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">アスペクト比</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAspectRatio("16:9")}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                                    aspectRatio === "16:9" ? "bg-blue-500 text-white" : "bg-white/5 text-slate-300"
                                                }`}
                                            >
                                                <span className="inline-block w-4 h-2.5 border border-current rounded-sm" />
                                                横型 16:9
                                            </button>
                                            <button
                                                onClick={() => setAspectRatio("9:16")}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                                    aspectRatio === "9:16" ? "bg-pink-500 text-white" : "bg-white/5 text-slate-300"
                                                }`}
                                            >
                                                <span className="inline-block w-2.5 h-4 border border-current rounded-sm" />
                                                縦型 9:16
                                            </button>
                                        </div>
                                    </div>

                                    {/* Image Mode Toggle */}
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">画像モード</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTextOnlyMode(false)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                                    !textOnlyMode ? "bg-green-500 text-white" : "bg-white/5 text-slate-300"
                                                }`}
                                            >
                                                <ImageIcon className="w-3 h-3" />
                                                画像あり
                                            </button>
                                            <button
                                                onClick={() => setTextOnlyMode(true)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                                    textOnlyMode ? "bg-cyan-500 text-white" : "bg-white/5 text-slate-300"
                                                }`}
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                テキストのみ（高速）
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lip Sync Toggle */}
                                    {lipSyncAvailable && !textOnlyMode && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs text-slate-400">
                                                    リップシンク
                                                </label>
                                                <button
                                                    onClick={() => setShowLipSyncTester(true)}
                                                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                                                >
                                                    テスト
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setLipSyncEnabled(false)}
                                                    disabled={!lipSyncAvailable}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium ${
                                                        !lipSyncEnabled ? "bg-slate-600 text-white" : "bg-white/5 text-slate-300"
                                                    }`}
                                                >
                                                    オフ
                                                </button>
                                                <button
                                                    onClick={() => setLipSyncEnabled(true)}
                                                    disabled={!lipSyncAvailable}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium ${
                                                        lipSyncEnabled ? "bg-purple-500 text-white" : "bg-white/5 text-slate-300"
                                                    }`}
                                                >
                                                    オン（口パク）
                                                </button>
                                            </div>
                                            {lipSyncEnabled && (
                                                <div className="mt-2">
                                                    <button
                                                        onClick={() => setShowAvatarManager(!showAvatarManager)}
                                                        className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Users className="w-3 h-3" />
                                                        {customAvatar ? `選択中: ${customAvatar.name}` : "アバターを選択"}
                                                    </button>
                                                    {customAvatar && (
                                                        <p className="mt-1 text-xs text-slate-400 text-center">
                                                            ✓ {customAvatar.type === "ai_generated" ? "AI生成" : "写真アップロード"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* OP/ED/Avatar toggles */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setOpeningEnabled(!openingEnabled)}
                                            className={`flex-1 py-2 rounded-lg text-xs ${
                                                openingEnabled ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-300"
                                            }`}
                                        >
                                            オープニング {openingEnabled && "✓"}
                                        </button>
                                        <button
                                            onClick={() => setEndingEnabled(!endingEnabled)}
                                            className={`flex-1 py-2 rounded-lg text-xs ${
                                                endingEnabled ? "bg-violet-500 text-white" : "bg-white/5 text-slate-300"
                                            }`}
                                        >
                                            エンディング {endingEnabled && "✓"}
                                        </button>
                                        <button
                                            onClick={() => setAvatarEnabled(!avatarEnabled)}
                                            className={`flex-1 py-2 rounded-lg text-xs ${
                                                avatarEnabled ? "bg-amber-500 text-white" : "bg-white/5 text-slate-300"
                                            }`}
                                        >
                                            アバター表示 {avatarEnabled && "✓"}
                                        </button>
                                    </div>

                                </div>
                            )}
                        </div>

                        {/* Input mode tabs */}
                        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                            <button
                                onClick={() => setInputMode("theme")}
                                className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                                    inputMode === "theme" ? "bg-purple-500 text-white" : "text-slate-400"
                                }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline">テーマ</span>
                            </button>
                            <button
                                onClick={() => setInputMode("url")}
                                className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                                    inputMode === "url" ? "bg-green-500 text-white" : "text-slate-400"
                                }`}
                            >
                                <Globe className="w-4 h-4" />
                                <span className="hidden sm:inline">URL</span>
                            </button>
                            <button
                                onClick={() => setInputMode("voice")}
                                className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                                    inputMode === "voice" ? "bg-blue-500 text-white" : "text-slate-400"
                                }`}
                            >
                                <Mic className="w-4 h-4" />
                                <span className="hidden sm:inline">音声</span>
                            </button>
                        </div>

                        {/* Theme History Slider */}
                        {inputMode === "theme" && themeHistory.length > 0 && (
                            <ThemeHistorySlider
                                history={themeHistory}
                                onSelect={handleThemeHistorySelect}
                                onDelete={handleThemeHistoryDelete}
                                currentTheme={themeText}
                            />
                        )}

                        {/* Input area */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            {inputMode === "theme" && (
                                <Textarea
                                    value={themeText}
                                    onChange={(e) => setThemeText(e.target.value)}
                                    placeholder="動画のテーマを入力してください...&#10;例: 初心者向けプログラミング入門"
                                    className="bg-transparent border-0 text-white placeholder-slate-500 resize-none min-h-[120px] focus:ring-0"
                                />
                            )}

                            {inputMode === "url" && (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="example.com/article"
                                        className="w-full bg-transparent border-0 text-white placeholder-slate-500 focus:ring-0 text-lg"
                                    />
                                    {urlHistory.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {urlHistory.slice(0, 5).map((url, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setUrlInput(url)}
                                                    className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300 truncate max-w-[150px]"
                                                >
                                                    {url.replace(/^https?:\/\//, "")}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {inputMode === "voice" && (
                                <div className="space-y-4">
                                    <AudioRecorder
                                        onRecordingComplete={handleRecordingComplete}
                                        isProcessing={isProcessing}
                                    />
                                    {transcribedText && (
                                        <Textarea
                                            value={transcribedText}
                                            onChange={(e) => setTranscribedText(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white min-h-[100px]"
                                            placeholder="文字起こし結果..."
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Generation Mode Toggle */}
                        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                            <button
                                onClick={() => setGenerationMode("step")}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                    generationMode === "step" ? "bg-amber-500 text-white" : "text-slate-400"
                                }`}
                            >
                                <Eye className="w-3 h-3" />
                                みながらモード
                            </button>
                            <button
                                onClick={() => setGenerationMode("auto")}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                    generationMode === "auto" ? "bg-blue-500 text-white" : "text-slate-400"
                                }`}
                            >
                                <Wand2 className="w-3 h-3" />
                                自動生成
                            </button>
                        </div>

                        {/* Step-by-step mode UI */}
                        {currentStep !== "idle" && videoConfig ? (
                            <div className="space-y-4">
                                {/* Step indicator */}
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        {(textOnlyMode ? ["script", "audio", "preview"] : ["script", "images", "audio", "preview"]).map((step, i, arr) => (
                                            <div key={step} className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    currentStep === step ? "bg-amber-500 text-white" :
                                                    arr.indexOf(currentStep) > i ? "bg-green-500 text-white" :
                                                    "bg-white/10 text-slate-400"
                                                }`}>
                                                    {arr.indexOf(currentStep) > i ? <Check className="w-4 h-4" /> : i + 1}
                                                </div>
                                                {i < arr.length - 1 && <div className={`w-6 h-0.5 ${arr.indexOf(currentStep) > i ? "bg-green-500" : "bg-white/10"}`} />}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {textOnlyMode && <span className="text-cyan-400 mr-2">⚡高速</span>}
                                        {formatCostJPY(currentCost)}
                                    </span>
                                </div>

                                {/* Step 1: Script Preview */}
                                {currentStep === "script" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-white">📝 台本プレビュー</h3>
                                            <span className="text-xs text-slate-400">{videoConfig.scenes.length}シーン</span>
                                        </div>
                                        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                                            {videoConfig.scenes.map((scene, i) => (
                                                <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-amber-400">シーン {i + 1}</span>
                                                        <button
                                                            onClick={() => setEditingSceneIndex(editingSceneIndex === i ? null : i)}
                                                            className="text-xs text-blue-400 flex items-center gap-1"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                            編集
                                                        </button>
                                                    </div>
                                                    {editingSceneIndex === i ? (
                                                        <div className="space-y-2">
                                                            <Textarea
                                                                value={scene.avatar_script}
                                                                onChange={(e) => updateSceneScript(i, e.target.value)}
                                                                className="bg-slate-800 border-slate-600 text-white text-sm min-h-[80px]"
                                                            />
                                                            <input
                                                                value={scene.image_prompt}
                                                                onChange={(e) => updateSceneImagePrompt(i, e.target.value)}
                                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300"
                                                                placeholder="画像プロンプト"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-white mb-2">{scene.avatar_script}</p>
                                                            <p className="text-[10px] text-slate-500 truncate">🎨 {scene.image_prompt}</p>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={resetStepMode} variant="outline" className="flex-1 border-slate-600 text-slate-300">
                                                <X className="w-4 h-4 mr-1" /> キャンセル
                                            </Button>
                                            <Button
                                                onClick={() => setCurrentStep(textOnlyMode ? "audio" : "images")}
                                                className={`flex-1 ${textOnlyMode ? "bg-cyan-500 hover:bg-cyan-600" : "bg-amber-500 hover:bg-amber-600"}`}
                                            >
                                                {textOnlyMode ? (
                                                    <>音声生成へ <ChevronRight className="w-4 h-4 ml-1" /></>
                                                ) : (
                                                    <>画像生成へ <ChevronRight className="w-4 h-4 ml-1" /></>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Image Generation (skip if textOnlyMode) */}
                                {currentStep === "images" && !textOnlyMode && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-white">🎨 画像生成</h3>
                                            <Button onClick={generateAllImages} disabled={isProcessing} size="sm" className="bg-green-500 text-xs">
                                                すべて生成
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {videoConfig.scenes.map((scene, i) => (
                                                <div key={i} className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
                                                    <div className="aspect-video bg-slate-800 relative">
                                                        {processingIndex === i ? (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                                            </div>
                                                        ) : scene.imageUrl ? (
                                                            <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <ImageIcon className="w-8 h-8 text-slate-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-[10px] text-slate-400 truncate mb-2">{scene.image_prompt.slice(0, 50)}...</p>
                                                        <Button
                                                            onClick={() => generateImageForScene(i)}
                                                            disabled={processingIndex !== -1}
                                                            size="sm"
                                                            className={`w-full text-xs ${scene.imageUrl ? "bg-slate-600" : "bg-amber-500"}`}
                                                        >
                                                            {scene.imageUrl ? <><RefreshCw className="w-3 h-3 mr-1" />再生成</> : "生成"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => setCurrentStep("script")} variant="outline" className="flex-1 border-slate-600 text-slate-300">
                                                <ChevronLeft className="w-4 h-4 mr-1" /> 台本へ
                                            </Button>
                                            <Button
                                                onClick={() => setCurrentStep("audio")}
                                                disabled={!videoConfig.scenes.every(s => s.imageUrl)}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600"
                                            >
                                                音声生成へ <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Audio Generation */}
                                {currentStep === "audio" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold text-white">🎤 音声生成</h3>
                                            <Button onClick={generateAllAudio} disabled={isProcessing} size="sm" className="bg-green-500 text-xs">
                                                すべて生成
                                            </Button>
                                        </div>
                                        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                                            {videoConfig.scenes.map((scene, i) => (
                                                <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-20 h-12 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                                                            {scene.imageUrl && <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-white mb-1 line-clamp-2">{scene.avatar_script}</p>
                                                            <div className="flex items-center gap-2">
                                                                {processingIndex === i ? (
                                                                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                                                ) : scene.audioUrl ? (
                                                                    <>
                                                                        <audio src={scene.audioUrl} controls className="h-8 flex-1" style={{ maxWidth: "150px" }} />
                                                                        <span className="text-[10px] text-green-400">{scene.duration}秒</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-500">未生成</span>
                                                                )}
                                                                <Button
                                                                    onClick={() => generateAudioForScene(i)}
                                                                    disabled={processingIndex !== -1}
                                                                    size="sm"
                                                                    className={`text-xs ${scene.audioUrl ? "bg-slate-600" : "bg-amber-500"}`}
                                                                >
                                                                    {scene.audioUrl ? <RefreshCw className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setCurrentStep(textOnlyMode ? "script" : "images")}
                                                variant="outline"
                                                className="flex-1 border-slate-600 text-slate-300"
                                            >
                                                <ChevronLeft className="w-4 h-4 mr-1" /> {textOnlyMode ? "台本へ" : "画像へ"}
                                            </Button>
                                            <Button
                                                onClick={proceedToNextStep}
                                                disabled={!videoConfig.scenes.every(s => s.audioUrl) || isProcessing}
                                                className="flex-1 bg-green-500 hover:bg-green-600"
                                            >
                                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>プレビュー <Play className="w-4 h-4 ml-1" /></>}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Final Preview */}
                                {currentStep === "preview" && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-white">🎬 完成プレビュー</h3>
                                        <div className={`w-full overflow-hidden rounded-xl border border-white/10 ${
                                            videoConfig.aspectRatio === "9:16" ? "max-w-sm mx-auto" : ""
                                        }`} style={{ aspectRatio: videoConfig.aspectRatio === "16:9" ? "16/9" : "9/16" }}>
                                            <Player
                                                component={MainVideo as any}
                                                inputProps={videoConfig}
                                                durationInFrames={
                                                    (videoConfig.opening?.enabled ? (videoConfig.opening.duration || 3) * 30 : 0) +
                                                    videoConfig.scenes.reduce((acc, scene) => acc + (scene.duration || 5) * 30, 0) +
                                                    (videoConfig.ending?.enabled ? (videoConfig.ending.duration || 4) * 30 : 0)
                                                }
                                                fps={30}
                                                compositionWidth={RESOLUTIONS[videoConfig.aspectRatio || "16:9"].width}
                                                compositionHeight={RESOLUTIONS[videoConfig.aspectRatio || "16:9"].height}
                                                style={{ width: "100%", height: "100%" }}
                                                controls
                                            />
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                                            <span className="text-sm text-slate-300">総コスト</span>
                                            <span className="text-sm font-medium text-green-400">{formatCostJPY(currentCost)}</span>
                                        </div>

                                        {/* MP4レンダリングボタン */}
                                        {isRendering ? (
                                            <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
                                                <div className="text-center mb-4">
                                                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-2" />
                                                    <p className="text-sm text-blue-300 font-medium">MP4レンダリング中...</p>
                                                    <p className="text-xs text-slate-400 mt-1">しばらくお待ちください（数分かかる場合があります）</p>
                                                </div>
                                                <Progress value={renderProgress} className="w-full" />
                                            </div>
                                        ) : renderedVideoUrl ? (
                                            <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20 space-y-3">
                                                <div className="flex items-center gap-2 text-green-400">
                                                    <Check className="w-5 h-5" />
                                                    <span className="font-medium">レンダリング完了！</span>
                                                </div>
                                                <a
                                                    href={renderedVideoUrl}
                                                    download={`${videoConfig.title}.mp4`}
                                                    className="block w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg text-center transition-colors"
                                                >
                                                    MP4をダウンロード
                                                </a>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={renderToMP4}
                                                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                                            >
                                                <Video className="w-5 h-5 mr-2" />
                                                MP4として保存
                                            </Button>
                                        )}

                                        <div className="flex gap-2">
                                            <Button onClick={() => setCurrentStep("audio")} variant="outline" className="flex-1 border-slate-600 text-slate-300">
                                                <ChevronLeft className="w-4 h-4 mr-1" /> 修正する
                                            </Button>
                                            <Button onClick={resetStepMode} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500">
                                                新しく作成
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Generate button */
                            isProcessing ? (
                                <div className="bg-white/5 rounded-xl p-6 text-center">
                                    <div className="relative inline-flex mb-4">
                                        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                            {generationProgress}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-2">
                                        {!isRendering && generationProgress < 20 && "台本を生成中..."}
                                        {!isRendering && generationProgress >= 20 && generationProgress < 50 && (
                                            <span className="flex items-center justify-center gap-2">
                                                画像を生成中...
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-700 rounded-full animate-pulse">
                                                    {imageModel === "flash" ? (
                                                        <><span className="text-yellow-400">⚡</span> Gemini 3 Flash</>
                                                    ) : (
                                                        <><span className="text-purple-400">✨</span> Gemini 3 Pro</>
                                                    )}
                                                </span>
                                            </span>
                                        )}
                                        {!isRendering && generationProgress >= 50 && generationProgress < 80 && "音声を生成中..."}
                                        {!isRendering && generationProgress >= 80 && generationProgress < 95 && "効果音・BGMを追加中..."}
                                        {!isRendering && generationProgress >= 95 && "最終調整中..."}
                                        {isRendering && "MP4動画をレンダリング中...（数分かかる場合があります）"}
                                    </p>
                                    <Progress value={isRendering ? renderProgress : generationProgress} className="w-full" />
                                    <p className="text-xs text-green-400 mt-2">現在のコスト: {formatCostJPY(currentCost)}</p>
                                </div>
                            ) : (
                                <Button
                                    onClick={generationMode === "step" ? generateScriptOnly : handleGenerate}
                                    disabled={
                                        (inputMode === "theme" && !themeText.trim()) ||
                                        (inputMode === "url" && !urlInput.trim()) ||
                                        (inputMode === "voice" && !transcribedText.trim())
                                    }
                                    className={`w-full py-6 font-bold text-lg rounded-xl ${
                                        generationMode === "step"
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                            : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600"
                                    } text-white`}
                                >
                                    {generationMode === "step" ? (
                                        <><Eye className="w-5 h-5 mr-2" />台本を生成して確認</>
                                    ) : (
                                        <><Wand2 className="w-5 h-5 mr-2" />動画を自動生成</>
                                    )}
                                </Button>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Avatar Manager Modal */}
            {showAvatarManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
                        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">アバター管理</h2>
                            <button
                                onClick={() => setShowAvatarManager(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6">
                            <AvatarManager
                                onSelectAvatar={(avatar) => {
                                    setCustomAvatar(avatar);
                                    setShowAvatarManager(false);
                                }}
                                selectedAvatarId={customAvatar?.id}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Lip Sync Tester Modal */}
            {showLipSyncTester && (
                <LipSyncTester onClose={() => setShowLipSyncTester(false)} />
            )}
        </main>
    );
}
