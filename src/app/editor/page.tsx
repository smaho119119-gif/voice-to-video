"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { VideoStyleSelector } from "@/components/VideoStyleSelector";
import { CutList } from "@/components/CutList";
import { VideoPreview } from "@/components/VideoPreview";
import {
  VideoStyleConfig,
  CutConfig,
  ImageEffect,
  TextAnimation,
  SceneTransition,
  SpeakerType,
  getDefaultConfig,
  calculateCutCount,
} from "@/lib/video-presets";
import {
  generateUniformCuts,
  updateCut,
  updateAllCuts,
} from "@/lib/auto-cut-generator";
import { VideoProps, Scene } from "@/remotion/MainVideo";
import { Loader2, Download, ArrowLeft, Sparkles, FileText, Wand2, Volume2, GripVertical, Globe, Mic, Eye, X, Database, Check, Save, Book } from "lucide-react";
import Link from "next/link";
import { AudioRecorder } from "@/components/AudioRecorder";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { ReadingDictionaryModal } from "@/components/ReadingDictionaryModal";

type InputMode = "theme" | "url" | "voice";
type TTSProvider = "google" | "elevenlabs" | "gemini" | "aivis";
type ImageModel = "pro" | "flash";

// 画像生成モデルオプション
const IMAGE_MODEL_OPTIONS = [
  { id: "flash" as ImageModel, name: "Flash", description: "高速・文字なし向け", icon: "⚡" },
  { id: "pro" as ImageModel, name: "Pro", description: "高品質・テキスト対応", icon: "🎨" },
];

// Voice options per provider
const GOOGLE_VOICE_OPTIONS = [
  { id: "ja-JP-Wavenet-A", name: "ハナ", gender: "female", description: "落ち着いた女性ボイス" },
  { id: "ja-JP-Wavenet-D", name: "タケシ", gender: "male", description: "信頼感のある男性ボイス" },
];

const ELEVENLABS_VOICE_OPTIONS = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", description: "ニュースキャスター風" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", description: "落ち着いた大人の女性" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "male", description: "深みのある男性" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", description: "ナレーター風" },
];

const GEMINI_VOICE_OPTIONS = [
  // 女性ボイス (4)
  { id: "Zephyr", name: "Zephyr", gender: "female", description: "明るい女性声" },
  { id: "Kore", name: "Kore", gender: "female", description: "柔らかい女性声" },
  { id: "Leda", name: "Leda", gender: "female", description: "温かみのある女性声" },
  { id: "Aoede", name: "Aoede", gender: "female", description: "自然な女性声" },
  // 男性ボイス (4)
  { id: "Puck", name: "Puck", gender: "male", description: "活発な男性声" },
  { id: "Charon", name: "Charon", gender: "male", description: "落ち着いた男性声" },
  { id: "Fenrir", name: "Fenrir", gender: "male", description: "力強い男性声" },
  { id: "Orus", name: "Orus", gender: "male", description: "知的な男性声" },
];

// AivisSpeech Voice Options (ローカル・無料) - キャラクター別グループ
const AIVIS_VOICE_GROUPS = [
  {
    name: "まお", gender: "female" as const,
    icon: "https://assets.aivis-project.com/aivm-models/fd0d9420-7eee-40de-826d-7fe16b562e84/speakers/f6c7343c-a7fd-4d42-b0dc-38fe18c6ab7f/icon.jpg",
    styles: [
      { id: "888753760", description: "ノーマル", styleId: 888753760 },
      { id: "888753761", description: "ふつー", styleId: 888753761 },
      { id: "888753762", description: "あまあま", styleId: 888753762 },
      { id: "888753763", description: "おちつき", styleId: 888753763 },
      { id: "888753764", description: "からかい", styleId: 888753764 },
      { id: "888753765", description: "せつなめ", styleId: 888753765 },
    ]
  },
  {
    name: "凛音エル", gender: "female" as const,
    icon: "https://assets.aivis-project.com/aivm-models/9fc6e37f-b8d4-4df5-93e3-30defd0f00ff/speakers/6b0a0fb6-283c-4b7e-928d-37fda7a639bb/icon.jpg",
    styles: [
      { id: "1388823424", description: "ノーマル", styleId: 1388823424 },
      { id: "1388823427", description: "Happy", styleId: 1388823427 },
      { id: "1388823428", description: "Sad", styleId: 1388823428 },
    ]
  },
  {
    name: "るな", gender: "female" as const,
    icon: "https://assets.aivis-project.com/aivm-models/47d21b9f-7543-4574-b16e-0863646b5bbf/speakers/4ed4bd8e-fb79-4c38-999a-3b6f283397a7/icon.jpg",
    styles: [{ id: "345585728", description: "ノーマル", styleId: 345585728 }]
  },
  {
    name: "花音", gender: "female" as const,
    icon: null,
    styles: [{ id: "1325133120", description: "ノーマル", styleId: 1325133120 }]
  },
  {
    name: "阿井田茂", gender: "male" as const,
    icon: "https://assets.aivis-project.com/aivm-models/d799f1c0-59f3-4b6b-9a65-56715776fc69/speakers/50880d3a-d63e-4a31-ae3f-ab14e0c0b3cb/icon.jpg",
    styles: [
      { id: "1310138976", description: "ノーマル", styleId: 1310138976 },
      { id: "1310138977", description: "Calm", styleId: 1310138977 },
      { id: "1310138979", description: "Heavy", styleId: 1310138979 },
      { id: "1310138981", description: "Shout", styleId: 1310138981 },
    ]
  },
  {
    name: "黄金笑", gender: "male" as const,
    icon: null,
    styles: [
      { id: "1618811328", description: "ノーマル", styleId: 1618811328 },
      { id: "1618811330", description: "Positive", styleId: 1618811330 },
    ]
  },
];

// フラット配列（既存コードとの互換性用）
const AIVIS_VOICE_OPTIONS = AIVIS_VOICE_GROUPS.flatMap(group =>
  group.styles.map(style => ({
    id: style.id,
    name: group.name,
    gender: group.gender,
    description: style.description,
    styleId: style.styleId,
  }))
);

// Gemini TTS Models
const GEMINI_TTS_MODELS = [
  { id: "gemini-2.5-flash-preview-tts", name: "Flash Preview", description: "バランス型（デフォルト）" },
  { id: "gemini-2.5-flash-tts", name: "Flash", description: "高速・安定版" },
  { id: "gemini-2.5-pro-tts", name: "Pro", description: "最高品質（低速）" },
  { id: "gemini-2.5-flash-lite-preview-tts", name: "Flash Lite", description: "最速・軽量" },
];

function getVoiceOptionsForProvider(provider: TTSProvider) {
  switch (provider) {
    case "google": return GOOGLE_VOICE_OPTIONS;
    case "elevenlabs": return ELEVENLABS_VOICE_OPTIONS;
    case "gemini": return GEMINI_VOICE_OPTIONS;
    case "aivis": return AIVIS_VOICE_OPTIONS;
    default: return GOOGLE_VOICE_OPTIONS;
  }
}

