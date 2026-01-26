"use client";

import { useState, useRef, useEffect } from "react";
import {
  CutConfig,
  ImageEffect,
  SceneTransition,
  TextAnimation,
  MainTextType,
  MainTextConfig,
  SceneImage,
  SpeakerType,
  SceneAsset,
  AssetType,
  AssetAnimation,
  ShapeType,
  SceneType,
  QuizTheme,
  QuizChoice,
  TextDisplayMode,
  IMAGE_EFFECT_OPTIONS,
  TRANSITION_OPTIONS,
  TEXT_ANIMATION_OPTIONS,
  GEMINI_VOICE_OPTIONS,
  ASSET_ANIMATION_OPTIONS,
  SHAPE_OPTIONS,
  ICON_PRESETS,
  LOTTIE_PRESETS,
  SCENE_TYPE_OPTIONS,
  QUIZ_THEME_OPTIONS,
  TEXT_DISPLAY_MODE_OPTIONS,
  createDefaultAsset,
  formatTime,
} from "@/lib/video-presets";

// 話者オプション（対話モード用のspeaker1/speaker2を含む）
const SPEAKER_OPTIONS: { value: SpeakerType; label: string; icon: string; color: string }[] = [
  { value: "narrator", label: "ナレーター", icon: "🎙️", color: "text-green-400" },
  { value: "host", label: "ホスト", icon: "👤", color: "text-blue-400" },
  { value: "guest", label: "ゲスト", icon: "👥", color: "text-orange-400" },
  { value: "customer", label: "お客様", icon: "💬", color: "text-yellow-400" },
  { value: "expert", label: "専門家", icon: "🎓", color: "text-purple-400" },
  { value: "interviewer", label: "質問者", icon: "🎤", color: "text-cyan-400" },
  { value: "interviewee", label: "回答者", icon: "💭", color: "text-pink-400" },
  // 対話モード用
  { value: "speaker1", label: "話者1（メイン）", icon: "1️⃣", color: "text-green-400" },
  { value: "speaker2", label: "話者2（サブ）", icon: "2️⃣", color: "text-orange-400" },
];

// Google Cloud TTS Voice Options
const GOOGLE_VOICE_OPTIONS = [
  // 女性ボイス
  { value: "ja-JP-Wavenet-A", label: "Wavenet A", short: "WA", gender: "female" as const, color: "text-blue-400" },
  { value: "ja-JP-Wavenet-B", label: "Wavenet B", short: "WB", gender: "female" as const, color: "text-cyan-400" },
  { value: "ja-JP-Neural2-B", label: "Neural2 B", short: "N2B", gender: "female" as const, color: "text-purple-400" },
  // 男性ボイス
  { value: "ja-JP-Wavenet-C", label: "Wavenet C", short: "WC", gender: "male" as const, color: "text-green-400" },
  { value: "ja-JP-Wavenet-D", label: "Wavenet D", short: "WD", gender: "male" as const, color: "text-teal-400" },
  { value: "ja-JP-Neural2-C", label: "Neural2 C", short: "N2C", gender: "male" as const, color: "text-yellow-400" },
  { value: "ja-JP-Neural2-D", label: "Neural2 D", short: "N2D", gender: "male" as const, color: "text-orange-400" },
];

// AivisSpeech Voice Options（ローカル・完全無料）
const AIVIS_VOICE_OPTIONS = [
  // 女性ボイス
  { value: "888753760", label: "まお - ノーマル", short: "まお", gender: "female" as const, color: "text-green-400", styleId: 888753760, icon: "https://assets.aivis-project.com/aivm-models/fd0d9420-7eee-40de-826d-7fe16b562e84/speakers/f6c7343c-a7fd-4d42-b0dc-38fe18c6ab7f/icon.jpg" },
  { value: "888753762", label: "まお - あまあま", short: "甘", gender: "female" as const, color: "text-pink-400", styleId: 888753762, icon: "https://assets.aivis-project.com/aivm-models/fd0d9420-7eee-40de-826d-7fe16b562e84/speakers/f6c7343c-a7fd-4d42-b0dc-38fe18c6ab7f/icon.jpg" },
  { value: "1388823424", label: "凛音エル - ノーマル", short: "エル", gender: "female" as const, color: "text-purple-400", styleId: 1388823424, icon: "https://assets.aivis-project.com/aivm-models/9fc6e37f-b8d4-4df5-93e3-30defd0f00ff/speakers/6b0a0fb6-283c-4b7e-928d-37fda7a639bb/icon.jpg" },
  { value: "345585728", label: "るな - ノーマル", short: "るな", gender: "female" as const, color: "text-cyan-400", styleId: 345585728, icon: "https://assets.aivis-project.com/aivm-models/47d21b9f-7543-4574-b16e-0863646b5bbf/speakers/4ed4bd8e-fb79-4c38-999a-3b6f283397a7/icon.jpg" },
  // 男性ボイス
  { value: "1310138976", label: "阿井田茂 - ノーマル", short: "茂", gender: "male" as const, color: "text-blue-400", styleId: 1310138976, icon: "https://assets.aivis-project.com/aivm-models/d799f1c0-59f3-4b6b-9a65-56715776fc69/speakers/50880d3a-d63e-4a31-ae3f-ab14e0c0b3cb/icon.jpg" },
  { value: "1310138977", label: "阿井田茂 - Calm", short: "穏", gender: "male" as const, color: "text-teal-400", styleId: 1310138977, icon: "https://assets.aivis-project.com/aivm-models/d799f1c0-59f3-4b6b-9a65-56715776fc69/speakers/50880d3a-d63e-4a31-ae3f-ab14e0c0b3cb/icon.jpg" },
  { value: "1618811328", label: "黄金笑 - ノーマル", short: "笑", gender: "male" as const, color: "text-yellow-400", styleId: 1618811328, icon: null },
];

// プロバイダーに応じたボイスオプションを取得
function getVoiceOptionsForProvider(provider: TTSProvider) {
  switch (provider) {
    case "aivis":
      return AIVIS_VOICE_OPTIONS;
    case "google":
      return GOOGLE_VOICE_OPTIONS;
    case "gemini":
    default:
      return GEMINI_VOICE_OPTIONS;
  }
}

