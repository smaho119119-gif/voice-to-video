"use client";

import { useState } from "react";
import {
  CutConfig,
  ImageEffect,
  SceneTransition,
  TextAnimation,
  MainTextType,
  MainTextConfig,
  SceneImage,
  IMAGE_EFFECT_OPTIONS,
  TRANSITION_OPTIONS,
  TEXT_ANIMATION_OPTIONS,
  formatTime,
} from "@/lib/video-presets";
import { Image, Type, Mic, FileText, Plus, Trash2, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { ImageGalleryModal } from "./ImageGalleryModal";

interface CutListProps {
  cuts: CutConfig[];
  onUpdateCut: (cutId: number, updates: Partial<CutConfig>) => void;
  onUpdateAllCuts: (updates: Partial<CutConfig>) => void;
  currentTime?: number;
  onSeekToCut?: (startTime: number) => void;
}

export function CutList({
  cuts,
  onUpdateCut,
  onUpdateAllCuts,
  currentTime = 0,
  onSeekToCut,
}: CutListProps) {
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [expandedCuts, setExpandedCuts] = useState<Set<number>>(new Set());

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
}

// メインテキストタイプのオプション
const MAIN_TEXT_TYPE_OPTIONS: { value: MainTextType; label: string; icon: string }[] = [
  { value: "title", label: "タイトル", icon: "📝" },
  { value: "quiz", label: "クイズ", icon: "❓" },
  { value: "bullet", label: "箇条書き", icon: "📋" },
  { value: "highlight", label: "強調", icon: "⭐" },
];

function CutItem({ cut, isPlaying, isExpanded, onToggleExpand, onUpdate, onSeek }: CutItemProps) {
  const [showGallery, setShowGallery] = useState(false);

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
          <span className="text-gray-500 font-mono">#{cut.id.toString().padStart(2, "0")}</span>
          <span className="text-gray-400">
            [{formatTime(cut.startTime)}-{formatTime(cut.endTime)}]
          </span>
        </button>

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

        {/* コンテンツ有無インジケーター */}
        <div className="flex items-center gap-1 text-xs">
          <span className={cut.mainText?.lines?.length ? "text-green-400" : "text-gray-600"}>T</span>
          <span className={cut.subtitle ? "text-blue-400" : "text-gray-600"}>S</span>
          <span className={cut.voiceText ? "text-purple-400" : "text-gray-600"}>V</span>
          <span className={cut.images?.length ? "text-yellow-400" : "text-gray-600"}>I</span>
        </div>
      </div>

      {/* 展開時のコンテンツ */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-700/50">
          {/* コンテンツグリッド */}
          <div className="grid grid-cols-2 gap-3 pt-3">
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
                  {cut.voiceUrl && <span className="text-xs text-green-400 ml-auto">✓ 生成済み</span>}
                </div>
                <textarea
                  value={cut.voiceText || ""}
                  onChange={(e) => onUpdate({ voiceText: e.target.value })}
                  placeholder="読み上げる文章"
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* 演技指導 (Voice Style) */}
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
            </div>

            {/* 右カラム: 画像 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400">画像</span>
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

              {/* 画像リスト */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(cut.images || []).length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4 bg-gray-900 rounded border border-dashed border-gray-700">
                    画像がありません
                  </div>
                ) : (
                  (cut.images || []).map((img, idx) => (
                    <div key={img.id} className="flex items-center gap-2 bg-gray-900 rounded p-1.5">
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
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
                      <button
                        onClick={() => handleRemoveImage(img.id)}
                        className="p-0.5 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ギャラリーモーダル */}
      <ImageGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={handleSelectFromGallery}
      />
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
