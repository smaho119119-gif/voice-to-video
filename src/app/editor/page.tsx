"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { VideoStyleSelector } from "@/components/VideoStyleSelector";
import { CutList } from "@/components/CutList";
import { VideoPreview } from "@/components/VideoPreview";
import {
  VideoStyleConfig,
  CutConfig,
  ImageEffect,
  TextAnimation,
  SceneTransition,
  getDefaultConfig,
  calculateCutCount,
} from "@/lib/video-presets";
import {
  generateUniformCuts,
  updateCut,
  updateAllCuts,
} from "@/lib/auto-cut-generator";
import { VideoProps, Scene } from "@/remotion/MainVideo";
import { Loader2, Download, ArrowLeft, Sparkles, FileText, Wand2, Volume2, GripVertical, Globe, Mic } from "lucide-react";
import Link from "next/link";
import { AudioRecorder } from "@/components/AudioRecorder";
import { Textarea } from "@/components/ui/textarea";

type InputMode = "theme" | "url" | "voice";
type TTSProvider = "google" | "elevenlabs" | "gemini";

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
  { id: "Zephyr", name: "Zephyr", gender: "female", description: "明るい女性声" },
  { id: "Puck", name: "Puck", gender: "male", description: "活発な男性声" },
  { id: "Charon", name: "Charon", gender: "male", description: "落ち着いた男性声" },
  { id: "Kore", name: "Kore", gender: "female", description: "柔らかい女性声" },
  { id: "Fenrir", name: "Fenrir", gender: "male", description: "力強い男性声" },
  { id: "Leda", name: "Leda", gender: "female", description: "温かみのある女性声" },
  { id: "Aoede", name: "Aoede", gender: "female", description: "自然な女性声" },
];

function getVoiceOptionsForProvider(provider: TTSProvider) {
  switch (provider) {
    case "google": return GOOGLE_VOICE_OPTIONS;
    case "elevenlabs": return ELEVENLABS_VOICE_OPTIONS;
    case "gemini": return GEMINI_VOICE_OPTIONS;
    default: return GOOGLE_VOICE_OPTIONS;
  }
}