// プロバイダーに応じたデフォルトボイスを取得
function getDefaultVoiceForProvider(provider: TTSProvider) {
  switch (provider) {
    case "aivis":
      return "888753760";
    case "google":
      return "ja-JP-Wavenet-A";
    case "gemini":
    default:
      return "Zephyr";
  }
}
import { Image, Type, Mic, FileText, Plus, Trash2, FolderOpen, ChevronDown, ChevronRight, Play, Pause, Eye, X, RefreshCw, BookOpen, Square, Circle, Star, ArrowRight, Sparkles, Shapes, Loader2, Wand2 } from "lucide-react";
import { ImageGalleryModal } from "./ImageGalleryModal";

type TTSProvider = "google" | "elevenlabs" | "gemini" | "aivis";
type ImageModel = "2.5-flash" | "pro";

// 画像モデルオプション
// Note: gemini-3-flash は存在しないため2つに絞った
const IMAGE_MODEL_OPTIONS: { value: ImageModel; label: string; description: string }[] = [
  { value: "2.5-flash", label: "2.5 Flash", description: "高速・1024px" },
  { value: "pro", label: "3 Pro", description: "高品質・4096px" },
];

// プレースホルダーURLかどうかを判定
// 失敗した画像は再生成可能にする
function isPlaceholderImage(url: string | undefined | null): boolean {
  if (!url) return true;
  return url.includes("placehold.co") || url.includes("Image+Pending") || url.includes("Image%20Pending");
}

// 有効な画像URLかどうかを判定
function hasValidImage(url: string | undefined | null): boolean {
  return !!url && !isPlaceholderImage(url);
}

interface CutListProps {
  cuts: CutConfig[];
  onUpdateCut: (cutId: number, updates: Partial<CutConfig>) => void;
  onUpdateAllCuts: (updates: Partial<CutConfig>) => void;
  currentTime?: number;
  onSeekToCut?: (startTime: number) => void;
  onRegenerateAudio?: (cutId: number) => void;
  onOpenDictionary?: (initialText?: string) => void;
  regeneratingCutId?: number | null;
  onGenerateImage?: (cutId: number) => void;
  generatingImageCutId?: number | null;
  onPreviewCut?: (cutId: number) => void;  // 1カットプレビュー
  // バッチ音声生成用のボイス設定
  mainVoiceId?: string;      // メイン話者のボイスID
  secondaryVoiceId?: string; // セカンダリ話者のボイスID
  ttsProvider?: TTSProvider; // TTSプロバイダー
  onTtsProviderChange?: (provider: TTSProvider) => void; // TTSプロバイダー変更コールバック
  mainVoiceName?: string;    // メイン話者の名前（表示用）
  secondaryVoiceName?: string; // サブ話者の名前（表示用）
  // 画像生成モデル
  imageModel?: ImageModel;
  onImageModelChange?: (model: ImageModel) => void;
}

