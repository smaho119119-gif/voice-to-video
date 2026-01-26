"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Book, ArrowRight } from "lucide-react";

interface ReadingEntry {
  id: string;
  pattern: string;
  reading: string;
  note: string;
}

// デフォルトのエントリー（コードに組み込み済みのもの）
const DEFAULT_ENTRIES: ReadingEntry[] = [
  { id: "default-1", pattern: "119", reading: "いちいちきゅう", note: "スマホ119、住まい119 など" },
  { id: "default-2", pattern: "１１９", reading: "いちいちきゅう", note: "全角版" },
];

// よく使われる読み間違いの例
const COMMON_EXAMPLES = [
  { pattern: "Android", reading: "アンドロイド" },
  { pattern: "iOS", reading: "アイオーエス" },
  { pattern: "AI", reading: "エーアイ" },
  { pattern: "DX", reading: "ディーエックス" },
  { pattern: "FAQ", reading: "エフエーキュー" },
  { pattern: "SNS", reading: "エスエヌエス" },
];

const STORAGE_KEY = "reading-dictionary-custom";

interface ReadingDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
}

export function ReadingDictionaryModal({ isOpen, onClose }: ReadingDictionaryModalProps) {
  const [customEntries, setCustomEntries] = useState<ReadingEntry[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [newReading, setNewReading] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const patternInputRef = useRef<HTMLInputElement>(null);

  // Load custom entries from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setCustomEntries(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load custom reading dictionary:", e);
        }
      }
    }
  }, []);

  // Focus pattern input when modal opens
  useEffect(() => {
    if (isOpen && patternInputRef.current) {
      setTimeout(() => patternInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Save custom entries to localStorage
  const saveEntries = (entries: ReadingEntry[]) => {
    setCustomEntries(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };

  const handleAddEntry = () => {
    if (!newPattern.trim() || !newReading.trim()) return;

    const newEntry: ReadingEntry = {
      id: `custom-${Date.now()}`,
      pattern: newPattern.trim(),
      reading: newReading.trim(),
      note: newNote.trim(),
    };

    saveEntries([...customEntries, newEntry]);

    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // Clear fields after a short delay to ensure state update
    setTimeout(() => {
      setNewPattern("");
      setNewReading("");
      setNewNote("");
      // Focus back to pattern input for next entry
      patternInputRef.current?.focus();
    }, 50);
  };

  const handleDeleteEntry = (id: string) => {
    saveEntries(customEntries.filter((e) => e.id !== id));
  };

  const handleQuickAdd = (pattern: string, reading: string) => {
    // クイック追加：入力欄にセットして、すぐに追加
    const newEntry: ReadingEntry = {
      id: `custom-${Date.now()}`,
      pattern: pattern,
      reading: reading,
      note: "",
    };
    saveEntries([...customEntries, newEntry]);

    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // Handle Enter key to add entry
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newPattern.trim() && newReading.trim()) {
      e.preventDefault();
      handleAddEntry();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">読み辞書</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 新規追加フォーム（上に移動、大きく） */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-300 mb-3">新しい読み方を追加</h3>

            {/* メイン入力エリア */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">読み間違いの単語</label>
                <input
                  ref={patternInputRef}
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="例: Android"
                  className="w-full px-4 py-3 text-base bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-500 flex-shrink-0 mt-5" />
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">正しい読み方</label>
                <input
                  type="text"
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="例: アンドロイド"
                  className="w-full px-4 py-3 text-base bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* メモ欄とボタン */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メモ（任意）"
                className="flex-1 px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {/* クリアボタン */}
              {(newPattern || newReading || newNote) && (
                <button
                  onClick={() => {
                    setNewPattern("");
                    setNewReading("");
                    setNewNote("");
                    patternInputRef.current?.focus();
                  }}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  title="入力をクリア"
                >
                  クリア
                </button>
              )}
              <button
                onClick={handleAddEntry}
                disabled={!newPattern.trim() || !newReading.trim()}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                  showSuccess
                    ? "bg-green-600 text-white"
                    : newPattern.trim() && newReading.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Plus className="w-4 h-4" />
                {showSuccess ? "追加しました！" : "追加"}
              </button>
            </div>

            {/* よく使う例 */}
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 mb-2">よく使う例（クリックで入力）:</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_EXAMPLES.map((ex) => (
                  <button
                    key={ex.pattern}
                    onClick={() => handleQuickAdd(ex.pattern, ex.reading)}
                    className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {ex.pattern}→{ex.reading}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* カスタムエントリー */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              カスタム辞書 ({customEntries.length}件)
            </h3>
            {customEntries.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-800/30 rounded border border-dashed border-gray-700">
                まだカスタム辞書はありません
              </div>
            ) : (
              <div className="space-y-1">
                {customEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded text-sm group"
                  >
                    <span className="text-white font-mono">{entry.pattern}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-green-400">{entry.reading}</span>
                    {entry.note && (
                      <span className="text-gray-500 text-xs">{entry.note}</span>
                    )}
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="ml-auto p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 組み込み辞書（折りたたみ可能に） */}
          <details className="group">
            <summary className="text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-2">
              <span className="text-xs">▶</span>
              組み込み辞書を表示 ({DEFAULT_ENTRIES.length}件)
            </summary>
            <div className="mt-2 space-y-1">
              {DEFAULT_ENTRIES.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded text-sm"
                >
                  <span className="text-white font-mono">{entry.pattern}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400">{entry.reading}</span>
                  {entry.note && (
                    <span className="text-gray-500 text-xs ml-auto">{entry.note}</span>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500">
            💡 Enterキーで追加できます。音声再生成すると新しい読み方が反映されます。
          </p>
        </div>
      </div>
    </div>
  );
}