export default function EditorPage() {
  // Auth & Toast
  const { user } = useAuth();
  const { showToast } = useToast();

  // Video style configuration
  const [styleConfig, setStyleConfig] = useState<VideoStyleConfig>(getDefaultConfig());

  // Resizable columns
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const [isGeneratingCuts, setIsGeneratingCuts] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Script input
  const [script, setScript] = useState("");
  const [videoTitle, setVideoTitle] = useState("新規動画");
  const [themeInput, setThemeInput] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ current: 0, total: 0 });

  // Input mode states
  const [inputMode, setInputMode] = useState<InputMode>("theme");
  const [urlInput, setUrlInput] = useState("");
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [showUrlHistory, setShowUrlHistory] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingFromUrl, setIsGeneratingFromUrl] = useState(false);

  // TTS settings
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("google");  // Geminiクォータ超過時はgoogleに切り替え
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("ja-JP-Wavenet-A");  // メイン話者（Google: A=女性, D=男性）
  const [secondaryVoiceId, setSecondaryVoiceId] = useState<string>("ja-JP-Wavenet-D");  // 第2話者（男性）
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>("gemini-2.5-flash-preview-tts");
  // AivisSpeech用
  const [aivisStyleId, setAivisStyleId] = useState<number>(888753762);  // メイン: まお - あまあま
  const [aivisSecondaryStyleId, setAivisSecondaryStyleId] = useState<number>(1310138976);  // サブ: 阿井田茂 - ノーマル
  const [expandedAivisGroup, setExpandedAivisGroup] = useState<string | null>("まお");  // メイン話者アコーディオン
  const [expandedAivisSecondaryGroup, setExpandedAivisSecondaryGroup] = useState<string | null>("阿井田茂");  // 第2話者アコーディオン

  // Video settings
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("9:16");  // PC用 16:9, スマホ用 9:16
  const [previewAspectRatio, setPreviewAspectRatio] = useState<"16:9" | "9:16">("9:16");  // プレビュー用アスペクト比

  // JSON Check Modal
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [generatedJson, setGeneratedJson] = useState<any>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [dbSaveStatus, setDbSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Image generation
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number | null>(null);
  const [imageModel, setImageModel] = useState<ImageModel>("flash");  // flash=高速, pro=高品質・テキスト対応

  // Project loading
  const [showProjectList, setShowProjectList] = useState(false);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Manual save state
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Reading dictionary modal
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [dictionaryInitialText, setDictionaryInitialText] = useState("");
  const [regeneratingCutId, setRegeneratingCutId] = useState<number | null>(null);

  // Single image generation from CutList
  const [generatingSingleImageCutId, setGeneratingSingleImageCutId] = useState<number | null>(null);

  // Single cut preview modal
  const [previewCutId, setPreviewCutId] = useState<number | null>(null);

  // Marketing framework for ChatGPT script generation
  type MarketingFramework = "AIDMA" | "PASONA" | "QUEST" | "PAS" | "4P";
  const [marketingFramework, setMarketingFramework] = useState<MarketingFramework>("AIDMA");

  // Dialogue mode (single narrator vs two-person dialogue)
  type DialogueMode = "single" | "dialogue";
  const [dialogueMode, setDialogueMode] = useState<DialogueMode>("single");

  // Resize handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    if (isDraggingLeft.current) {
      const newWidth = Math.max(200, Math.min(500, e.clientX - containerRect.left));
      setLeftWidth(newWidth);
    }
    if (isDraggingRight.current) {
      const newWidth = Math.max(200, Math.min(500, containerRect.right - e.clientX));
      setRightWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingLeft.current = false;
    isDraggingRight.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Track if initial load is complete to prevent save on mount
  const initialLoadComplete = useRef(false);

  // LocalStorage persistence - Load on mount
  useEffect(() => {
    try {
      const savedProject = localStorage.getItem("vg_editor_project");
      if (savedProject) {
        const parsed = JSON.parse(savedProject);
        if (parsed.styleConfig) {
          setStyleConfig(parsed.styleConfig);
        }
        if (parsed.videoTitle) {
          setVideoTitle(parsed.videoTitle);
        }
        if (parsed.script) {
          setScript(parsed.script);
        }
        console.log("[Editor] Loaded project from localStorage");
      }
      // Load URL history
      const savedUrlHistory = localStorage.getItem("vg_url_history");
      if (savedUrlHistory) {
        setUrlHistory(JSON.parse(savedUrlHistory));
        console.log("[Editor] Loaded URL history from localStorage");
      }
    } catch (e) {
      console.error("[Editor] Failed to load from localStorage:", e);
      // Clear corrupted data
      try {
        localStorage.removeItem("vg_editor_project");
        console.log("[Editor] Cleared corrupted localStorage data");
      } catch {}
    }
    // Mark initial load as complete after a short delay
    setTimeout(() => {
      initialLoadComplete.current = true;
    }, 500);
  }, []);

  // Helper: Upload base64 image to Supabase and return URL
  const uploadBase64ToSupabase = useCallback(async (base64: string): Promise<string> => {
    if (!base64 || !base64.startsWith('data:image')) {
      return '';
    }
    try {
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, userId: 'editor' }),
      });
      if (!response.ok) {
        console.error('[Editor] Failed to upload image to Supabase');
        return '';
      }
      const data = await response.json();
      return data.url || '';
    } catch (e) {
      console.error('[Editor] Upload error:', e);
      return '';
    }
  }, []);

  // LocalStorage persistence - Save on change (upload base64 to Supabase first)
  useEffect(() => {
    // Skip save during initial load to prevent quota exceeded on corrupted data
    if (!initialLoadComplete.current) return;

    // Only save if we have actual content
    if (styleConfig.cuts.length > 0 && styleConfig.cuts.some(cut => cut.subtitle || cut.voiceText)) {
      const saveToLocalStorage = async () => {
        try {
          // Upload base64 images to Supabase, keep existing Supabase URLs as-is
          const processedCuts = await Promise.all(styleConfig.cuts.map(async (cut) => {
            const isBase64Image = (url?: string) => url?.startsWith('data:image');
            const isCloudUrl = (url?: string) => url?.startsWith('https://');

            return {
              ...cut,
              // Upload base64 images to Supabase, keep cloud URLs
              imageUrl: isCloudUrl(cut.imageUrl) ? cut.imageUrl :
                        isBase64Image(cut.imageUrl) ? await uploadBase64ToSupabase(cut.imageUrl!) : '',
              imageUrl16x9: isCloudUrl(cut.imageUrl16x9) ? cut.imageUrl16x9 :
                            isBase64Image(cut.imageUrl16x9) ? await uploadBase64ToSupabase(cut.imageUrl16x9!) : '',
              imageUrl9x16: isCloudUrl(cut.imageUrl9x16) ? cut.imageUrl9x16 :
                            isBase64Image(cut.imageUrl9x16) ? await uploadBase64ToSupabase(cut.imageUrl9x16!) : '',
              // Don't store base64 audio in localStorage
              voiceUrl: cut.voiceUrl?.startsWith('data:') ? '' : cut.voiceUrl,
            };
          }));

          // Check if any uploads happened (URLs changed from base64)
          const hasUploads = processedCuts.some((cut, i) => {
            const original = styleConfig.cuts[i];
            return (cut.imageUrl !== original.imageUrl && cut.imageUrl?.startsWith('https://')) ||
                   (cut.imageUrl16x9 !== original.imageUrl16x9 && cut.imageUrl16x9?.startsWith('https://')) ||
                   (cut.imageUrl9x16 !== original.imageUrl9x16 && cut.imageUrl9x16?.startsWith('https://'));
          });

          // Update state with uploaded URLs to avoid re-uploading
          if (hasUploads) {
            setStyleConfig(prev => ({ ...prev, cuts: processedCuts }));
            console.log('[Editor] Updated state with Supabase URLs');
          }

          const projectData = {
            styleConfig: { ...styleConfig, cuts: processedCuts },
            videoTitle,
            script,
            savedAt: new Date().toISOString(),
          };

          const jsonString = JSON.stringify(projectData);
          // Only save if data is under 4MB (localStorage limit is ~5MB)
          if (jsonString.length < 4 * 1024 * 1024) {
            localStorage.setItem("vg_editor_project", jsonString);
            console.log(`[Editor] Auto-saved project to localStorage (${(jsonString.length / 1024).toFixed(1)}KB)`);
          } else {
            console.warn(`[Editor] Project data too large (${(jsonString.length / 1024 / 1024).toFixed(1)}MB), skipping save`);
          }
        } catch (e: any) {
          // Handle quota exceeded error gracefully
          if (e.name === 'QuotaExceededError') {
            console.warn("[Editor] LocalStorage quota exceeded, clearing old data");
            try {
              localStorage.removeItem("vg_editor_project");
            } catch {}
          } else {
            console.error("[Editor] Failed to save to localStorage:", e);
          }
        }
      };

      // Debounce the save to avoid too many upload operations
      const timeoutId = setTimeout(saveToLocalStorage, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [styleConfig, videoTitle, script, uploadBase64ToSupabase]);

  // Close URL history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUrlHistory) {
        const target = e.target as HTMLElement;
        if (!target.closest('.url-history-container')) {
          setShowUrlHistory(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUrlHistory]);

  // Helper: Convert API scenes to CutConfig array
  const convertScenesToCuts = useCallback((scenes: any[], totalDuration: number): CutConfig[] => {
    const imageEffectMap: Record<string, ImageEffect> = {
      zoomIn: "zoomIn", zoomOut: "zoomOut", panLeft: "panLeft", panRight: "panRight", static: "static",
    };
    const textAnimationMap: Record<string, TextAnimation> = {
      typewriter: "typewriter", fadeIn: "fadeIn", slideUp: "slideUp", bounce: "bounce", none: "none",
    };
    const transitionMap: Record<string, SceneTransition> = {
      fade: "fade", slide: "slide", zoom: "zoom", cut: "cut", dissolve: "dissolve", wipe: "fade",
    };

    let currentTime = 0;
    return scenes.map((scene, index) => {
      const sceneDuration = scene.duration || Math.ceil(totalDuration / scenes.length);
      const startTime = currentTime;
      const endTime = currentTime + sceneDuration;
      currentTime = endTime;

      const mainText = scene.main_text ? {
        type: scene.main_text.type || "title",
        lines: scene.main_text.lines || [],
      } : undefined;

      const images = (scene.image_prompts || [scene.image_prompt]).filter(Boolean).map((prompt: string, i: number) => ({
        id: `img-cut-${index}-${i}`,
        source: "generated" as const,
        prompt,
      }));

      return {
        id: index,
        startTime,
        endTime,
        mainText,
        subtitle: scene.subtitle || "",
        voiceText: scene.voice_text || scene.avatar_script || "",
        voiceStyle: scene.voice_style || "",
        speaker: scene.speaker || "narrator",
        voiceId: scene.voice_id || "",
        images: images.length > 0 ? images : [],
        imagePrompt: scene.image_prompts?.[0] || scene.image_prompt || "",
        imageUrl: scene.imageUrl || "",
        voiceUrl: scene.audioUrl || "",
        assets: scene.assets || [],  // アセット（図形・アイコン・テキスト・Lottie・SVG）
        imageEffect: imageEffectMap[scene.image_effect] || "zoomIn",
        textAnimation: textAnimationMap[scene.text_animation] || "typewriter",
        transition: transitionMap[scene.transition] || "fade",
      };
    });
  }, []);

  // Save to Supabase
  const saveToSupabase = useCallback(async (scriptData: any, title: string, themeOrUrl: string, inputType: "theme" | "url") => {
    if (!user?.id) {
      console.log("[Editor] No user logged in, skipping Supabase save");
      return null;
    }

    setIsSavingToDb(true);
    setDbSaveStatus("saving");

    try {
      const response = await fetch("/api/vg-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: title,
          theme_text: inputType === "theme" ? themeOrUrl : undefined,
          url_input: inputType === "url" ? themeOrUrl : undefined,
          settings: {
            ttsProvider,
            selectedVoiceId,
            generationMode: "auto",
          },
        }),
      });

      const data = await response.json();
      if (data.project?.id) {
        // Update project with scenes
        await fetch("/api/vg-projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: data.project.id,
            userId: user.id,
            updates: {
              scenes: scriptData.scenes,
              status: "draft",
              generation_step: "script",
            },
          }),
        });

        setCurrentProjectId(data.project.id);
        setDbSaveStatus("saved");
        console.log("[Editor] Saved to Supabase:", data.project.id);
        return data.project.id;
      }
    } catch (error) {
      console.error("[Editor] Failed to save to Supabase:", error);
      setDbSaveStatus("error");
    } finally {
      setIsSavingToDb(false);
    }
    return null;
  }, [user, ttsProvider, selectedVoiceId]);

  // Save current project state to Supabase (for preserving generated audio/images)
  const saveCurrentProjectToSupabase = useCallback(async (cutsOverride?: CutConfig[]) => {
    if (!user?.id || !currentProjectId) {
      console.log("[Editor] Cannot save: no user or project ID");
      return false;
    }

    const cutsToSave = cutsOverride || styleConfig.cuts;

    try {
      // Convert cuts to scenes format for storage
      const scenesToSave = cutsToSave.map((cut) => ({
        duration: cut.endTime - cut.startTime,
        subtitle: cut.subtitle || "",
        voice_text: cut.voiceText || "",
        voice_style: cut.voiceStyle || "",
        speaker: cut.speaker || "narrator",
        voice_id: cut.voiceId || "",
        image_prompt: cut.imagePrompt || "",
        image_effect: cut.imageEffect || "zoomIn",
        text_animation: cut.textAnimation || "typewriter",
        transition: cut.transition || "fade",
        main_text: cut.mainText,
        images: cut.images,
        assets: cut.assets || [],  // アセット（図形・アイコン・テキスト・Lottie・SVG）
        // Preserve generated URLs - 全てのアスペクト比の画像URLを保存
        imageUrl: cut.imageUrl || "",
        imageUrl16x9: cut.imageUrl16x9 || "",  // PC用画像
        imageUrl9x16: cut.imageUrl9x16 || "",  // スマホ用画像
        audioUrl: cut.voiceUrl || "",
      }));

      const response = await fetch("/api/vg-projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProjectId,
          userId: user.id,
          updates: {
            scenes: scenesToSave,
            title: videoTitle,
            settings: {
              ttsProvider,
              selectedVoiceId,
              generationMode: "auto",
            },
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log("[Editor] Project saved with generated assets");
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Editor] Failed to save project:", error);
      return false;
    }
  }, [user, currentProjectId, styleConfig.cuts, videoTitle, ttsProvider, selectedVoiceId]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (!currentProjectId) {
      showToast("保存するプロジェクトがありません。まず台本を生成してください。", "warning");
      return;
    }

    setIsSavingProject(true);
    try {
      const success = await saveCurrentProjectToSupabase();
      if (success) {
        setLastSavedAt(new Date());
        showToast("プロジェクトを保存しました", "success");
      } else {
        showToast("保存に失敗しました", "error");
      }
    } finally {
      setIsSavingProject(false);
    }
  }, [currentProjectId, saveCurrentProjectToSupabase]);

  // Load projects from Supabase
  const loadProjectsFromSupabase = useCallback(async () => {
    if (!user?.id) {
      showToast("プロジェクトを読み込むにはログインが必要です", "warning");
      return;
    }

    setIsLoadingProjects(true);
    try {
      const response = await fetch(`/api/vg-projects?userId=${user.id}&limit=20`);
      const data = await response.json();

      if (data.projects) {
        setSavedProjects(data.projects);
        setShowProjectList(true);
        console.log(`[Editor] Loaded ${data.projects.length} projects`);
      }
    } catch (error) {
      console.error("[Editor] Failed to load projects:", error);
      showToast("プロジェクトの読み込みに失敗しました", "error");
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  // Migrate old scene format to new CutConfig format
  const migrateSceneToCurrentFormat = useCallback((scene: any, index: number, totalDuration: number, sceneCount: number): CutConfig => {
    const sceneDuration = scene.duration || Math.ceil(totalDuration / sceneCount);
    const startTime = index === 0 ? 0 : -1; // Will be recalculated

    const imageEffectMap: Record<string, ImageEffect> = {
      zoomIn: "zoomIn", zoomOut: "zoomOut", panLeft: "panLeft", panRight: "panRight", static: "static",
      "zoom-in": "zoomIn", "zoom-out": "zoomOut", "pan-left": "panLeft", "pan-right": "panRight",
    };
    const textAnimationMap: Record<string, TextAnimation> = {
      typewriter: "typewriter", fadeIn: "fadeIn", slideUp: "slideUp", bounce: "bounce", none: "none",
      "fade-in": "fadeIn", "slide-up": "slideUp",
    };
    const transitionMap: Record<string, SceneTransition> = {
      fade: "fade", slide: "slide", zoom: "zoom", cut: "cut", dissolve: "dissolve", wipe: "fade",
    };

    const mainText = scene.main_text ? {
      type: scene.main_text.type || "title",
      lines: scene.main_text.lines || [],
    } : undefined;

    const images = (scene.image_prompts || [scene.image_prompt || scene.imagePrompt]).filter(Boolean).map((prompt: string, i: number) => ({
      id: `img-migrated-${index}-${i}`,
      source: "generated" as const,
      prompt,
    }));

    return {
      id: index,
      startTime: 0, // Will be recalculated
      endTime: sceneDuration,
      mainText,
      subtitle: scene.subtitle || "",
      voiceText: scene.voice_text || scene.voiceText || scene.avatar_script || scene.narration || "",
      voiceStyle: scene.voice_style || scene.voiceStyle || "",
      speaker: scene.speaker || "narrator",
      voiceId: scene.voice_id || scene.voiceId || "",
      images: images.length > 0 ? images : [],
      imagePrompt: scene.image_prompts?.[0] || scene.image_prompt || scene.imagePrompt || "",
      imageUrl: scene.imageUrl || scene.image_url || "",
      imageUrl16x9: scene.imageUrl16x9 || scene.image_url_16x9 || "",
      imageUrl9x16: scene.imageUrl9x16 || scene.image_url_9x16 || "",
      voiceUrl: scene.audioUrl || scene.audio_url || "",
      imageEffect: imageEffectMap[scene.image_effect || scene.imageEffect] || "zoomIn",
      textAnimation: textAnimationMap[scene.text_animation || scene.textAnimation] || "typewriter",
      transition: transitionMap[scene.transition] || "fade",
    };
  }, []);

  // Load a specific project
  const loadProject = useCallback(async (project: any) => {
    console.log("[Editor] Loading project:", project.id, project.title);

    // Update title
    setVideoTitle(project.title || "読み込んだプロジェクト");

    // 一覧からはscenesが除外されているので、必要なら詳細を取得
    let scenes = project.scenes || [];
    if (scenes.length === 0 && user?.id) {
      console.log("[Editor] Fetching full project data...");
      try {
        const res = await fetch(`/api/vg-projects?userId=${user.id}&projectId=${project.id}`);
        const data = await res.json();
        if (data.project?.scenes) {
          scenes = data.project.scenes;
          console.log(`[Editor] Loaded ${scenes.length} scenes from API`);
        }
      } catch (err) {
        console.error("[Editor] Failed to fetch project details:", err);
      }
    }

    const totalDuration = project.total_duration || scenes.reduce((sum: number, s: any) => sum + (s.duration || 7), 0) || 60;

    if (scenes.length === 0) {
      showToast("このプロジェクトにはシーンデータがありません", "warning");
      setShowProjectList(false);
      return;
    }

    // Migrate scenes to current format
    const newCuts: CutConfig[] = [];
    let currentTime = 0;

    for (let i = 0; i < scenes.length; i++) {
      const cut = migrateSceneToCurrentFormat(scenes[i], i, totalDuration, scenes.length);
      cut.startTime = currentTime;
      cut.endTime = currentTime + (scenes[i].duration || Math.ceil(totalDuration / scenes.length));
      currentTime = cut.endTime;
      newCuts.push(cut);
    }

    // Calculate average scene duration
    const avgSceneDuration = Math.round(currentTime / newCuts.length);

    // Update style config
    setStyleConfig((prev) => ({
      ...prev,
      totalDuration: currentTime,
      sceneDuration: avgSceneDuration,
      cuts: newCuts,
    }));

    // Combine voice text for script display
    const fullScript = scenes
      .map((s: any) => s.voice_text || s.avatar_script || s.narration || s.subtitle)
      .filter(Boolean)
      .join("\n");
    setScript(fullScript);

    // Set current project
    setCurrentProjectId(project.id);
    setShowProjectList(false);

    console.log(`[Editor] Loaded ${newCuts.length} scenes from project`);
    showToast(`プロジェクト「${project.title}」を読み込みました (${newCuts.length}シーン)`, "success");
  }, [migrateSceneToCurrentFormat, user]);

  const startDragLeft = () => {
    isDraggingLeft.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const startDragRight = () => {
    isDraggingRight.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Initialize cuts when duration changes
  useEffect(() => {
    if (styleConfig.cuts.length === 0) {
      const cuts = generateUniformCuts(
        styleConfig.totalDuration,
        styleConfig.sceneDuration,
        styleConfig.imageEffect,
        styleConfig.transition,
        styleConfig.textAnimation
      );
      setStyleConfig((prev) => ({ ...prev, cuts }));
    }
  }, []);

  // Update cuts when duration settings change
  const handleConfigChange = useCallback((newConfig: VideoStyleConfig) => {
    const oldCutCount = calculateCutCount(
      styleConfig.totalDuration,
      styleConfig.sceneDuration
    );
    const newCutCount = calculateCutCount(
      newConfig.totalDuration,
      newConfig.sceneDuration
    );

    // If cut count changed, regenerate cuts
    if (oldCutCount !== newCutCount) {
      const cuts = generateUniformCuts(
        newConfig.totalDuration,
        newConfig.sceneDuration,
        newConfig.imageEffect,
        newConfig.transition,
        newConfig.textAnimation
      );
      newConfig.cuts = cuts;
    }

    setStyleConfig(newConfig);
  }, [styleConfig]);

  // Generate cuts with AI (style only)
  const handleGenerateCuts = async (styleKeyword: string) => {
    setIsGeneratingCuts(true);
    try {
      const response = await fetch("/api/generate-cuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalDuration: styleConfig.totalDuration,
          sceneDuration: styleConfig.sceneDuration,
          styleKeyword,
          defaultImageEffect: styleConfig.imageEffect,
          defaultTransition: styleConfig.transition,
          defaultTextAnimation: styleConfig.textAnimation,
        }),
      });

      const data = await response.json();

      if (data.success && data.cuts) {
        // Preserve existing content when regenerating cuts
        const newCuts = data.cuts.map((cut: CutConfig, index: number) => ({
          ...cut,
          subtitle: styleConfig.cuts[index]?.subtitle || cut.subtitle,
          imagePrompt: styleConfig.cuts[index]?.imagePrompt || cut.imagePrompt,
        }));
        setStyleConfig((prev) => ({ ...prev, cuts: newCuts }));
      } else {
        console.error("Failed to generate cuts:", data.error);
      }
    } catch (error) {
      console.error("Error generating cuts:", error);
    } finally {
      setIsGeneratingCuts(false);
    }
  };

  // Split script into scenes with AI
  const handleSplitScript = async () => {
    if (!script.trim()) return;

    setIsGeneratingContent(true);
    try {
      const cutCount = calculateCutCount(styleConfig.totalDuration, styleConfig.sceneDuration);

      const response = await fetch("/api/split-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.trim(),
          cutCount,
          styleKeyword: "ビジネス解説動画",
        }),
      });

      const data = await response.json();

      if (data.success && data.scenes) {
        // Update cuts with generated content
        setStyleConfig((prev) => ({
          ...prev,
          cuts: prev.cuts.map((cut, index) => {
            const scene = data.scenes[index];
            if (scene) {
              // 画像のマッピング
              const images = scene.imagePrompt ? [{
                id: `img-${cut.id}-0`,
                source: "generated" as const,
                prompt: scene.imagePrompt,
              }] : cut.images;

              return {
                ...cut,
                subtitle: scene.subtitle || cut.subtitle,
                voiceText: scene.subtitle || cut.voiceText, // 字幕を音声テキストにも
                images,
                imagePrompt: scene.imagePrompt || cut.imagePrompt,
              };
            }
            return cut;
          }),
        }));
      } else {
        console.error("Failed to split script:", data.error);
      }
    } catch (error) {
      console.error("Error splitting script:", error);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Generate script from theme using ChatGPT with marketing frameworks
  const handleGenerateScript = async () => {
    if (!themeInput.trim()) return;

    setIsGeneratingScript(true);
    setDbSaveStatus("idle");
    try {
      // Use ChatGPT API with marketing framework and dialogue mode
      const response = await fetch("/api/generate-script-chatgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: themeInput.trim(),
          duration: styleConfig.totalDuration,
          framework: marketingFramework,
          model: "gpt-4o",
          tone: "professional",
          dialogueMode: dialogueMode,
        }),
      });

      const data = await response.json();

      if (data.success && data.script) {
        const scriptData = data.script;

        // Log cost info
        if (data.usage) {
          console.log(`[ChatGPT] Cost: $${data.usage.estimatedCostUSD?.toFixed(4)} (≈¥${data.usage.estimatedCostJPY?.toFixed(0)})`);
        }

        // Store JSON for inspection
        setGeneratedJson(scriptData);
        setShowJsonModal(true);

        // Update title
        if (scriptData.title) {
          setVideoTitle(scriptData.title);
        }

        // Combine script for display (support both ChatGPT and Gemini formats)
        const fullScript = scriptData.scenes
          ?.map((s: any) => s.voiceText || s.avatar_script || s.voice_text || s.narration || s.subtitle)
          .join("\n") || scriptData.script || "";
        setScript(fullScript);

        // ★ CRITICAL: Create NEW cuts based on actual scene count
        // Normalize ChatGPT format to match expected format
        const normalizedScenes = scriptData.scenes?.map((s: any) => ({
          ...s,
          avatar_script: s.voiceText || s.avatar_script || s.voice_text,
          voice_text: s.voiceText || s.voice_text,
          voice_style: s.voiceStyle || s.voice_style,
          image_prompt: s.imagePrompt || s.image_prompt,
          image_effect: s.imageEffect || s.image_effect || "zoomIn",
          text_animation: s.textAnimation || s.text_animation || "typewriter",
        }));

        if (normalizedScenes && Array.isArray(normalizedScenes)) {
          const newCuts = convertScenesToCuts(normalizedScenes, scriptData.totalDuration || scriptData.total_duration || styleConfig.totalDuration);
          const newTotalDuration = scriptData.totalDuration || scriptData.total_duration || newCuts.reduce((sum, cut) => sum + (cut.endTime - cut.startTime), 0);
          // Calculate average scene duration for settings sync
          const avgSceneDuration = Math.round(newTotalDuration / newCuts.length);

          setStyleConfig((prev) => ({
            ...prev,
            totalDuration: newTotalDuration,
            sceneDuration: avgSceneDuration,
            cuts: newCuts,
          }));

          console.log(`[Editor] Created ${newCuts.length} cuts from ${normalizedScenes.length} scenes (avg: ${avgSceneDuration}s, framework: ${marketingFramework})`);
        }

        // Save to Supabase
        await saveToSupabase(scriptData, scriptData.title || videoTitle, themeInput.trim(), "theme");
      } else {
        console.error("Failed to generate script:", data.error);
        showToast("台本生成に失敗しました: " + (data.error || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Error generating script:", error);
      showToast("台本生成中にエラーが発生しました", "error");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Generate script from URL (using ChatGPT with framework + dialogue mode)
  const handleGenerateFromUrl = async () => {
    if (!urlInput.trim()) {
      showToast("URLを入力してください", "warning");
      return;
    }

    // Normalize URL
    let normalizedUrl = urlInput.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Save URL to history (deduplicated, max 20 items)
    const saveUrlToHistory = (url: string) => {
      const newHistory = [url, ...urlHistory.filter(u => u !== url)].slice(0, 20);
      setUrlHistory(newHistory);
      localStorage.setItem("vg_url_history", JSON.stringify(newHistory));
      console.log("[Editor] Saved URL to history:", url);
    };

    setIsGeneratingFromUrl(true);
    setDbSaveStatus("idle");
    try {
      // Save URL to history at the start
      saveUrlToHistory(normalizedUrl);
      // Step 1: Extract content from URL
      console.log(`[URL] Extracting content from: ${normalizedUrl}`);
      const extractResponse = await fetch("/api/extract-url-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const extractData = await extractResponse.json();

      if (!extractData.success) {
        throw new Error(extractData.error || "Failed to extract URL content");
      }

      // Build URL content summary for ChatGPT
      const urlContentSummary = `
【タイトル】${extractData.analysis?.title || extractData.rawContent?.title || ""}
【説明】${extractData.analysis?.description || ""}
【特徴】${(extractData.analysis?.keyPoints || []).join(", ")}
【ターゲット】${extractData.analysis?.targetAudience || ""}
【USP】${(extractData.analysis?.uniqueSellingPoints || []).join(", ")}
【CTA】${extractData.analysis?.callToAction || ""}
`;

      // Step 2: Generate script using ChatGPT with extracted content
      const response = await fetch("/api/generate-script-chatgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: extractData.analysis?.title || normalizedUrl,
          targetAudience: extractData.analysis?.targetAudience || "一般消費者",
          duration: styleConfig.totalDuration,
          framework: marketingFramework,
          model: "gpt-4o",
          tone: "professional",
          dialogueMode: dialogueMode,
          urlContent: urlContentSummary,
        }),
      });

      const data = await response.json();

      if (data.success && data.script) {
        const scriptData = data.script;

        // Log cost info
        if (data.usage) {
          console.log(`[ChatGPT] Cost: $${data.usage.estimatedCostUSD?.toFixed(4)} (≈¥${data.usage.estimatedCostJPY?.toFixed(0)})`);
        }

        // Store JSON for inspection
        setGeneratedJson(scriptData);
        setShowJsonModal(true);

        // Update title
        if (scriptData.title) {
          setVideoTitle(scriptData.title);
        }

        // Combine script for display (support both ChatGPT and Gemini formats)
        const fullScript = scriptData.scenes
          ?.map((s: any) => s.voiceText || s.avatar_script || s.voice_text || s.narration || s.subtitle)
          .join("\n") || scriptData.script || "";
        setScript(fullScript);

        // ★ CRITICAL: Normalize ChatGPT format
        const normalizedScenes = scriptData.scenes?.map((s: any) => ({
          ...s,
          avatar_script: s.voiceText || s.avatar_script || s.voice_text,
          voice_text: s.voiceText || s.voice_text,
          voice_style: s.voiceStyle || s.voice_style,
          image_prompt: s.imagePrompt || s.image_prompt,
          image_effect: s.imageEffect || s.image_effect || "zoomIn",
          text_animation: s.textAnimation || s.text_animation || "typewriter",
        }));

        if (normalizedScenes && Array.isArray(normalizedScenes)) {
          const newCuts = convertScenesToCuts(normalizedScenes, scriptData.totalDuration || scriptData.total_duration || styleConfig.totalDuration);
          const newTotalDuration = scriptData.totalDuration || scriptData.total_duration || newCuts.reduce((sum, cut) => sum + (cut.endTime - cut.startTime), 0);
          const avgSceneDuration = Math.round(newTotalDuration / newCuts.length);

          setStyleConfig((prev) => ({
            ...prev,
            totalDuration: newTotalDuration,
            sceneDuration: avgSceneDuration,
            cuts: newCuts,
          }));

          console.log(`[Editor] Created ${newCuts.length} cuts from ${normalizedScenes.length} scenes (URL, framework: ${marketingFramework}, dialogue: ${dialogueMode})`);
        }

        // Save to Supabase
        await saveToSupabase(scriptData, scriptData.title || videoTitle, normalizedUrl, "url");
      } else {
        console.error("Failed to generate script from URL:", data.error);
        showToast("URLからの台本生成に失敗しました: " + (data.error || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Error generating script from URL:", error);
      showToast("URLからの台本生成中にエラーが発生しました", "error");
    } finally {
      setIsGeneratingFromUrl(false);
    }
  };

  // Handle voice recording completion
  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.text) {
        setTranscribedText(data.text);
        // Also set as theme input for generation
        setThemeInput(data.text);
      } else {
        showToast("音声の文字起こしに失敗しました: " + (data.error || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      showToast("文字起こし中にエラーが発生しました", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate from transcribed text
  const handleGenerateFromVoice = async () => {
    if (!transcribedText.trim()) {
      showToast("音声を録音してください", "warning");
      return;
    }
    // Use the transcribed text as theme
    setThemeInput(transcribedText);
    setInputMode("theme");
    // Trigger generation
    setTimeout(() => {
      handleGenerateScript();
    }, 100);
  };

  // Update single cut
  const handleUpdateCut = useCallback(
    (cutId: number, updates: Partial<CutConfig>) => {
      setStyleConfig((prev) => ({
        ...prev,
        cuts: updateCut(prev.cuts, cutId, updates),
      }));
    },
    []
  );

  // Update all cuts
  const handleUpdateAllCuts = useCallback((updates: Partial<CutConfig>) => {
    setStyleConfig((prev) => ({
      ...prev,
      cuts: updateAllCuts(prev.cuts, updates),
    }));
  }, []);

  // Load custom dictionary from localStorage
  const getCustomDictionary = () => {
    try {
      const saved = localStorage.getItem("reading-dictionary-custom");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  // Generate audio for all scenes using batch API with timesheet
  // タイムシート方式：全音声を一括生成→実際の尺でタイムシート作成→ギャップなし
  const handleGenerateAudio = async () => {
    console.log("[Editor] handleGenerateAudio called");
    console.log("[Editor] Total cuts:", styleConfig.cuts.length);
    console.log("[Editor] Cuts with voiceText:", styleConfig.cuts.filter(c => c.voiceText?.trim()).length);
    console.log("[Editor] Cuts with voiceUrl:", styleConfig.cuts.filter(c => c.voiceUrl).length);

    const cutsNeedingAudio = styleConfig.cuts.filter(cut =>
      cut.voiceText && cut.voiceText.trim() && !cut.voiceUrl
    );
    console.log("[Editor] Cuts needing audio:", cutsNeedingAudio.length);

    if (cutsNeedingAudio.length === 0) {
      showToast("音声が必要なシーンがありません（全て生成済みまたはテキストなし）", "info");
      return;
    }

    setIsGeneratingAudio(true);
    setAudioProgress({ current: 0, total: cutsNeedingAudio.length });

    // Get custom dictionary entries
    const customDictionary = getCustomDictionary();

    try {
      // Prepare scenes for batch generation
      const scenesForBatch = styleConfig.cuts
        .filter(cut => cut.voiceText && cut.voiceText.trim() && !cut.voiceUrl)
        .map(cut => ({
          id: cut.id,
          text: cut.voiceText!,
          voiceStyle: cut.voiceStyle,
          speaker: cut.speaker
        }));

      console.log(`[Editor] Starting batch audio generation for ${scenesForBatch.length} scenes`);

      // Call batch API to generate all audio and get timesheet
      const response = await fetch("/api/generate-audio-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: scenesForBatch,
          voiceConfig: {
            provider: ttsProvider,
            voice: selectedVoiceId,
            secondaryVoice: secondaryVoiceId,
            model: ttsProvider === "gemini" ? selectedGeminiModel : undefined,
            // AivisSpeech用
            styleId: ttsProvider === "aivis" ? aivisStyleId : undefined,
            secondaryStyleId: ttsProvider === "aivis" ? aivisSecondaryStyleId : undefined,
          },
          customDictionary,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Batch audio generation failed");
      }

      console.log(`[Editor] Batch complete! Total duration: ${result.totalDuration.toFixed(2)}s`);

      // Build updated cuts using timesheet data
      // タイムシートに基づいて全カットの時間を再計算（ギャップなし）
      const updatedCuts = [...styleConfig.cuts];
      const timesheetMap = new Map(result.timesheet.map((entry: any) => [entry.id, entry]));

      // First pass: update cuts that have new audio
      for (const entry of result.timesheet) {
        const cutIndex = updatedCuts.findIndex(c => c.id === entry.id);
        if (cutIndex !== -1) {
          updatedCuts[cutIndex] = {
            ...updatedCuts[cutIndex],
            voiceUrl: entry.audioUrl,
          };
        }
      }

      // Second pass: recalculate all timings based on actual audio durations
      // 全カットの時間を音声の実際の尺に基づいて再計算
      let currentTime = 0;
      for (let i = 0; i < updatedCuts.length; i++) {
        const cut = updatedCuts[i];
        const timesheetEntry = timesheetMap.get(cut.id) as { duration: number; audioUrl: string } | undefined;

        // Use actual audio duration if available, otherwise use existing duration
        const duration = timesheetEntry
          ? timesheetEntry.duration
          : (cut.endTime - cut.startTime);

        updatedCuts[i] = {
          ...cut,
          startTime: currentTime,
          endTime: currentTime + duration,
        };

        currentTime += duration; // 次のシーンは即座に開始（ギャップなし）
      }

      setStyleConfig(prev => ({ ...prev, cuts: updatedCuts }));
      setAudioProgress({ current: scenesForBatch.length, total: scenesForBatch.length });

      // Auto-save to Supabase after generation
      if (currentProjectId) {
        await saveCurrentProjectToSupabase(updatedCuts);
        console.log("[Editor] Auto-saved after audio generation");
      }

      showToast(`音声生成完了: ${result.timesheet.length} シーン（総尺: ${result.totalDuration.toFixed(1)}秒）`, "success");
    } catch (error) {
      console.error("Audio generation error:", error);
      showToast("音声生成中にエラーが発生しました", "error");
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgress({ current: 0, total: 0 });
    }
  };

  // Regenerate audio for a single cut
  const handleRegenerateSingleAudio = async (cutId: number) => {
    const cutIndex = styleConfig.cuts.findIndex(c => c.id === cutId);
    if (cutIndex === -1) return;

    const cut = styleConfig.cuts[cutIndex];
    if (!cut.voiceText || !cut.voiceText.trim()) {
      showToast("音声テキストがありません", "warning");
      return;
    }

    setRegeneratingCutId(cutId);
    setIsGeneratingAudio(true);
    setAudioProgress({ current: 0, total: 1 });

    const customDictionary = getCustomDictionary();
    // カット固有のvoiceIdがあればそれを使用、なければ話者タイプで判定
    const isSecondaryVoice = ["customer", "guest", "interviewee", "speaker2"].includes(cut.speaker || "");
    const voiceToUse = cut.voiceId || (isSecondaryVoice ? secondaryVoiceId : selectedVoiceId);

    try {
      setAudioProgress({ current: 1, total: 1 });
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cut.voiceText,
          config: {
            provider: ttsProvider,
            voice: voiceToUse,
            style: cut.voiceStyle,
            model: ttsProvider === "gemini" ? selectedGeminiModel : undefined,
            // AivisSpeech用
            styleId: ttsProvider === "aivis" ? (isSecondaryVoice ? aivisSecondaryStyleId : aivisStyleId) : undefined,
          },
          customDictionary,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        const updatedCuts = [...styleConfig.cuts];
        // Update voiceUrl and adjust duration based on actual audio length
        const audioDuration = data.duration || (updatedCuts[cutIndex].endTime - updatedCuts[cutIndex].startTime);
        const newEndTime = updatedCuts[cutIndex].startTime + audioDuration + 0.3;
        updatedCuts[cutIndex] = {
          ...updatedCuts[cutIndex],
          voiceUrl: data.audioUrl,
          endTime: newEndTime
        };
        // Shift subsequent cuts to maintain continuity
        for (let j = cutIndex + 1; j < updatedCuts.length; j++) {
          const prevEnd = updatedCuts[j - 1].endTime;
          const currentDuration = updatedCuts[j].endTime - updatedCuts[j].startTime;
          updatedCuts[j] = {
            ...updatedCuts[j],
            startTime: prevEnd,
            endTime: prevEnd + currentDuration
          };
        }
        setStyleConfig(prev => ({ ...prev, cuts: updatedCuts }));

        // Auto-save
        if (currentProjectId) {
          await saveCurrentProjectToSupabase(updatedCuts);
        }
        showToast(`シーン #${cutId} の音声を再生成しました`, "success");
      } else {
        showToast("音声生成に失敗しました", "error");
      }
    } catch (error) {
      console.error(`Failed to regenerate audio for cut ${cutId}:`, error);
      showToast("音声生成中にエラーが発生しました", "error");
    } finally {
      setRegeneratingCutId(null);
      setIsGeneratingAudio(false);
      setAudioProgress({ current: 0, total: 0 });
    }
  };

  // Generate images for all scenes (3 images in parallel)
  const handleGenerateImages = async () => {
    // Find cuts that need image generation (have prompt but no image yet)
    const cutsToGenerate: { index: number; prompt: string }[] = [];

    styleConfig.cuts.forEach((cut, index) => {
      const prompt = cut.imagePrompt || (cut.images && cut.images[0]?.prompt);
      if (prompt && prompt.trim() && !cut.imageUrl) {
        cutsToGenerate.push({ index, prompt: prompt.trim() });
      }
    });

    if (cutsToGenerate.length === 0) {
      showToast("生成が必要なシーンがありません", "info");
      return;
    }

    setIsGeneratingImages(true);
    setImageProgress({ current: 0, total: cutsToGenerate.length });

    const CONCURRENT_LIMIT = 3; // 3枚同時生成
    const updatedCuts = [...styleConfig.cuts];
    let completedCount = 0;

    try {
      // Process in batches of 3
      for (let batchStart = 0; batchStart < cutsToGenerate.length; batchStart += CONCURRENT_LIMIT) {
        const batch = cutsToGenerate.slice(batchStart, batchStart + CONCURRENT_LIMIT);

        // Set first index in current batch as generating indicator
        setCurrentGeneratingIndex(batch[0].index);

        console.log(`[Editor] Generating batch: scenes ${batch.map(b => b.index + 1).join(", ")}`);

        // Generate all images in this batch concurrently (both aspect ratios)
        const batchPromises = batch.map(async ({ index, prompt }) => {
          try {
            const response = await fetch("/api/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt,
                userId: user?.id || "anonymous",
                model: imageModel,  // flash=高速, pro=高品質・テキスト対応
                aspectRatio,  // 現在のアスペクト比
                generateBoth: true,  // 両方のアスペクト比を生成
              }),
            });

            const data = await response.json();
            if (response.ok && data.imageUrl) {
              return {
                index,
                imageUrl: data.imageUrl,
                imageUrl16x9: data.imageUrl16x9 || null,
                imageUrl9x16: data.imageUrl9x16 || null,
                success: true
              };
            } else {
              console.error(`Failed to generate image for scene ${index + 1}:`, data.error || data.details || "Unknown error");
              return { index, imageUrl: null, imageUrl16x9: null, imageUrl9x16: null, success: false };
            }
          } catch (error) {
            console.error(`Failed to generate image for scene ${index + 1}:`, error);
            return { index, imageUrl: null, imageUrl16x9: null, imageUrl9x16: null, success: false };
          }
        });

        // Wait for all images in this batch to complete
        const results = await Promise.all(batchPromises);

        // Update cuts with results (save both aspect ratio URLs)
        results.forEach(result => {
          if (result.success && result.imageUrl) {
            updatedCuts[result.index] = {
              ...updatedCuts[result.index],
              imageUrl: result.imageUrl,
              imageUrl16x9: result.imageUrl16x9 || result.imageUrl,
              imageUrl9x16: result.imageUrl9x16 || result.imageUrl,
            };
          }
          completedCount++;
        });

        // Update state progressively so user sees images appearing
        setStyleConfig(prev => ({ ...prev, cuts: [...updatedCuts] }));
        setImageProgress({ current: completedCount, total: cutsToGenerate.length });

        // Auto-save after each batch to preserve progress (途中で止まっても保存される)
        if (currentProjectId) {
          await saveCurrentProjectToSupabase(updatedCuts);
          console.log(`[Editor] Auto-saved batch (${completedCount}/${cutsToGenerate.length})`);
        }
      }

      const generatedCount = updatedCuts.filter(c => c.imageUrl || c.imageUrl16x9 || c.imageUrl9x16).length;

      showToast(`画像生成完了: ${generatedCount} シーン`, "success");
    } catch (error) {
      console.error("Image generation error:", error);
      showToast("画像生成中にエラーが発生しました", "error");
    } finally {
      setIsGeneratingImages(false);
      setImageProgress({ current: 0, total: 0 });
      setCurrentGeneratingIndex(null);
    }
  };

  // Generate single image from CutList
  const handleGenerateSingleImage = async (cutId: number) => {
    const cutIndex = styleConfig.cuts.findIndex(c => c.id === cutId);
    if (cutIndex === -1) return;

    const cut = styleConfig.cuts[cutIndex];
    const prompt = cut.imagePrompt || cut.images?.[0]?.prompt;

    if (!prompt?.trim()) {
      showToast("画像プロンプトを入力してください", "info");
      return;
    }

    setGeneratingSingleImageCutId(cutId);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          userId: user?.id || "anonymous",
          model: imageModel,  // flash=高速, pro=高品質・テキスト対応
          aspectRatio,  // 現在のアスペクト比
          generateBoth: true,  // 両方のアスペクト比を生成
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to generate image:", data.error || data.details);
        showToast(`画像生成に失敗しました: ${data.error || "不明なエラー"}`, "error");
        return;
      }

      if (data.imageUrl) {
        // Update the cut with both aspect ratio images
        const updatedCuts = [...styleConfig.cuts];
        updatedCuts[cutIndex] = {
          ...updatedCuts[cutIndex],
          imageUrl: data.imageUrl,
          imageUrl16x9: data.imageUrl16x9 || data.imageUrl,
          imageUrl9x16: data.imageUrl9x16 || data.imageUrl,
        };
        setStyleConfig(prev => ({ ...prev, cuts: updatedCuts }));

        // Auto-save to Supabase
        if (currentProjectId) {
          await saveCurrentProjectToSupabase(updatedCuts);
          console.log("[Editor] Auto-saved after single image generation");
        }

        showToast(`シーン ${cutIndex + 1} の画像を生成しました`, "success");
      } else {
        console.error("Failed to generate image: No imageUrl in response", data);
        showToast("画像生成に失敗しました", "error");
      }
    } catch (error) {
      console.error("Single image generation error:", error);
      showToast("画像生成中にエラーが発生しました", "error");
    } finally {
      setGeneratingSingleImageCutId(null);
    }
  };

  // Seek to cut
  const handleSeekToCut = useCallback((startTime: number) => {
    setCurrentTime(startTime);
  }, []);

  // Map our ImageEffect to animation.ts ImageEffect
  const mapImageEffect = (effect: string): "none" | "ken-burns" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right" => {
    const mapping: Record<string, "none" | "ken-burns" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right"> = {
      zoomIn: "zoom-in",
      zoomOut: "zoom-out",
      panLeft: "pan-left",
      panRight: "pan-right",
      static: "none",
    };
    return mapping[effect] || "none";
  };

  // Map our TextAnimation to animation.ts TextAnimation
  const mapTextAnimation = (anim: string): "none" | "fade" | "typewriter" | "slide-up" | "bounce" => {
    const mapping: Record<string, "none" | "fade" | "typewriter" | "slide-up" | "bounce"> = {
      typewriter: "typewriter",
      fadeIn: "fade",
      slideUp: "slide-up",
      bounce: "bounce",
      none: "none",
    };
    return mapping[anim] || "fade";
  };

  // Map our SceneTransition to MainVideo TransitionType
  const mapTransition = (trans: string): "fade" | "slide" | "zoom" | "wipe" => {
    const mapping: Record<string, "fade" | "slide" | "zoom" | "wipe"> = {
      fade: "fade",
      slide: "slide",
      zoom: "zoom",
      cut: "fade",
      dissolve: "fade",
    };
    return mapping[trans] || "fade";
  };

  // Helper function to create scenes for a specific aspect ratio
  const createScenesForAspectRatio = useCallback((targetAspectRatio: "16:9" | "9:16"): Scene[] => {
    return styleConfig.cuts.map((cut) => {
      // アスペクト比に応じた画像URLを選択
      const selectedImageUrl = targetAspectRatio === "9:16"
        ? (cut.imageUrl9x16 || cut.imageUrl)
        : (cut.imageUrl16x9 || cut.imageUrl);

      return {
        duration: cut.endTime - cut.startTime,
        avatar_script: cut.subtitle || `シーン ${cut.id}`,
        subtitle: cut.subtitle || `シーン ${cut.id} のテキスト`,
        image_prompt: cut.imagePrompt || "abstract background",
        imageUrl: selectedImageUrl,
        audioUrl: cut.voiceUrl,  // 音声URL
        assets: cut.assets || [],  // アセット（図形・アイコン・テキスト等）
        emotion: "neutral" as const,
        transition: mapTransition(cut.transition),
        textDisplayMode: cut.textDisplayMode || "word-bounce",  // テキスト表示モード
        animation: {
          imageEffect: mapImageEffect(cut.imageEffect),
          textEntrance: mapTextAnimation(cut.textAnimation),
          sceneEntrance: cut.transition === "fade" ? "fade" : "slide",
        },
      };
    });
  }, [styleConfig.cuts]);

  // 画像があればSceneComponentを使用（textOnly: false）
  // 画像がなければTextOnlySceneを使用（textOnly: true）
  const hasAnyImage = useMemo(() => styleConfig.cuts.some(cut =>
    cut.imageUrl || cut.imageUrl16x9 || cut.imageUrl9x16
  ), [styleConfig.cuts]);

  // Convert style config to VideoProps for preview (memoized to prevent unnecessary re-renders)
  // プレビュー用（プレビューアスペクト比を使用）
  const videoProps = useMemo((): VideoProps => {
    return {
      title: videoTitle,
      scenes: createScenesForAspectRatio(previewAspectRatio),
      aspectRatio: previewAspectRatio,
      textOnly: !hasAnyImage,
      showSubtitle: styleConfig.showSubtitle,
    };
  }, [createScenesForAspectRatio, videoTitle, previewAspectRatio, hasAnyImage, styleConfig.showSubtitle]);

  // レンダリング用（出力アスペクト比を使用）
  const renderVideoProps = useMemo((): VideoProps => {
    return {
      title: videoTitle,
      scenes: createScenesForAspectRatio(aspectRatio),
      aspectRatio: aspectRatio,
      textOnly: !hasAnyImage,
      showSubtitle: styleConfig.showSubtitle,
    };
  }, [createScenesForAspectRatio, videoTitle, aspectRatio, hasAnyImage, styleConfig.showSubtitle]);

  // 1カットプレビュー用（選択されたカットのみ）
  const singleCutVideoProps = useMemo((): VideoProps | null => {
    if (previewCutId === null) return null;
    const cut = styleConfig.cuts.find(c => c.id === previewCutId);
    if (!cut) return null;

    // 選択されたアスペクト比に応じた画像URLを選択
    const selectedImageUrl = previewAspectRatio === "9:16"
      ? (cut.imageUrl9x16 || cut.imageUrl)
      : (cut.imageUrl16x9 || cut.imageUrl);

    const scene: Scene = {
      duration: cut.endTime - cut.startTime,
      avatar_script: cut.subtitle || `シーン ${cut.id}`,
      subtitle: cut.subtitle || "",
      image_prompt: cut.imagePrompt || "abstract background",
      imageUrl: selectedImageUrl,
      audioUrl: cut.voiceUrl,
      assets: cut.assets || [],
      emotion: "neutral" as const,
      transition: "fade" as const,  // 1カットなのでトランジションは不要
      textDisplayMode: cut.textDisplayMode || "word-bounce",
      animation: {
        imageEffect: mapImageEffect(cut.imageEffect),
        textEntrance: mapTextAnimation(cut.textAnimation),
        sceneEntrance: "fade",
      },
    };

    return {
      title: `カット ${cut.id} プレビュー`,
      scenes: [scene],
      aspectRatio: previewAspectRatio,
      textOnly: !selectedImageUrl,
      showSubtitle: true,  // プレビューでは常にテキスト表示
    };
  }, [previewCutId, styleConfig.cuts, previewAspectRatio, mapImageEffect, mapTextAnimation]);

  // Render to MP4
  const handleRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setRenderError(null);

    try {
      const videoConfig = renderVideoProps;  // レンダリング用は出力アスペクト比を使用

      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoConfig }),
      });

      const data = await response.json();

      if (data.success && data.videoUrl) {
        const link = document.createElement("a");
        link.href = data.videoUrl;
        link.download = `video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setRenderProgress(100);
      } else {
        setRenderError(data.error || "レンダリングに失敗しました");
      }
    } catch (error) {
      console.error("Render error:", error);
      setRenderError("レンダリング中にエラーが発生しました");
    } finally {
      setIsRendering(false);
    }
  };

  const hasContent = styleConfig.cuts.some((cut) => cut.subtitle);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">動画スタイルエディタ</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Load Project Button */}
            <button
              onClick={loadProjectsFromSupabase}
              disabled={isLoadingProjects}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                isLoadingProjects
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              {isLoadingProjects ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  読込中...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  プロジェクト読込
                </>
              )}
            </button>
            {/* Save Project Button */}
            {currentProjectId && (
              <button
                onClick={handleManualSave}
                disabled={isSavingProject}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isSavingProject
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-500"
                }`}
              >
                {isSavingProject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存
                    {lastSavedAt && (
                      <span className="text-xs opacity-70">
                        ({lastSavedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })})
                      </span>
                    )}
                  </>
                )}
              </button>
            )}
            {/* Render Button */}
            <button
              onClick={handleRender}
              disabled={isRendering || !hasContent}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isRendering || !hasContent
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-500"
              }`}
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  レンダリング中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  MP4書き出し
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content - 3 columns with resizable panels */}
      <div ref={containerRef} className="flex h-[calc(100vh-57px)]">
        {/* Left column - Settings */}
        <div
          style={{ width: leftWidth }}
          className="flex-shrink-0 overflow-y-auto bg-gray-900/50"
        >
          <div className="p-3 space-y-3">
            {/* Input Mode Tabs */}
            <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
              <button
                onClick={() => setInputMode("theme")}
                className={`flex-1 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  inputMode === "theme"
                    ? "bg-purple-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                テーマ
              </button>
              <button
                onClick={() => setInputMode("url")}
                className={`flex-1 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  inputMode === "url"
                    ? "bg-green-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-3 h-3" />
                URL
              </button>
              <button
                onClick={() => setInputMode("voice")}
                className={`flex-1 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  inputMode === "voice"
                    ? "bg-blue-500 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Mic className="w-3 h-3" />
                音声
              </button>
            </div>

            {/* Shared: Framework & Dialogue Mode Selection */}
            <section className="rounded-lg p-3 border bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-600/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-medium">マーケティングフレームワーク</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDialogueMode("single")}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      dialogueMode === "single"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    一人語り
                  </button>
                  <button
                    onClick={() => setDialogueMode("dialogue")}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      dialogueMode === "dialogue"
                        ? "bg-pink-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    二人掛け合い
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "AIDMA", label: "AIDMA", desc: "注意→興味→欲求→記憶→行動" },
                  { id: "PASONA", label: "PASONA", desc: "問題→煽り→解決→絞込→行動" },
                  { id: "QUEST", label: "QUEST", desc: "適格→理解→教育→刺激→移行" },
                  { id: "PAS", label: "PAS", desc: "問題→煽動→解決" },
                  { id: "4P", label: "4P", desc: "約束→描写→証明→後押し" },
                ].map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setMarketingFramework(fw.id as MarketingFramework)}
                    title={fw.desc}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      marketingFramework === fw.id
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {fw.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500">
                {marketingFramework === "AIDMA" && "注意→興味→欲求→記憶→行動"}
                {marketingFramework === "PASONA" && "問題→煽り→解決→絞込→行動"}
                {marketingFramework === "QUEST" && "適格→理解→教育→刺激→移行"}
                {marketingFramework === "PAS" && "問題→煽動→解決（シンプル）"}
                {marketingFramework === "4P" && "約束→描写→証明→後押し"}
                {dialogueMode === "dialogue" && " ｜ 二人の掛け合い形式"}
              </p>
            </section>

            {/* Input Area based on mode */}
            <section className={`rounded-lg p-3 border ${
              inputMode === "theme"
                ? "bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/30"
                : inputMode === "url"
                ? "bg-gradient-to-br from-green-900/50 to-teal-900/50 border-green-500/30"
                : "bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-blue-500/30"
            }`}>
              {/* Theme Mode */}
              {inputMode === "theme" && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-2">
                    <Wand2 className="w-3 h-3" /> AIで台本を自動生成 (GPT-4o)
                  </h3>
                  <Textarea
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    placeholder="動画のテーマを入力してください...&#10;例: AIプログラミング学習アプリ CodeMaster の60秒CM"
                    className="w-full px-3 py-2 text-sm bg-gray-800/80 border border-purple-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none"
                  />
                  <button
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript || !themeInput.trim()}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isGeneratingScript || !themeInput.trim()
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
                    }`}
                  >
                    {isGeneratingScript ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        台本を自動生成
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* URL Mode */}
              {inputMode === "url" && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-green-300 mb-2 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> URLから台本を生成
                  </h3>
                  <div className="relative url-history-container">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onFocus={() => urlHistory.length > 0 && setShowUrlHistory(true)}
                      placeholder="example.com/article"
                      className="w-full px-3 py-2 text-sm bg-gray-800/80 border border-green-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {/* URL History Dropdown */}
                    {showUrlHistory && urlHistory.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-500/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700">
                          <span className="text-[10px] text-gray-400">履歴 ({urlHistory.length})</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUrlHistory(false);
                            }}
                            className="text-gray-500 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        {urlHistory.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setUrlInput(url);
                              setShowUrlHistory(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-green-900/30 hover:text-white truncate transition-colors"
                            title={url}
                          >
                            {url}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setUrlHistory([]);
                            localStorage.removeItem("vg_url_history");
                            setShowUrlHistory(false);
                          }}
                          className="w-full px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-900/20 border-t border-gray-700"
                        >
                          履歴をクリア
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Quick history buttons (show last 3) */}
                  {urlHistory.length > 0 && !showUrlHistory && (
                    <div className="flex flex-wrap gap-1">
                      {urlHistory.slice(0, 3).map((url, index) => {
                        let displayName = url;
                        try {
                          displayName = new URL(url).hostname;
                        } catch {
                          displayName = url.slice(0, 20);
                        }
                        return (
                          <button
                            key={index}
                            onClick={() => setUrlInput(url)}
                            className="px-2 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-green-800/50 truncate max-w-[120px]"
                            title={url}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                      {urlHistory.length > 3 && (
                        <button
                          onClick={() => setShowUrlHistory(true)}
                          className="px-2 py-0.5 text-[10px] bg-gray-700 text-gray-400 rounded hover:bg-gray-600"
                        >
                          +{urlHistory.length - 3}件
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleGenerateFromUrl}
                    disabled={isGeneratingFromUrl || !urlInput.trim()}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isGeneratingFromUrl || !urlInput.trim()
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-500 hover:to-teal-500"
                    }`}
                  >
                    {isGeneratingFromUrl ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" />
                        URLから生成
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Voice Mode */}
              {inputMode === "voice" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-blue-300 mb-2 flex items-center gap-2">
                    <Mic className="w-3 h-3" /> 音声で台本を生成
                  </h3>
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    isProcessing={isProcessing}
                  />
                  {transcribedText && (
                    <div className="space-y-2">
                      <Textarea
                        value={transcribedText}
                        onChange={(e) => setTranscribedText(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-800/80 border border-blue-500/50 rounded-lg text-white placeholder-gray-400 min-h-[60px] resize-none"
                        placeholder="文字起こし結果..."
                      />
                      <button
                        onClick={handleGenerateFromVoice}
                        disabled={isGeneratingScript || !transcribedText.trim()}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isGeneratingScript || !transcribedText.trim()
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500"
                        }`}
                      >
                        {isGeneratingScript ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3" />
                            この内容で生成
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Script Input Section */}
            <section className="bg-gray-800/50 rounded-lg p-3">
              <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
                <FileText className="w-3 h-3" /> スクリプト
              </h3>

              <div className="space-y-2">
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="動画タイトル"
                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="AIで生成or直接入力..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <button
                  onClick={handleSplitScript}
                  disabled={isGeneratingContent || !script.trim()}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isGeneratingContent || !script.trim()
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                >
                  {isGeneratingContent ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      分割中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      シーンに割り当て
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Image Generation Section */}
            <section className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-lg p-3 border border-orange-500/30">
              <h3 className="text-xs font-medium text-orange-300 mb-2 flex items-center gap-2">
                <span>🖼️</span> 画像生成
              </h3>

              {/* Aspect Ratio Selection (PC / スマホ) */}
              <div className="mb-3">
                <label className="text-xs text-orange-300/70 mb-1 block">動画サイズ</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setAspectRatio("16:9")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      aspectRatio === "16:9"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>🖥️</span>
                    <span>PC用 (16:9)</span>
                  </button>
                  <button
                    onClick={() => setAspectRatio("9:16")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      aspectRatio === "9:16"
                        ? "bg-orange-500 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>📱</span>
                    <span>スマホ用 (9:16)</span>
                  </button>
                </div>
              </div>

              {/* Image Model Selection */}
              <div className="mb-3">
                <label className="text-xs text-orange-300/70 mb-1 block">画像モデル</label>
                <div className="flex gap-1">
                  {IMAGE_MODEL_OPTIONS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setImageModel(model.id)}
                      className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                        imageModel === model.id
                          ? "bg-orange-500 text-white"
                          : "bg-gray-700 text-gray-400 hover:text-white"
                      }`}
                      title={model.description}
                    >
                      <span className="text-sm">{model.icon}</span>
                      <span className="text-[10px]">{model.name}</span>
                      <span className="text-[9px] opacity-70">{model.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress indicator with thumbnails */}
              {(() => {
                const totalWithPrompt = styleConfig.cuts.filter(c => c.imagePrompt?.trim() || c.images?.[0]?.prompt).length;
                const generatedCount = styleConfig.cuts.filter(c => c.imageUrl).length;
                const pendingCount = totalWithPrompt - generatedCount;
                const progressPercent = totalWithPrompt > 0 ? Math.round((generatedCount / totalWithPrompt) * 100) : 0;
                return (
                  <div className="mb-3 space-y-2">
                    {/* Text progress */}
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-300/70">
                        {generatedCount}/{totalWithPrompt} 生成済み
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-orange-400/60">
                          残り {pendingCount} シーン
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {/* Thumbnail grid */}
                    <div className="grid grid-cols-6 gap-1.5 mt-2">
                      {styleConfig.cuts.map((cut, index) => {
                        const hasPrompt = cut.imagePrompt?.trim() || cut.images?.[0]?.prompt;
                        const isGenerating = isGeneratingImages && currentGeneratingIndex === index;
                        const isGenerated = !!cut.imageUrl;
                        const isPending = hasPrompt && !isGenerated && !isGenerating;

                        return (
                          <div
                            key={cut.id}
                            className={`relative aspect-video rounded overflow-hidden border transition-all duration-300 ${
                              isGenerating
                                ? "border-orange-400 ring-2 ring-orange-400/50 animate-pulse"
                                : isGenerated
                                  ? "border-green-500/50"
                                  : hasPrompt
                                    ? "border-gray-600"
                                    : "border-gray-700/50 opacity-40"
                            }`}
                            title={`シーン ${index + 1}${isGenerating ? " - 生成中..." : isGenerated ? " - 完了" : isPending ? " - 待機中" : " - プロンプトなし"}`}
                          >
                            {isGenerated && cut.imageUrl ? (
                              <img
                                src={cut.imageUrl}
                                alt={`シーン ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : isGenerating ? (
                              <div className="w-full h-full bg-gradient-to-br from-orange-900/80 to-amber-900/80 flex items-center justify-center">
                                <Loader2 className="w-3 h-3 text-orange-300 animate-spin" />
                              </div>
                            ) : hasPrompt ? (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <span className="text-[8px] text-gray-500">待機</span>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <span className="text-[8px] text-gray-600">-</span>
                              </div>
                            )}
                            {/* Scene number badge */}
                            <div className={`absolute top-0 left-0 px-1 text-[8px] font-medium ${
                              isGenerating
                                ? "bg-orange-500 text-white"
                                : isGenerated
                                  ? "bg-green-600/80 text-white"
                                  : "bg-gray-800/80 text-gray-400"
                            }`}>
                              {index + 1}
                            </div>
                            {/* Status icon */}
                            {isGenerated && (
                              <div className="absolute bottom-0.5 right-0.5">
                                <Check className="w-2.5 h-2.5 text-green-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Current generating scene info */}
                    {isGeneratingImages && currentGeneratingIndex !== null && (
                      <div className="mt-2 p-2 bg-orange-950/50 rounded border border-orange-500/30 animate-pulse">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-orange-300 font-medium">
                              シーン {currentGeneratingIndex + 1} を生成中...
                            </p>
                            <p className="text-[10px] text-orange-400/70 truncate">
                              {styleConfig.cuts[currentGeneratingIndex]?.imagePrompt?.slice(0, 50) ||
                               styleConfig.cuts[currentGeneratingIndex]?.images?.[0]?.prompt?.slice(0, 50)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={handleGenerateImages}
                disabled={isGeneratingImages || !styleConfig.cuts.some(c => (c.imagePrompt?.trim() || c.images?.[0]?.prompt) && !c.imageUrl)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isGeneratingImages || !styleConfig.cuts.some(c => (c.imagePrompt?.trim() || c.images?.[0]?.prompt) && !c.imageUrl)
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500"
                }`}
              >
                {isGeneratingImages ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生成中 {imageProgress.current}/{imageProgress.total}
                  </>
                ) : styleConfig.cuts.every(c => !c.imagePrompt?.trim() && !c.images?.[0]?.prompt) ? (
                  <>
                    <span>🎨</span>
                    プロンプトなし
                  </>
                ) : styleConfig.cuts.filter(c => c.imageUrl).length === styleConfig.cuts.filter(c => c.imagePrompt?.trim() || c.images?.[0]?.prompt).length ? (
                  <>
                    <span>✓</span>
                    全シーン生成完了
                  </>
                ) : (
                  <>
                    <span>🎨</span>
                    未生成シーンの画像生成
                  </>
                )}
              </button>
            </section>

            {/* Audio Generation Section */}
            <section className="bg-gradient-to-br from-green-900/50 to-teal-900/50 rounded-lg p-3 border border-green-500/30">
              <h3 className="text-xs font-medium text-green-300 mb-2 flex items-center gap-2">
                <Volume2 className="w-3 h-3" /> 音声生成
              </h3>

              {/* TTS Provider Selection */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-green-300/70">音声エンジン</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDictionaryModal(true)}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                      title="読み辞書"
                    >
                      <Book className="w-3 h-3" />
                      辞書
                    </button>
                    <Link
                      href="/voice-test"
                      className="text-[10px] text-green-400 hover:text-green-300 underline"
                    >
                      音声テスト →
                    </Link>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setTtsProvider("gemini");
                      setSelectedVoiceId(GEMINI_VOICE_OPTIONS[0].id);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      ttsProvider === "gemini"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    Gemini 2.5 TTS
                  </button>
                  <button
                    onClick={() => {
                      setTtsProvider("google");
                      setSelectedVoiceId(GOOGLE_VOICE_OPTIONS[0].id);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      ttsProvider === "google"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    Google
                  </button>
                  <button
                    onClick={() => {
                      setTtsProvider("elevenlabs");
                      setSelectedVoiceId(ELEVENLABS_VOICE_OPTIONS[0].id);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      ttsProvider === "elevenlabs"
                        ? "bg-amber-500 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    ElevenLabs
                  </button>
                  <button
                    onClick={() => {
                      setTtsProvider("aivis");
                      setSelectedVoiceId(AIVIS_VOICE_OPTIONS[0].id);
                      setAivisStyleId(AIVIS_VOICE_OPTIONS[0].styleId);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      ttsProvider === "aivis"
                        ? "bg-green-500 text-white"
                        : "bg-gray-700 text-gray-400 hover:text-white"
                    }`}
                    title="無料・ローカル実行"
                  >
                    Aivis
                  </button>
                </div>
              </div>

              {/* Gemini Model Selection (only when Gemini is selected) */}
              {ttsProvider === "gemini" && (
                <div className="mb-3">
                  <label className="text-xs text-green-300/70 mb-1 block">TTSモデル</label>
                  <div className="grid grid-cols-2 gap-1">
                    {GEMINI_TTS_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedGeminiModel(model.id)}
                        className={`py-1 px-2 rounded text-[10px] transition-colors text-left ${
                          selectedGeminiModel === model.id
                            ? "bg-purple-500/80 text-white"
                            : "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                        }`}
                        title={model.description}
                      >
                        <span className="font-medium">{model.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice Selection - メイン話者 */}
              <div className="mb-3">
                <label className="text-xs text-green-300/70 mb-1 block">
                  メイン話者（ナレーター/ホスト）
                </label>
                {ttsProvider === "aivis" ? (
                  /* Aivis: アコーディオン表示 */
                  <div className="space-y-1">
                    {AIVIS_VOICE_GROUPS.map((group) => {
                      const isExpanded = expandedAivisGroup === group.name;
                      const selectedStyle = group.styles.find(s => s.styleId === aivisStyleId);
                      return (
                        <div key={group.name} className="rounded overflow-hidden">
                          <button
                            onClick={() => setExpandedAivisGroup(isExpanded ? null : group.name)}
                            className={`w-full py-1.5 px-2 text-xs text-left flex items-center justify-between ${
                              selectedStyle ? "bg-green-600 text-white" : "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {group.icon ? (
                                <img src={group.icon} alt={group.name} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px]">{group.gender === "female" ? "♀" : "♂"}</span>
                              )}
                              <span>
                                <span className="font-medium">{group.name}</span>
                                {selectedStyle && <span className="text-[10px] ml-2 opacity-80">({selectedStyle.description})</span>}
                              </span>
                            </span>
                            <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                          </button>
                          {isExpanded && (
                            <div className="grid grid-cols-3 gap-0.5 p-1 bg-gray-800/50">
                              {group.styles.map((style) => (
                                <button
                                  key={style.id}
                                  onClick={() => { setSelectedVoiceId(style.id); setAivisStyleId(style.styleId); }}
                                  className={`py-1 px-1.5 rounded text-[10px] ${
                                    aivisStyleId === style.styleId ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                  }`}
                                >
                                  {style.description}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* その他: グリッド表示 */
                  <div className="grid grid-cols-2 gap-1">
                    {getVoiceOptionsForProvider(ttsProvider).map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoiceId(voice.id)}
                        className={`py-1.5 px-2 rounded text-xs transition-colors text-left ${
                          selectedVoiceId === voice.id ? "bg-green-500 text-white" : "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                        }`}
                        title={voice.description}
                      >
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-[10px] opacity-70 ml-1">{voice.gender === "female" ? "♀" : "♂"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Selection - 第2話者 */}
              <div className="mb-3">
                <label className="text-xs text-green-300/70 mb-1 block">
                  第2話者（ゲスト/お客様の声）
                </label>
                {ttsProvider === "aivis" ? (
                  /* Aivis: アコーディオン表示 */
                  <div className="space-y-1">
                    {AIVIS_VOICE_GROUPS.map((group) => {
                      const isExpanded = expandedAivisSecondaryGroup === group.name;
                      const selectedStyle = group.styles.find(s => s.styleId === aivisSecondaryStyleId);
                      return (
                        <div key={group.name} className="rounded overflow-hidden">
                          <button
                            onClick={() => setExpandedAivisSecondaryGroup(isExpanded ? null : group.name)}
                            className={`w-full py-1.5 px-2 text-xs text-left flex items-center justify-between ${
                              selectedStyle ? "bg-orange-600 text-white" : "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {group.icon ? (
                                <img src={group.icon} alt={group.name} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px]">{group.gender === "female" ? "♀" : "♂"}</span>
                              )}
                              <span>
                                <span className="font-medium">{group.name}</span>
                                {selectedStyle && <span className="text-[10px] ml-2 opacity-80">({selectedStyle.description})</span>}
                              </span>
                            </span>
                            <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                          </button>
                          {isExpanded && (
                            <div className="grid grid-cols-3 gap-0.5 p-1 bg-gray-800/50">
                              {group.styles.map((style) => (
                                <button
                                  key={style.id}
                                  onClick={() => { setSecondaryVoiceId(style.id); setAivisSecondaryStyleId(style.styleId); }}
                                  className={`py-1 px-1.5 rounded text-[10px] ${
                                    aivisSecondaryStyleId === style.styleId ? "bg-orange-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                  }`}
                                >
                                  {style.description}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* その他: グリッド表示 */
                  <div className="grid grid-cols-2 gap-1">
                    {getVoiceOptionsForProvider(ttsProvider).map((voice) => (
                      <button
                        key={`secondary-${voice.id}`}
                        onClick={() => setSecondaryVoiceId(voice.id)}
                        className={`py-1.5 px-2 rounded text-xs transition-colors text-left ${
                          secondaryVoiceId === voice.id ? "bg-orange-500 text-white" : "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                        }`}
                        title={voice.description}
                      >
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-[10px] opacity-70 ml-1">{voice.gender === "female" ? "♀" : "♂"}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1">
                  ※ 台本で「customer」「guest」等に設定されたシーンで使用
                </p>
              </div>

              {/* Progress indicator */}
              {(() => {
                const totalWithText = styleConfig.cuts.filter(c => c.voiceText?.trim()).length;
                const generatedCount = styleConfig.cuts.filter(c => c.voiceUrl).length;
                const pendingCount = totalWithText - generatedCount;
                const progressPercent = totalWithText > 0 ? Math.round((generatedCount / totalWithText) * 100) : 0;
                return (
                  <div className="mb-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-300/70">
                        {generatedCount}/{totalWithText} 生成済み
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-green-400/60">
                          残り {pendingCount} シーン
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio || !styleConfig.cuts.some(c => c.voiceText?.trim() && !c.voiceUrl)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isGeneratingAudio || !styleConfig.cuts.some(c => c.voiceText?.trim() && !c.voiceUrl)
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-500 hover:to-teal-500"
                }`}
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    生成中 {audioProgress.current}/{audioProgress.total}
                  </>
                ) : styleConfig.cuts.every(c => !c.voiceText?.trim()) ? (
                  <>
                    <Volume2 className="w-3 h-3" />
                    音声テキストなし
                  </>
                ) : styleConfig.cuts.filter(c => c.voiceUrl).length === styleConfig.cuts.filter(c => c.voiceText?.trim()).length ? (
                  <>
                    <span>✓</span>
                    全シーン生成完了
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    未生成シーンの音声生成
                  </>
                )}
              </button>
            </section>

            {/* Video Style Selector */}
            <VideoStyleSelector
              config={styleConfig}
              onChange={handleConfigChange}
              onGenerateCuts={handleGenerateCuts}
              isGenerating={isGeneratingCuts}
            />
          </div>
        </div>

        {/* Left resize handle */}
        <div
          onMouseDown={startDragLeft}
          className="w-1 flex-shrink-0 bg-gray-800 hover:bg-blue-500 cursor-col-resize transition-colors group relative"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        {/* Center column - Cut List (Main) */}
        <div className="flex-1 overflow-y-auto bg-gray-950 min-w-[400px]">
          <div className="p-4">
            {styleConfig.cuts.length > 0 && (
              <CutList
                cuts={styleConfig.cuts}
                onUpdateCut={handleUpdateCut}
                onUpdateAllCuts={handleUpdateAllCuts}
                currentTime={currentTime}
                onSeekToCut={handleSeekToCut}
                onRegenerateAudio={handleRegenerateSingleAudio}
                onOpenDictionary={() => {
                  setDictionaryInitialText("");
                  setShowDictionaryModal(true);
                }}
                regeneratingCutId={regeneratingCutId}
                onGenerateImage={handleGenerateSingleImage}
                generatingImageCutId={generatingSingleImageCutId}
                onPreviewCut={setPreviewCutId}
                mainVoiceId={selectedVoiceId}
                secondaryVoiceId={secondaryVoiceId}
                ttsProvider={ttsProvider}
                mainVoiceName={ttsProvider === "aivis" ? AIVIS_VOICE_OPTIONS.find(v => v.styleId === aivisStyleId)?.name : undefined}
                secondaryVoiceName={ttsProvider === "aivis" ? AIVIS_VOICE_OPTIONS.find(v => v.styleId === aivisSecondaryStyleId)?.name : undefined}
              />
            )}
          </div>
        </div>

        {/* Right resize handle */}
        <div
          onMouseDown={startDragRight}
          className="w-1 flex-shrink-0 bg-gray-800 hover:bg-blue-500 cursor-col-resize transition-colors group relative"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        {/* Right column - Preview */}
        <div
          style={{ width: rightWidth }}
          className="flex-shrink-0 overflow-y-auto bg-gray-900/50"
        >
          <div className="p-3">
            <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
              <span>🎬</span> プレビュー
            </h3>

            {/* Preview Aspect Ratio Tabs */}
            <div className="flex gap-1 mb-3 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setPreviewAspectRatio("9:16")}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition-colors ${
                  previewAspectRatio === "9:16"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                📱 スマホ (9:16)
              </button>
              <button
                onClick={() => setPreviewAspectRatio("16:9")}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition-colors ${
                  previewAspectRatio === "16:9"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                🖥️ PC (16:9)
              </button>
            </div>

            {styleConfig.cuts.length > 0 ? (
              <VideoPreview
                videoProps={videoProps}
                onTimeUpdate={setCurrentTime}
              />
            ) : (
              <div className={`${previewAspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"} bg-gray-800 rounded-lg flex items-center justify-center`}>
                <p className="text-gray-500 text-center text-sm">
                  カットを生成すると<br />プレビューが表示されます
                </p>
              </div>
            )}

            {/* Render progress */}
            {isRendering && (
              <div className="mt-3 space-y-2">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  レンダリング中... {renderProgress}%
                </p>
              </div>
            )}

            {/* Render error */}
            {renderError && (
              <div className="mt-3 p-2 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-xs text-red-400">{renderError}</p>
              </div>
            )}

            {/* Scene content preview */}
            {hasContent && (
              <div className="mt-3 p-2 bg-gray-800 rounded-lg">
                <h4 className="text-xs text-gray-500 mb-2">シーン内容</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {styleConfig.cuts.slice(0, 8).map((cut) => (
                    <div key={cut.id} className="text-xs text-gray-400">
                      <span className="text-gray-600">#{cut.id}</span>{" "}
                      {cut.subtitle?.slice(0, 20) || "（未設定）"}
                      {(cut.subtitle?.length || 0) > 20 ? "..." : ""}
                    </div>
                  ))}
                  {styleConfig.cuts.length > 8 && (
                    <div className="text-xs text-gray-600">
                      ...他 {styleConfig.cuts.length - 8} シーン
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON Check Modal */}
      {showJsonModal && generatedJson && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">生成されたJSON確認</h2>
                {dbSaveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                    <Database className="w-3 h-3" />
                    <Check className="w-3 h-3" />
                    DB保存済み
                  </span>
                )}
                {dbSaveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    保存中...
                  </span>
                )}
                {dbSaveStatus === "error" && (
                  <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                    DB保存失敗
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left: Summary */}
              <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
                <h3 className="text-sm font-medium text-gray-400 mb-3">サマリー</h3>
                <div className="space-y-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">タイトル</div>
                    <div className="text-sm font-medium">{generatedJson.title || "未設定"}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">総尺</div>
                    <div className="text-sm font-medium">{generatedJson.total_duration || 0}秒</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">シーン数</div>
                    <div className="text-sm font-medium">{generatedJson.scenes?.length || 0}シーン</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">エフェクト確認</div>
                    <div className="space-y-1 mt-1">
                      {generatedJson.scenes?.map((s: any, i: number) => (
                        <div key={i} className="text-xs flex justify-between">
                          <span className="text-gray-500">#{i + 1}</span>
                          <span className="text-blue-400">{s.image_effect || "?"}</span>
                          <span className="text-green-400">{s.transition || "?"}</span>
                          <span className="text-purple-400">{s.text_animation || "?"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {currentProjectId && (
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <div className="text-xs text-green-400">プロジェクトID</div>
                      <div className="text-xs font-mono text-green-300 break-all">{currentProjectId}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Raw JSON */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400">Raw JSON</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
                      showToast("JSONをクリップボードにコピーしました", "success");
                    }}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    コピー
                  </button>
                </div>
                <pre className="text-xs bg-gray-950 p-4 rounded-lg overflow-x-auto font-mono text-green-400 whitespace-pre-wrap">
                  {JSON.stringify(generatedJson, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
              >
                閉じてエディタへ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project List Modal */}
      {showProjectList && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">保存済みプロジェクト</h2>
              </div>
              <button
                onClick={() => setShowProjectList(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {savedProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  保存されたプロジェクトがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => loadProject(project)}
                      className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-blue-500"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{project.title || "無題のプロジェクト"}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(project.updated_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {project.scenes && (
                          <span>{project.scenes.length}シーン</span>
                        )}
                        {project.theme_text && (
                          <span className="truncate max-w-[200px]">テーマ: {project.theme_text}</span>
                        )}
                        {project.url_input && (
                          <span className="truncate max-w-[200px]">URL: {project.url_input}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded ${
                          project.status === "completed" ? "bg-green-900 text-green-400" :
                          project.status === "generating" ? "bg-yellow-900 text-yellow-400" :
                          "bg-gray-700 text-gray-400"
                        }`}>
                          {project.status === "completed" ? "完了" :
                           project.status === "generating" ? "生成中" : "下書き"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowProjectList(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reading Dictionary Modal */}
      <ReadingDictionaryModal
        isOpen={showDictionaryModal}
        onClose={() => {
          setShowDictionaryModal(false);
          setDictionaryInitialText("");
        }}
        initialText={dictionaryInitialText}
      />

      {/* Single Cut Preview Modal */}
      {previewCutId !== null && singleCutVideoProps && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full flex flex-col border border-purple-500/50">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-purple-400">▶</span>
                カット {previewCutId} プレビュー
                <span className="text-xs text-gray-400 ml-2">
                  （テキスト表示: {styleConfig.cuts.find(c => c.id === previewCutId)?.textDisplayMode === "sync-typewriter" ? "タイプライター" : styleConfig.cuts.find(c => c.id === previewCutId)?.textDisplayMode === "instant" ? "即時" : "バウンス"}）
                </span>
              </h3>
              <button
                onClick={() => setPreviewCutId(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Preview Player */}
            <div className="p-4 flex justify-center">
              <div className={`${previewAspectRatio === "9:16" ? "w-[280px]" : "w-full max-w-[500px]"}`}>
                <VideoPreview
                  videoProps={singleCutVideoProps}
                  onTimeUpdate={() => {}}
                />
              </div>
            </div>
            {/* Footer */}
            <div className="p-4 border-t border-gray-700 flex justify-between items-center">
              <div className="text-xs text-gray-400">
                Duration: {(styleConfig.cuts.find(c => c.id === previewCutId)?.endTime || 0) - (styleConfig.cuts.find(c => c.id === previewCutId)?.startTime || 0)}秒
              </div>
              <button
                onClick={() => setPreviewCutId(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