export function CutList({
  cuts,
  onUpdateCut,
  onUpdateAllCuts,
  currentTime = 0,
  onSeekToCut,
  onRegenerateAudio,
  onOpenDictionary,
  regeneratingCutId,
  onGenerateImage,
  generatingImageCutId,
  onPreviewCut,
  mainVoiceId = "Zephyr",
  secondaryVoiceId = "Puck",
  ttsProvider = "gemini",
  onTtsProviderChange,
  mainVoiceName,
  secondaryVoiceName,
  imageModel = "2.5-flash",
  onImageModelChange,
}: CutListProps) {
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [expandedCuts, setExpandedCuts] = useState<Set<number>>(new Set());

  // 音声連続再生用の状態
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 現在再生中のカットを特定
  const currentCutId = cuts.find(
    (cut) => currentTime >= cut.startTime && currentTime < cut.endTime
  )?.id;

  const toggleExpand = (cutId: number) => {
    setExpandedCuts((prev) => {
      const next = new Set(prev);
      if (next.has(cutId)) {
        next.delete(cutId);
      } else {
        next.add(cutId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCuts(new Set(cuts.map((c) => c.id)));
  };

  const collapseAll = () => {
    setExpandedCuts(new Set());
  };

  const handleBulkUpdate = (updates: Partial<CutConfig>) => {
    onUpdateAllCuts(updates);
    setBulkEditMode(false);
  };

  // 音声連続再生機能
  const playNextAudio = (index: number) => {
    // 音声URLがあるカットを探す
    while (index < cuts.length && !cuts[index].voiceUrl) {
      index++;
    }

    if (index >= cuts.length) {
      // 全部再生完了
      setIsPlayingAll(false);
      setPlayingIndex(null);
      return;
    }

    setPlayingIndex(index);
    const audio = new Audio(cuts[index].voiceUrl);
    audioRef.current = audio;

    audio.onended = () => {
      playNextAudio(index + 1);
    };

    audio.onerror = () => {
      // エラー時は次へ
      playNextAudio(index + 1);
    };

    audio.play().catch(() => {
      playNextAudio(index + 1);
    });
  };

  const handlePlayAllAudio = () => {
    if (isPlayingAll) {
      // 停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAll(false);
      setPlayingIndex(null);
    } else {
      // 再生開始
      setIsPlayingAll(true);
      playNextAudio(0);
    }
  };

  // コンポーネントアンマウント時にオーディオを停止
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (cuts.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-500">
        カットが生成されていません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-950 py-2 z-10">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <span>📋</span> カット一覧 ({cuts.length}カット)
        </h3>
        <div className="flex gap-2">
          {/* 音声連続再生ボタン */}
          <button
            onClick={handlePlayAllAudio}
            className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
              isPlayingAll
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title={isPlayingAll ? "停止" : "全音声を連続再生"}
          >
            {isPlayingAll ? (
              <>
                <Pause size={12} />
                {playingIndex !== null && <span>再生中 {playingIndex + 1}/{cuts.length}</span>}
              </>
            ) : (
              <>
                <Play size={12} />
                <span>連続再生</span>
              </>
            )}
          </button>
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            全展開
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            全閉じ
          </button>
          <button
            onClick={() => setBulkEditMode(!bulkEditMode)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              bulkEditMode
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {bulkEditMode ? "一括編集中" : "一括変更"}
          </button>
        </div>
      </div>

      {/* 一括編集パネル */}
      {bulkEditMode && (
        <BulkEditPanel onApply={handleBulkUpdate} onCancel={() => setBulkEditMode(false)} />
      )}

      {/* カットリスト */}
      <div className="space-y-2">
        {cuts.map((cut) => (
          <CutItem
            key={cut.id}
            cut={cut}
            isPlaying={cut.id === currentCutId}
            isExpanded={expandedCuts.has(cut.id)}
            onToggleExpand={() => toggleExpand(cut.id)}
            onUpdate={(updates) => onUpdateCut(cut.id, updates)}
            onSeek={() => onSeekToCut?.(cut.startTime)}
            onRegenerateAudio={() => onRegenerateAudio?.(cut.id)}
            onOpenDictionary={onOpenDictionary}
            isRegenerating={regeneratingCutId === cut.id}
            onGenerateImage={() => onGenerateImage?.(cut.id)}
            isGeneratingImage={generatingImageCutId === cut.id}
            onPreviewCut={() => onPreviewCut?.(cut.id)}
            mainVoiceId={mainVoiceId}
            secondaryVoiceId={secondaryVoiceId}
            ttsProvider={ttsProvider}
            onTtsProviderChange={onTtsProviderChange}
            mainVoiceName={mainVoiceName}
            secondaryVoiceName={secondaryVoiceName}
            imageModel={imageModel}
            onImageModelChange={onImageModelChange}
          />
        ))}
      </div>
    </div>
  );
}

// カットアイテム
interface CutItemProps {
  cut: CutConfig;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<CutConfig>) => void;
  onSeek: () => void;
  onRegenerateAudio?: () => void;
  onOpenDictionary?: (initialText?: string) => void;
  isRegenerating?: boolean;
  onGenerateImage?: () => void;
  isGeneratingImage?: boolean;
  onPreviewCut?: () => void;  // 1カットプレビュー
  mainVoiceId: string;
  secondaryVoiceId: string;
  ttsProvider: TTSProvider;
  onTtsProviderChange?: (provider: TTSProvider) => void;
  mainVoiceName?: string;
  secondaryVoiceName?: string;
  imageModel: ImageModel;
  onImageModelChange?: (model: ImageModel) => void;
}

// メインテキストタイプのオプション
const MAIN_TEXT_TYPE_OPTIONS: { value: MainTextType; label: string; icon: string }[] = [
  { value: "title", label: "タイトル", icon: "📝" },
  { value: "quiz", label: "クイズ", icon: "❓" },
  { value: "bullet", label: "箇条書き", icon: "📋" },
  { value: "highlight", label: "強調", icon: "⭐" },
];

function CutItem({ cut, isPlaying, isExpanded, onToggleExpand, onUpdate, onSeek, onRegenerateAudio, onOpenDictionary, isRegenerating, onGenerateImage, isGeneratingImage, onPreviewCut, mainVoiceId, secondaryVoiceId, ttsProvider, onTtsProviderChange, mainVoiceName, secondaryVoiceName, imageModel, onImageModelChange }: CutItemProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false); // 画像プロンプト展開状態
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio playback
  const handlePlayAudio = () => {
    if (!cut.voiceUrl) return;

    // If audio ref exists and is playing the same URL, toggle play/pause
    if (audioRef.current && audioRef.current.src.endsWith(cut.voiceUrl.split('/').pop() || '')) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play().catch(e => {
          console.error('[Audio] Playback failed:', e);
          setIsAudioPlaying(false);
        });
        setIsAudioPlaying(true);
      }
    } else {
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Create new audio element
      const audio = new Audio(cut.voiceUrl);
      audioRef.current = audio;
      audio.onended = () => setIsAudioPlaying(false);
      audio.onerror = (e) => {
        console.error('[Audio] Error loading audio:', e);
        setIsAudioPlaying(false);
      };
      audio.play().catch(e => {
        console.error('[Audio] Playback failed:', e);
        setIsAudioPlaying(false);
      });
      setIsAudioPlaying(true);
    }
  };

  // Reset audio when voiceUrl changes or component unmounts
  useEffect(() => {
    // Reset when voiceUrl changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsAudioPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cut.voiceUrl]);

  // メインテキストの行を更新
  const handleMainTextLinesChange = (lines: string[]) => {
    onUpdate({
      mainText: {
        ...cut.mainText,
        type: cut.mainText?.type || "title",
        lines,
      },
    });
  };

  // メインテキストタイプを更新
  const handleMainTextTypeChange = (type: MainTextType) => {
    onUpdate({
      mainText: {
        ...cut.mainText,
        type,
        lines: cut.mainText?.lines || [],
      },
    });
  };

  // 画像を追加
  const handleAddImage = (source: "generated" | "gallery") => {
    if (source === "gallery") {
      setShowGallery(true);
      return;
    }
    const newImage: SceneImage = {
      id: `img-${Date.now()}`,
      source,
      prompt: source === "generated" ? cut.imagePrompt || "" : undefined,
    };
    onUpdate({
      images: [...(cut.images || []), newImage],
    });
  };

  // ギャラリーから画像を選択
  const handleSelectFromGallery = (imageUrl: string) => {
    const newImage: SceneImage = {
      id: `img-${Date.now()}`,
      source: "gallery",
      url: imageUrl,
    };
    onUpdate({
      images: [...(cut.images || []), newImage],
    });
  };

  // 画像を削除
  const handleRemoveImage = (imageId: string) => {
    onUpdate({
      images: (cut.images || []).filter((img) => img.id !== imageId),
    });
  };

  // 画像プロンプトを更新
  const handleImagePromptChange = (imageId: string, prompt: string) => {
    onUpdate({
      images: (cut.images || []).map((img) =>
        img.id === imageId ? { ...img, prompt } : img
      ),
    });
  };

  // アセットを追加
  const handleAddAsset = (assetType: AssetType) => {
    const newAsset = createDefaultAsset(assetType);
    onUpdate({
      assets: [...(cut.assets || []), newAsset],
    });
  };

  // アセットを削除
  const handleRemoveAsset = (assetId: string) => {
    onUpdate({
      assets: (cut.assets || []).filter((a) => a.id !== assetId),
    });
  };

  // アセットを更新
  const handleUpdateAsset = (assetId: string, updates: Partial<SceneAsset>) => {
    onUpdate({
      assets: (cut.assets || []).map((a) =>
        a.id === assetId ? { ...a, ...updates } : a
      ) as SceneAsset[],
    });
  };

  const hasContent = cut.mainText?.lines?.length || cut.subtitle || cut.voiceText || cut.images?.length;

  return (
    <div
      className={`rounded-lg border transition-all ${
        isPlaying
          ? "bg-blue-900/30 border-blue-500"
          : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
      }`}
    >
      {/* ヘッダー行 - 常にクリック可能 */}
      <div className="flex items-center gap-2 p-2">
        {/* 音声再生ボタン（一番左） */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlayAudio();
          }}
          disabled={!cut.voiceUrl}
          className={`p-1.5 rounded transition-colors ${
            cut.voiceUrl
              ? isAudioPlaying
                ? "bg-green-500 text-white"
                : "bg-green-600/30 text-green-400 hover:bg-green-600/50"
              : "bg-gray-700/30 text-gray-600 cursor-not-allowed"
          }`}
          title={cut.voiceUrl ? (isAudioPlaying ? "停止" : "再生") : "音声未生成"}
        >
          {isAudioPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        {/* 展開/閉じるボタン */}
        <button
          onClick={onToggleExpand}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* カット番号とタイム */}
        <button
          onClick={onSeek}
          className="flex items-center gap-2 text-xs hover:text-blue-400 transition-colors"
        >
          <span className="text-gray-500 font-mono">#{cut.id.toString().padStart(2, "00")}</span>
          <span className="text-gray-400">
            [{formatTime(cut.startTime)}-{formatTime(cut.endTime)}]
          </span>
        </button>

        {/* 1カットプレビューボタン */}
        {onPreviewCut && (
          <button
            onClick={onPreviewCut}
            className="px-2 py-0.5 text-xs bg-purple-600/30 text-purple-300 rounded hover:bg-purple-600/50 transition-colors flex items-center gap-1"
            title="このカットだけプレビュー"
          >
            <Play className="w-3 h-3" />
            <span>プレビュー</span>
          </button>
        )}

        {/* エフェクトボタン（直接クリック可能） */}
        <div className="flex-1 flex items-center gap-1">
          {IMAGE_EFFECT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onUpdate({ imageEffect: option.value })}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                cut.imageEffect === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
              }`}
              title={option.label}
            >
              {option.icon}
            </button>
          ))}
          <span className="text-gray-600 mx-1">|</span>
          {TEXT_ANIMATION_OPTIONS.slice(0, 4).map((option) => (
            <button
              key={option.value}
              onClick={() => onUpdate({ textAnimation: option.value })}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                cut.textAnimation === option.value
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
              }`}
              title={option.label}
            >
              {option.icon}
            </button>
          ))}
          <span className="text-gray-600 mx-1">|</span>
          {TRANSITION_OPTIONS.slice(0, 4).map((option) => (
            <button
              key={option.value}
              onClick={() => onUpdate({ transition: option.value })}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                cut.transition === option.value
                  ? "bg-green-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
              }`}
              title={option.label}
            >
              {option.icon}
            </button>
          ))}
        </div>

        {/* コンテンツ有無 & 生成状況インジケーター */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* 話者＋ボイスインジケーター（常に表示、男女がわかるように） */}
          {(() => {
            const speaker = cut.speaker || "narrator";
            const speakerInfo = SPEAKER_OPTIONS.find(o => o.value === speaker);
            // speakerに基づいて使用するボイスを決定（バッチ生成と同じロジック）
            const isSecondaryVoice = ["speaker2", "guest", "customer"].includes(speaker);
            // カット個別のvoiceIdがあればそれを優先、なければspeakerに基づいてメイン/セカンダリを使用
            const effectiveVoiceId = cut.voiceId || (isSecondaryVoice ? secondaryVoiceId : mainVoiceId);

            // プロバイダーに応じて話者名を取得
            let voiceName: string;
            let isMale: boolean;

            if (ttsProvider === "aivis") {
              // AivisSpeechの場合、渡された話者名を使用
              voiceName = isSecondaryVoice ? (secondaryVoiceName || "阿井田茂") : (mainVoiceName || "まお");
              // AivisSpeechの男性声ID（阿井田茂、黄金笑）
              const maleStyleIds = ["1310138976", "1310138977", "1310138978", "1310138979", "1310138980", "1310138981", "1310138982", "1618811328", "1618811329", "1618811330"];
              isMale = maleStyleIds.includes(effectiveVoiceId);
            } else if (ttsProvider === "google") {
              // Google TTSの場合
              const voiceInfo = GOOGLE_VOICE_OPTIONS.find(v => v.value === effectiveVoiceId);
              voiceName = voiceInfo?.label || effectiveVoiceId;
              isMale = voiceInfo?.gender === "male";
            } else {
              // Gemini/ElevenLabsの場合
              const voiceInfo = GEMINI_VOICE_OPTIONS.find(v => v.value === effectiveVoiceId);
              voiceName = voiceInfo?.label || effectiveVoiceId;
              isMale = voiceInfo?.gender === "male";
            }

            const genderSymbol = isMale ? "♂" : "♀";
            const genderBg = isMale ? "bg-blue-500/30 border-blue-500/50" : "bg-pink-500/30 border-pink-500/50";
            const genderText = isMale ? "text-blue-300" : "text-pink-300";

            return (
              <span
                className={`px-1.5 py-0.5 rounded border ${genderBg} ${genderText} flex items-center gap-1`}
                title={`${speakerInfo?.label || speaker} / ${voiceName}`}
              >
                <span className="text-sm">{genderSymbol}</span>
                <span className="text-[10px] font-medium">{voiceName.slice(0, 4)}</span>
              </span>
            );
          })()}
          {/* 画像: プロンプトあり/生成済み */}
          <span
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded ${
              cut.imageUrl
                ? "bg-orange-500/20 text-orange-400"
                : (cut.imagePrompt || cut.images?.[0]?.prompt)
                  ? "bg-gray-700/50 text-gray-400"
                  : "text-gray-600"
            }`}
            title={hasValidImage(cut.imageUrl) ? "画像生成済み" : (cut.imagePrompt ? "プロンプトあり" : "画像なし")}
          >
            🖼️{hasValidImage(cut.imageUrl) && "✓"}
          </span>
          {/* 音声: テキストあり/生成済み */}
          <span
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded ${
              cut.voiceUrl
                ? "bg-green-500/20 text-green-400"
                : cut.voiceText
                  ? "bg-gray-700/50 text-gray-400"
                  : "text-gray-600"
            }`}
            title={cut.voiceUrl ? "音声生成済み" : (cut.voiceText ? "テキストあり" : "音声なし")}
          >
            🔊{cut.voiceUrl && "✓"}
          </span>
        </div>
      </div>

      {/* 展開時のコンテンツ */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-700/50">
          {/* シーンタイプ選択 */}
          <div className="pt-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">シーンタイプ:</span>
            <div className="flex gap-1">
              {SCENE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdate({ sceneType: option.value })}
                  className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                    (cut.sceneType || "normal") === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
                  }`}
                  title={option.description}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* テキスト表示モード選択 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">テキスト表示:</span>
            <div className="flex gap-1">
              {TEXT_DISPLAY_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdate({ textDisplayMode: option.value })}
                  className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                    (cut.textDisplayMode || "word-bounce") === option.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
                  }`}
                  title={option.description}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* クイズシーン設定 */}
          {cut.sceneType === "quiz" && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xs font-medium">❓ クイズ設定</span>
                <div className="flex gap-1 ml-auto">
                  {QUIZ_THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => onUpdate({ quizTheme: theme.value })}
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        (cut.quizTheme || "quiz") === theme.value
                          ? `bg-${theme.color.replace("text-", "").replace("-400", "-600")} text-white`
                          : `bg-gray-700 ${theme.color} hover:bg-gray-600`
                      }`}
                      title={theme.label}
                    >
                      {theme.icon}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={cut.quizQuestion || ""}
                onChange={(e) => onUpdate({ quizQuestion: e.target.value })}
                placeholder="質問文を入力..."
                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">選択肢（改行で区切り）</span>
                  <span className="text-[10px] text-gray-500">正解: {(cut.quizHighlightIndex ?? -1) + 1 || "なし"}</span>
                </div>
                <textarea
                  value={(cut.quizChoices || []).map(c => c.text).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter(l => l.trim());
                    onUpdate({
                      quizChoices: lines.map(text => ({ text }))
                    });
                  }}
                  placeholder="選択肢A&#10;選択肢B&#10;選択肢C"
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-1 flex-wrap">
                  {(cut.quizChoices || []).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => onUpdate({ quizHighlightIndex: cut.quizHighlightIndex === idx ? undefined : idx })}
                      className={`px-2 py-0.5 text-xs rounded ${
                        cut.quizHighlightIndex === idx
                          ? "bg-green-600 text-white"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}が正解
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 問題提起シーン設定 */}
          {cut.sceneType === "problem" && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-medium">😰 問題提起設定</span>
              </div>
              <input
                type="text"
                value={cut.problemHeadline || ""}
                onChange={(e) => onUpdate({ problemHeadline: e.target.value })}
                placeholder="見出し（例：こんな悩みありませんか？）"
                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div>
                <span className="text-[10px] text-gray-500 mb-1 block">問題リスト（改行で区切り）</span>
                <textarea
                  value={(cut.problemItems || []).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter(l => l.trim());
                    onUpdate({ problemItems: lines });
                  }}
                  placeholder="時間がない&#10;難しすぎる&#10;続かない"
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* テキストのみシーン説明 */}
          {cut.sceneType === "text" && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3">
              <p className="text-purple-400 text-xs">
                📝 テキストのみシーン: 画像なしで、字幕テキストが単語ごとにアニメーション表示されます。
                下の「字幕/テロップ」に表示したいテキストを入力してください。
              </p>
            </div>
          )}

          {/* コンテンツグリッド */}
          <div className="grid grid-cols-2 gap-3">
            {/* 左カラム: テキスト類 */}
            <div className="space-y-2">
              {/* メインテキスト */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Type className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">メインテキスト</span>
                  <div className="flex gap-1 ml-auto">
                    {MAIN_TEXT_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleMainTextTypeChange(option.value)}
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          cut.mainText?.type === option.value
                            ? "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                        title={option.label}
                      >
                        {option.icon}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={cut.mainText?.lines?.join("\n") || ""}
                  onChange={(e) => handleMainTextLinesChange(e.target.value.split("\n"))}
                  placeholder="メインテキスト（行ごとに入力）"
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                />
              </div>

              {/* 字幕 */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blue-400">字幕/テロップ</span>
                </div>
                <input
                  type="text"
                  value={cut.subtitle || ""}
                  onChange={(e) => onUpdate({ subtitle: e.target.value })}
                  placeholder="画面下部に表示する字幕"
                  className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 音声テキスト */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-purple-400">音声テキスト</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {/* 辞書登録ボタン */}
                    <button
                      onClick={() => onOpenDictionary?.(cut.voiceText || "")}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                      title="読み辞書に登録"
                    >
                      <BookOpen className="w-3 h-3" />
                      辞書
                    </button>
                    {/* 音声再生成ボタン */}
                    <button
                      onClick={() => onRegenerateAudio?.()}
                      disabled={!cut.voiceText || isRegenerating}
                      className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
                        isRegenerating
                          ? "bg-purple-600 text-white cursor-wait"
                          : "bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                      title={isRegenerating ? "再生成中..." : "このカットの音声を再生成"}
                    >
                      <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} />
                      {isRegenerating ? "再生成中..." : "再生成"}
                    </button>
                    {cut.voiceUrl && (
                      <>
                        <button
                          onClick={handlePlayAudio}
                          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
                            isAudioPlaying
                              ? "bg-green-500 text-white"
                              : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                          }`}
                        >
                          {isAudioPlaying ? (
                            <>
                              <Pause className="w-3 h-3" />
                              停止
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              再生
                            </>
                          )}
                        </button>
                        <span className="text-xs text-green-400">✓</span>
                      </>
                    )}
                  </div>
                </div>
                <textarea
                  value={cut.voiceText || ""}
                  onChange={(e) => onUpdate({ voiceText: e.target.value })}
                  placeholder="読み上げる文章"
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
                {/* 話者選択 */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-500">話者:</span>
                  {SPEAKER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onUpdate({ speaker: opt.value })}
                      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                        (cut.speaker || "narrator") === opt.value
                          ? `bg-gray-700 ${opt.color} ring-1 ring-current`
                          : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                      }`}
                      title={opt.label}
                    >
                      {opt.icon}
                    </button>
                  ))}
                  <span className={`text-[10px] ${SPEAKER_OPTIONS.find(o => o.value === (cut.speaker || "narrator"))?.color || "text-gray-400"}`}>
                    {SPEAKER_OPTIONS.find(o => o.value === (cut.speaker || "narrator"))?.label}
                  </span>
                </div>
                {/* ボイス選択 - TTSプロバイダーに応じて表示を変更 */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {/* プロバイダー切り替えボタン */}
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => onTtsProviderChange?.("google")}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        ttsProvider === "google"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
                      }`}
                      title="Google Cloud TTS"
                    >
                      Google
                    </button>
                    <button
                      onClick={() => onTtsProviderChange?.("gemini")}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        ttsProvider === "gemini"
                          ? "bg-purple-500 text-white"
                          : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
                      }`}
                      title="Gemini 2.5 TTS（演技指導対応）"
                    >
                      Gemini
                    </button>
                    <button
                      onClick={() => onTtsProviderChange?.("aivis")}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        ttsProvider === "aivis"
                          ? "bg-green-500 text-white"
                          : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
                      }`}
                      title="AivisSpeech（ローカル・完全無料）"
                    >
                      Aivis
                    </button>
                  </div>
                  {(() => {
                    const voiceOptions = getVoiceOptionsForProvider(ttsProvider);
                    const defaultVoice = getDefaultVoiceForProvider(ttsProvider);
                    const effectiveVoiceId = cut.voiceId || defaultVoice;
                    const selectedVoice = voiceOptions.find(v => v.value === effectiveVoiceId);

                    if (ttsProvider === "aivis") {
                      // Aivis: アイコン付きボタン
                      return (
                        <>
                          <div className="flex gap-1 items-center">
                            <span className="text-[9px] text-pink-400/50">♀</span>
                            {AIVIS_VOICE_OPTIONS.filter(v => v.gender === "female").map((voice) => (
                              <button
                                key={voice.value}
                                onClick={() => onUpdate({ voiceId: voice.value })}
                                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${
                                  effectiveVoiceId === voice.value
                                    ? `bg-gray-700 ${voice.color} ring-1 ring-current`
                                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                                }`}
                                title={voice.label}
                              >
                                {voice.icon && <img src={voice.icon} alt="" className="w-3 h-3 rounded-full" />}
                                {voice.short}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1 items-center">
                            <span className="text-[9px] text-blue-400/50">♂</span>
                            {AIVIS_VOICE_OPTIONS.filter(v => v.gender === "male").map((voice) => (
                              <button
                                key={voice.value}
                                onClick={() => onUpdate({ voiceId: voice.value })}
                                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${
                                  effectiveVoiceId === voice.value
                                    ? `bg-gray-700 ${voice.color} ring-1 ring-current`
                                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                                }`}
                                title={voice.label}
                              >
                                {voice.icon && <img src={voice.icon} alt="" className="w-3 h-3 rounded-full" />}
                                {voice.short}
                              </button>
                            ))}
                          </div>
                          <span className={`text-[10px] ${selectedVoice?.color || "text-gray-400"}`}>
                            {selectedVoice?.label || "話者設定で選択"}
                          </span>
                        </>
                      );
                    } else {
                      // Gemini / Google: 短縮名ボタン
                      if (ttsProvider === "google") {
                        return (
                          <>
                            <div className="flex gap-1">
                              <span className="text-[9px] text-pink-400/50">♀</span>
                              {GOOGLE_VOICE_OPTIONS.filter(v => v.gender === "female").map((voice) => (
                                <button
                                  key={voice.value}
                                  onClick={() => onUpdate({ voiceId: voice.value })}
                                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                                    effectiveVoiceId === voice.value
                                      ? `bg-gray-700 ${voice.color} ring-1 ring-current`
                                      : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                                  }`}
                                  title={voice.label}
                                >
                                  {voice.short}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              <span className="text-[9px] text-blue-400/50">♂</span>
                              {GOOGLE_VOICE_OPTIONS.filter(v => v.gender === "male").map((voice) => (
                                <button
                                  key={voice.value}
                                  onClick={() => onUpdate({ voiceId: voice.value })}
                                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                                    effectiveVoiceId === voice.value
                                      ? `bg-gray-700 ${voice.color} ring-1 ring-current`
                                      : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                                  }`}
                                  title={voice.label}
                                >
                                  {voice.short}
                                </button>
                              ))}
                            </div>
                            <span className={`text-[10px] ${selectedVoice?.color || "text-gray-400"}`}>
                              {selectedVoice?.label || effectiveVoiceId}
                            </span>
                          </>
                        );
                      }
                      // Gemini: 2文字短縮名
                      return (
                        <>
                          <div className="flex gap-1">
                            <span className="text-[9px] text-pink-400/50">♀</span>
                            {GEMINI_VOICE_OPTIONS.filter(v => v.gender === "female").map((voice) => (
                              <button
                                key={voice.value}
                                onClick={() => onUpdate({ voiceId: voice.value })}
                                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                                  effectiveVoiceId === voice.value
                                    ? `bg-gray-700 ${voice.color} ring-1 ring-current`
                                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                                }`}
                                title={voice.label}
                              >
                                {voice.value.slice(0, 2)}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <span className="text-[9px] text-blue-400/50">♂</span>
                            {GEMINI_VOICE_OPTIONS.filter(v => v.gender === "male").map((voice) => (
                              <button
                                key={voice.value}
                                onClick={() => onUpdate({ voiceId: voice.value })}
                                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                                  effectiveVoiceId === voice.value
                                    ? `bg-gray-700 ${voice.color} ring-1 ring-current`
                                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                                }`}
                                title={voice.label}
                              >
                                {voice.value.slice(0, 2)}
                              </button>
                            ))}
                          </div>
                          <span className={`text-[10px] ${selectedVoice?.color || "text-gray-400"}`}>
                            {selectedVoice?.label || effectiveVoiceId}
                          </span>
                        </>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* 演技指導 (Voice Style) - Gemini TTS専用 */}
              {ttsProvider === "gemini" && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">🎭</span>
                    <span className="text-xs text-pink-400">演技指導</span>
                    <span className="text-[10px] text-gray-500 ml-auto">Gemini 2.5 TTS用</span>
                  </div>
                  <input
                    type="text"
                    value={cut.voiceStyle || ""}
                    onChange={(e) => onUpdate({ voiceStyle: e.target.value })}
                    placeholder="例: 明るく元気に、ワクワクした気持ちで"
                    className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              )}
            </div>

            {/* 右カラム: 画像 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400">画像</span>
                {hasValidImage(cut.imageUrl) && (
                  <button
                    onClick={() => setShowImagePreview(true)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-600/20 text-orange-400 rounded hover:bg-orange-600/30"
                  >
                    <Eye className="w-3 h-3" />
                    プレビュー
                  </button>
                )}
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => handleAddImage("generated")}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30"
                  >
                    <Plus className="w-3 h-3" /> AI
                  </button>
                  <button
                    onClick={() => handleAddImage("gallery")}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                  >
                    <FolderOpen className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 画像サムネイル一覧（生成済み画像を横並びで表示） */}
              {(hasValidImage(cut.imageUrl) || (cut.images || []).some(img => img.url)) && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {/* メイン画像 (cut.imageUrl) */}
                  {hasValidImage(cut.imageUrl) && (
                    <div className="relative flex-shrink-0 group">
                      <img
                        src={cut.imageUrl}
                        alt={`シーン ${cut.id} メイン`}
                        className="w-20 h-14 object-cover rounded border border-orange-500/50 cursor-pointer hover:border-orange-400 transition-colors"
                        onClick={() => setShowImagePreview(true)}
                      />
                      <div className="absolute top-0.5 left-0.5 bg-orange-500/90 text-white text-[8px] px-1 py-0.5 rounded">
                        メイン
                      </div>
                    </div>
                  )}
                  {/* 追加画像 (cut.images[].url) */}
                  {(cut.images || []).filter(img => img.url).map((img, idx) => (
                    <div key={img.id} className="relative flex-shrink-0 group">
                      <img
                        src={img.url}
                        alt={`シーン ${cut.id} 画像 ${idx + 1}`}
                        className="w-20 h-14 object-cover rounded border border-blue-500/50 cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => window.open(img.url, '_blank')}
                      />
                      <div className="absolute top-0.5 left-0.5 bg-blue-500/90 text-white text-[8px] px-1 py-0.5 rounded">
                        #{idx + 1}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 画像プロンプトリスト */}
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {(cut.images || []).length === 0 && !hasValidImage(cut.imageUrl) && !cut.imagePrompt ? (
                  <div className="text-xs text-gray-500 text-center py-3 bg-gray-900 rounded border border-dashed border-gray-700">
                    画像がありません
                  </div>
                ) : (
                  <>
                    {/* メイン画像プロンプト */}
                    {(cut.imagePrompt || hasValidImage(cut.imageUrl)) && (
                      <div className="bg-gray-900 rounded p-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-orange-400 font-medium flex-shrink-0">メイン</span>
                          {/* 展開時: textarea / 非展開時: クリックで展開するinput */}
                          {isPromptExpanded ? (
                            <textarea
                              value={cut.imagePrompt || ""}
                              onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
                              onBlur={() => setIsPromptExpanded(false)}
                              placeholder="画像プロンプト"
                              className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-orange-500 rounded text-white resize-none min-h-[60px]"
                              autoFocus
                              rows={3}
                            />
                          ) : (
                            <input
                              type="text"
                              value={cut.imagePrompt || ""}
                              onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
                              onClick={() => setIsPromptExpanded(true)}
                              placeholder="画像プロンプト（クリックで展開）"
                              className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white cursor-pointer hover:border-orange-500/50 transition-colors"
                              title="クリックして展開"
                            />
                          )}
                          {/* 画像モデル選択 */}
                          <div className="flex gap-0.5 flex-shrink-0">
                            {IMAGE_MODEL_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => onImageModelChange?.(opt.value)}
                                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                                  imageModel === opt.value
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-700/50 text-gray-400 hover:bg-gray-600"
                                }`}
                                title={opt.description}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {/* 画像生成ボタン */}
                          <button
                            onClick={onGenerateImage}
                            disabled={isGeneratingImage || !cut.imagePrompt?.trim()}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all flex-shrink-0 ${
                              isGeneratingImage
                                ? "bg-orange-600/50 text-orange-300 cursor-wait"
                                : cut.imagePrompt?.trim()
                                  ? "bg-orange-600 text-white hover:bg-orange-500"
                                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
                            }`}
                            title={hasValidImage(cut.imageUrl) ? "画像を再生成" : "画像を生成"}
                          >
                            {isGeneratingImage ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>生成中</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3" />
                                <span>{hasValidImage(cut.imageUrl) ? "再生成" : "生成"}</span>
                              </>
                            )}
                          </button>
                          {hasValidImage(cut.imageUrl) && <span className="text-[10px] text-green-400">✓</span>}
                        </div>
                      </div>
                    )}
                    {/* 追加画像プロンプト */}
                    {(cut.images || []).map((img, idx) => (
                      <div key={img.id} className="flex items-center gap-2 bg-gray-900 rounded p-1.5">
                        <span className="text-[10px] text-blue-400 font-medium flex-shrink-0">#{idx + 1}</span>
                        {img.source === "generated" ? (
                          <input
                            type="text"
                            value={img.prompt || ""}
                            onChange={(e) => handleImagePromptChange(img.id, e.target.value)}
                            placeholder="プロンプト"
                            className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white"
                          />
                        ) : (
                          <span className="flex-1 text-xs text-gray-400 truncate">
                            {img.url?.split("/").pop() || "ギャラリー画像"}
                          </span>
                        )}
                        {img.url && <span className="text-[10px] text-green-400">✓</span>}
                        <button
                          onClick={() => handleRemoveImage(img.id)}
                          className="p-0.5 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* アセットセクション（図形・アイコン・テキスト・Lottie・SVG） */}
          <div className="border-t border-gray-700/50 pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Shapes className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-cyan-400">アセット（図形・アイコン・テキスト）</span>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => handleAddAsset("shape")}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/30"
                  title="図形を追加"
                >
                  <Square className="w-3 h-3" /> 図形
                </button>
                <button
                  onClick={() => handleAddAsset("icon")}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
                  title="アイコンを追加"
                >
                  <Star className="w-3 h-3" /> アイコン
                </button>
                <button
                  onClick={() => handleAddAsset("text")}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30"
                  title="テキストを追加"
                >
                  <Type className="w-3 h-3" /> テキスト
                </button>
                <button
                  onClick={() => handleAddAsset("lottie")}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-pink-600/20 text-pink-400 rounded hover:bg-pink-600/30"
                  title="Lottieを追加"
                >
                  <Sparkles className="w-3 h-3" /> Lottie
                </button>
              </div>
            </div>

            {/* アセット一覧 */}
            {(cut.assets || []).length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-3 bg-gray-900 rounded border border-dashed border-gray-700">
                アセットがありません（上のボタンで追加）
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(cut.assets || []).map((asset, idx) => (
                  <AssetItem
                    key={asset.id}
                    asset={asset}
                    index={idx}
                    onUpdate={(updates) => handleUpdateAsset(asset.id, updates)}
                    onRemove={() => handleRemoveAsset(asset.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ギャラリーモーダル */}
      <ImageGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={handleSelectFromGallery}
      />

      {/* 画像プレビューモーダル */}
      {showImagePreview && hasValidImage(cut.imageUrl) && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={cut.imageUrl}
              alt={`シーン ${cut.id} の画像`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="mt-2 text-center text-sm text-gray-400">
              シーン #{cut.id} | {cut.imagePrompt?.slice(0, 100)}...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 一括編集パネル
interface BulkEditPanelProps {
  onApply: (updates: Partial<CutConfig>) => void;
  onCancel: () => void;
}

function BulkEditPanel({ onApply, onCancel }: BulkEditPanelProps) {
  const [selectedImageEffect, setSelectedImageEffect] = useState<ImageEffect | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<SceneTransition | null>(null);
  const [selectedTextAnimation, setSelectedTextAnimation] = useState<TextAnimation | null>(null);

  const handleApply = () => {
    const updates: Partial<CutConfig> = {};
    if (selectedImageEffect) updates.imageEffect = selectedImageEffect;
    if (selectedTransition) updates.transition = selectedTransition;
    if (selectedTextAnimation) updates.textAnimation = selectedTextAnimation;

    if (Object.keys(updates).length > 0) {
      onApply(updates);
    }
  };

  return (
    <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30 space-y-3">
      <h4 className="text-sm font-medium text-blue-300">一括変更</h4>

      <div className="grid grid-cols-3 gap-3">
        {/* 画像エフェクト */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">画像エフェクト</label>
          <div className="flex flex-wrap gap-1">
            {IMAGE_EFFECT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSelectedImageEffect(
                    selectedImageEffect === option.value ? null : option.value
                  )
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedImageEffect === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {/* トランジション */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">トランジション</label>
          <div className="flex flex-wrap gap-1">
            {TRANSITION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSelectedTransition(
                    selectedTransition === option.value ? null : option.value
                  )
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTransition === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {/* 字幕アニメーション */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">字幕アニメ</label>
          <div className="flex flex-wrap gap-1">
            {TEXT_ANIMATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setSelectedTextAnimation(
                    selectedTextAnimation === option.value ? null : option.value
                  )
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTextAnimation === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                title={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleApply}
          disabled={!selectedImageEffect && !selectedTransition && !selectedTextAnimation}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          全カットに適用
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// アセットアイテム
interface AssetItemProps {
  asset: SceneAsset;
  index: number;
  onUpdate: (updates: Partial<SceneAsset>) => void;
  onRemove: () => void;
}

function AssetItem({ asset, index, onUpdate, onRemove }: AssetItemProps) {
  const getAssetIcon = () => {
    switch (asset.type) {
      case "shape": return <Square className="w-3 h-3 text-cyan-400" />;
      case "icon": return <Star className="w-3 h-3 text-purple-400" />;
      case "text": return <Type className="w-3 h-3 text-yellow-400" />;
      case "lottie": return <Sparkles className="w-3 h-3 text-pink-400" />;
      case "svg": return <Circle className="w-3 h-3 text-green-400" />;
    }
  };

  const getAssetLabel = () => {
    switch (asset.type) {
      case "shape": return `図形: ${(asset as any).shapeType || "rectangle"}`;
      case "icon": return `アイコン: ${(asset as any).iconName || "star"}`;
      case "text": return `テキスト: ${((asset as any).text || "").slice(0, 10)}...`;
      case "lottie": return `Lottie: ${(asset as any).lottieId || "confetti"}`;
      case "svg": return `SVG: ${(asset as any).svgId || "checkmark"}`;
    }
  };

  const getTypeColor = () => {
    switch (asset.type) {
      case "shape": return "border-cyan-500/50 bg-cyan-500/10";
      case "icon": return "border-purple-500/50 bg-purple-500/10";
      case "text": return "border-yellow-500/50 bg-yellow-500/10";
      case "lottie": return "border-pink-500/50 bg-pink-500/10";
      case "svg": return "border-green-500/50 bg-green-500/10";
    }
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded border ${getTypeColor()}`}>
      {/* アイコンとラベル */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getAssetIcon()}
        <span className="text-xs text-gray-300 truncate">{getAssetLabel()}</span>
      </div>

      {/* アニメーション選択 */}
      <select
        value={asset.animation}
        onChange={(e) => onUpdate({ animation: e.target.value as AssetAnimation })}
        className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white"
      >
        {ASSET_ANIMATION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.icon} {opt.label}
          </option>
        ))}
      </select>

      {/* 位置入力（簡易） */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={asset.position.x}
          onChange={(e) => onUpdate({ position: { ...asset.position, x: Number(e.target.value) } })}
          className="w-12 px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-white text-center"
          min={0}
          max={100}
          title="X位置 (%)"
        />
        <span className="text-gray-500 text-xs">x</span>
        <input
          type="number"
          value={asset.position.y}
          onChange={(e) => onUpdate({ position: { ...asset.position, y: Number(e.target.value) } })}
          className="w-12 px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-white text-center"
          min={0}
          max={100}
          title="Y位置 (%)"
        />
      </div>

      {/* 個別設定（タイプ別） */}
      {asset.type === "shape" && (
        <select
          value={(asset as any).shapeType || "rectangle"}
          onChange={(e) => onUpdate({ shapeType: e.target.value } as any)}
          className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white"
        >
          {SHAPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.icon} {opt.label}
            </option>
          ))}
        </select>
      )}

      {asset.type === "icon" && (
        <select
          value={(asset as any).iconName || "star"}
          onChange={(e) => onUpdate({ iconName: e.target.value } as any)}
          className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white"
        >
          {ICON_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {asset.type === "text" && (
        <input
          type="text"
          value={(asset as any).text || ""}
          onChange={(e) => onUpdate({ text: e.target.value } as any)}
          className="w-24 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white"
          placeholder="テキスト"
        />
      )}

      {asset.type === "lottie" && (
        <select
          value={(asset as any).lottieId || "confetti"}
          onChange={(e) => onUpdate({ lottieId: e.target.value } as any)}
          className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white"
        >
          {LOTTIE_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* 色設定 */}
      {(asset.type === "shape" || asset.type === "icon" || asset.type === "text") && (
        <input
          type="color"
          value={(asset as any).fillColor || (asset as any).color || "#3B82F6"}
          onChange={(e) => {
            if (asset.type === "shape") {
              onUpdate({ fillColor: e.target.value } as any);
            } else {
              onUpdate({ color: e.target.value } as any);
            }
          }}
          className="w-6 h-6 rounded cursor-pointer"
          title="色"
        />
      )}

      {/* 削除ボタン */}
      <button
        onClick={onRemove}
        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
        title="削除"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