export default function EditorPage() {
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
  const [transcribedText, setTranscribedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingFromUrl, setIsGeneratingFromUrl] = useState(false);

  // TTS settings
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("gemini");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("Zephyr");

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

  // Generate script from theme (as professional CM writer)
  const handleGenerateScript = async () => {
    if (!themeInput.trim()) return;

    setIsGeneratingScript(true);
    try {
      const cutCount = calculateCutCount(styleConfig.totalDuration, styleConfig.sceneDuration);

      const response = await fetch("/api/generate-script-from-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: themeInput.trim(),
          targetDuration: styleConfig.totalDuration,
          cutCount,
          style: "cm", // CM writer style
        }),
      });

      const data = await response.json();

      if (data.success && data.script) {
        // Update title
        if (data.script.title) {
          setVideoTitle(data.script.title);
        }

        // Combine script for display
        const fullScript = data.script.scenes
          ?.map((s: any) => s.avatar_script || s.narration || s.subtitle)
          .join("\n") || data.script.script || "";
        setScript(fullScript);

        // Update cuts with generated scenes
        if (data.script.scenes && Array.isArray(data.script.scenes)) {
          setStyleConfig((prev) => ({
            ...prev,
            cuts: prev.cuts.map((cut, index) => {
              const scene = data.script.scenes[index];
              if (scene) {
                // メインテキストのマッピング
                const mainText = scene.main_text ? {
                  type: scene.main_text.type || "title",
                  lines: scene.main_text.lines || [],
                } : undefined;

                // 画像のマッピング
                const images = (scene.image_prompts || [scene.image_prompt]).filter(Boolean).map((prompt: string, i: number) => ({
                  id: `img-${cut.id}-${i}`,
                  source: "generated" as const,
                  prompt,
                }));

                // エフェクトのマッピング
                const imageEffectMap: Record<string, ImageEffect> = {
                  zoomIn: "zoomIn",
                  zoomOut: "zoomOut",
                  panLeft: "panLeft",
                  panRight: "panRight",
                  static: "static",
                };
                const textAnimationMap: Record<string, TextAnimation> = {
                  typewriter: "typewriter",
                  fadeIn: "fadeIn",
                  slideUp: "slideUp",
                  bounce: "bounce",
                  none: "none",
                };
                const transitionMap: Record<string, SceneTransition> = {
                  fade: "fade",
                  slide: "slide",
                  zoom: "zoom",
                  cut: "cut",
                  dissolve: "dissolve",
                  wipe: "fade", // wipeはfadeにフォールバック
                };

                return {
                  ...cut,
                  mainText,
                  subtitle: scene.subtitle || "",
                  voiceText: scene.voice_text || scene.avatar_script || "",
                  voiceStyle: scene.voice_style || "",  // 演技指導
                  images: images.length > 0 ? images : cut.images,
                  imagePrompt: scene.image_prompts?.[0] || scene.image_prompt || cut.imagePrompt,
                  // エフェクトを適用
                  imageEffect: imageEffectMap[scene.image_effect] || cut.imageEffect,
                  textAnimation: textAnimationMap[scene.text_animation] || cut.textAnimation,
                  transition: transitionMap[scene.transition] || cut.transition,
                };
              }
              return cut;
            }),
          }));
        }
      } else {
        console.error("Failed to generate script:", data.error);
        alert("台本生成に失敗しました: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error generating script:", error);
      alert("台本生成中にエラーが発生しました");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Generate script from URL
  const handleGenerateFromUrl = async () => {
    if (!urlInput.trim()) {
      alert("URLを入力してください");
      return;
    }

    // Normalize URL
    let normalizedUrl = urlInput.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setIsGeneratingFromUrl(true);
    try {
      const cutCount = calculateCutCount(styleConfig.totalDuration, styleConfig.sceneDuration);

      const response = await fetch("/api/generate-script-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizedUrl,
          targetDuration: styleConfig.totalDuration,
          cutCount,
        }),
      });

      const data = await response.json();

      if (data.success && data.script) {
        // Update title
        if (data.script.title) {
          setVideoTitle(data.script.title);
        }

        // Combine script for display
        const fullScript = data.script.scenes
          ?.map((s: any) => s.avatar_script || s.narration || s.subtitle)
          .join("\n") || data.script.script || "";
        setScript(fullScript);

        // Update cuts with generated scenes (same logic as handleGenerateScript)
        if (data.script.scenes && Array.isArray(data.script.scenes)) {
          setStyleConfig((prev) => ({
            ...prev,
            cuts: prev.cuts.map((cut, index) => {
              const scene = data.script.scenes[index];
              if (scene) {
                const mainText = scene.main_text ? {
                  type: scene.main_text.type || "title",
                  lines: scene.main_text.lines || [],
                } : undefined;

                const images = (scene.image_prompts || [scene.image_prompt]).filter(Boolean).map((prompt: string, i: number) => ({
                  id: `img-${cut.id}-${i}`,
                  source: "generated" as const,
                  prompt,
                }));

                const imageEffectMap: Record<string, ImageEffect> = {
                  zoomIn: "zoomIn", zoomOut: "zoomOut", panLeft: "panLeft", panRight: "panRight", static: "static",
                };
                const textAnimationMap: Record<string, TextAnimation> = {
                  typewriter: "typewriter", fadeIn: "fadeIn", slideUp: "slideUp", bounce: "bounce", none: "none",
                };
                const transitionMap: Record<string, SceneTransition> = {
                  fade: "fade", slide: "slide", zoom: "zoom", cut: "cut", dissolve: "dissolve", wipe: "fade",
                };

                return {
                  ...cut,
                  mainText,
                  subtitle: scene.subtitle || "",
                  voiceText: scene.voice_text || scene.avatar_script || "",
                  voiceStyle: scene.voice_style || "",  // 演技指導
                  images: images.length > 0 ? images : cut.images,
                  imagePrompt: scene.image_prompts?.[0] || scene.image_prompt || cut.imagePrompt,
                  imageEffect: imageEffectMap[scene.image_effect] || cut.imageEffect,
                  textAnimation: textAnimationMap[scene.text_animation] || cut.textAnimation,
                  transition: transitionMap[scene.transition] || cut.transition,
                };
              }
              return cut;
            }),
          }));
        }
      } else {
        console.error("Failed to generate script from URL:", data.error);
        alert("URLからの台本生成に失敗しました: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error generating script from URL:", error);
      alert("URLからの台本生成中にエラーが発生しました");
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
        alert("音声の文字起こしに失敗しました: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("文字起こし中にエラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate from transcribed text
  const handleGenerateFromVoice = async () => {
    if (!transcribedText.trim()) {
      alert("音声を録音してください");
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

  // Generate audio for all scenes
  const handleGenerateAudio = async () => {
    const cutsWithVoice = styleConfig.cuts.filter(cut => cut.voiceText && cut.voiceText.trim());
    if (cutsWithVoice.length === 0) {
      alert("音声テキストが設定されているシーンがありません");
      return;
    }

    setIsGeneratingAudio(true);
    setAudioProgress({ current: 0, total: cutsWithVoice.length });

    try {
      const updatedCuts = [...styleConfig.cuts];

      for (let i = 0; i < styleConfig.cuts.length; i++) {
        const cut = styleConfig.cuts[i];
        if (!cut.voiceText || !cut.voiceText.trim()) continue;

        setAudioProgress(prev => ({ ...prev, current: prev.current + 1 }));

        try {
          const response = await fetch("/api/generate-voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cut.voiceText,
              config: {
                provider: ttsProvider,
                voice: selectedVoiceId,
                style: cut.voiceStyle,  // 演技指導を渡す
              },
            }),
          });

          const data = await response.json();
          if (data.success && data.audioUrl) {
            updatedCuts[i] = { ...updatedCuts[i], voiceUrl: data.audioUrl };
          }
        } catch (error) {
          console.error(`Failed to generate audio for scene ${cut.id}:`, error);
        }
      }

      setStyleConfig(prev => ({ ...prev, cuts: updatedCuts }));
      alert(`音声生成完了: ${audioProgress.current}/${cutsWithVoice.length} シーン`);
    } catch (error) {
      console.error("Audio generation error:", error);
      alert("音声生成中にエラーが発生しました");
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgress({ current: 0, total: 0 });
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

  // Convert style config to VideoProps for preview
  const getVideoProps = useCallback((): VideoProps => {
    const scenes: Scene[] = styleConfig.cuts.map((cut) => ({
      duration: cut.endTime - cut.startTime,
      avatar_script: cut.subtitle || `シーン ${cut.id}`,
      subtitle: cut.subtitle || `シーン ${cut.id} のテキスト`,
      image_prompt: cut.imagePrompt || "abstract background",
      imageUrl: cut.imageUrl,
      emotion: "neutral" as const,
      transition: mapTransition(cut.transition),
      animation: {
        imageEffect: mapImageEffect(cut.imageEffect),
        textEntrance: mapTextAnimation(cut.textAnimation),
        sceneEntrance: cut.transition === "fade" ? "fade" : "slide",
      },
    }));

    return {
      title: videoTitle,
      scenes,
      aspectRatio: "9:16",
      textOnly: true,
    };
  }, [styleConfig.cuts, videoTitle]);

  // Render to MP4
  const handleRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setRenderError(null);

    try {
      const videoConfig = getVideoProps();

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
                    <Wand2 className="w-3 h-3" /> AIで台本を自動生成
                  </h3>
                  <Textarea
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    placeholder="動画のテーマを入力してください...&#10;例: 初心者向けプログラミング入門"
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
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="example.com/article"
                    className="w-full px-3 py-2 text-sm bg-gray-800/80 border border-green-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
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

            {/* Audio Generation Section */}
            <section className="bg-gradient-to-br from-green-900/50 to-teal-900/50 rounded-lg p-3 border border-green-500/30">
              <h3 className="text-xs font-medium text-green-300 mb-2 flex items-center gap-2">
                <Volume2 className="w-3 h-3" /> 音声生成
              </h3>

              {/* TTS Provider Selection */}
              <div className="mb-3">
                <label className="text-xs text-green-300/70 mb-1 block">音声エンジン</label>
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
                    Gemini 2.5
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
                </div>
              </div>

              {/* Voice Selection */}
              <div className="mb-3">
                <label className="text-xs text-green-300/70 mb-1 block">ボイス</label>
                <div className="grid grid-cols-2 gap-1">
                  {getVoiceOptionsForProvider(ttsProvider).map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoiceId(voice.id)}
                      className={`py-1.5 px-2 rounded text-xs transition-colors text-left ${
                        selectedVoiceId === voice.id
                          ? "bg-green-500 text-white"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-600"
                      }`}
                      title={voice.description}
                    >
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-[10px] opacity-70 ml-1">
                        {voice.gender === "female" ? "♀" : "♂"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-green-300/70 mb-2">
                {styleConfig.cuts.filter(c => c.voiceText?.trim()).length} シーンに音声あり
                {styleConfig.cuts.filter(c => c.voiceUrl).length > 0 && (
                  <span className="ml-1 text-green-400">
                    ({styleConfig.cuts.filter(c => c.voiceUrl).length} 済)
                  </span>
                )}
              </div>
              <button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio || !styleConfig.cuts.some(c => c.voiceText?.trim())}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isGeneratingAudio || !styleConfig.cuts.some(c => c.voiceText?.trim())
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-500 hover:to-teal-500"
                }`}
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {audioProgress.current}/{audioProgress.total}
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    全シーン音声生成
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

            {styleConfig.cuts.length > 0 ? (
              <VideoPreview
                videoProps={getVideoProps()}
                onTimeUpdate={setCurrentTime}
              />
            ) : (
              <div className="aspect-[9/16] bg-gray-800 rounded-lg flex items-center justify-center">
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
    </div>
  );
}
