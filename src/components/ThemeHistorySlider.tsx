"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Trash2, X } from "lucide-react";
import { ThemeHistoryItem, deleteThemeFromHistory } from "@/lib/project-storage";

interface ThemeHistorySliderProps {
    history: ThemeHistoryItem[];
    onSelect: (theme: ThemeHistoryItem) => void;
    onDelete: (themeId: string) => void;
    currentTheme?: string;
}

export default function ThemeHistorySlider({
    history,
    onSelect,
    onDelete,
    currentTheme,
}: ThemeHistorySliderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);

    // Check scroll position
    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        checkScroll();
        const ref = scrollRef.current;
        if (ref) {
            ref.addEventListener("scroll", checkScroll);
            window.addEventListener("resize", checkScroll);
        }
        return () => {
            if (ref) ref.removeEventListener("scroll", checkScroll);
            window.removeEventListener("resize", checkScroll);
        };
    }, [history]);

    // Find current theme in history
    useEffect(() => {
        if (currentTheme) {
            const index = history.findIndex(h => h.theme_text === currentTheme);
            setSelectedIndex(index);
        }
    }, [currentTheme, history]);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = 200;
        scrollRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "たった今";
        if (diffMins < 60) return `${diffMins}分前`;
        if (diffHours < 24) return `${diffHours}時間前`;
        if (diffDays < 7) return `${diffDays}日前`;
        return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    };

    // Truncate text
    const truncate = (text: string, maxLen: number = 30) => {
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen) + "...";
    };

    if (history.length === 0) {
        return null;
    }

    return (
        <div className="relative mb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>テーマ履歴 ({history.length})</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">
                        {selectedIndex >= 0 ? `${selectedIndex + 1}/${history.length}` : ""}
                    </span>
                </div>
            </div>

            {/* Slider Container */}
            <div className="relative group">
                {/* Left Arrow */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-slate-800/90 hover:bg-slate-700 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                )}

                {/* Right Arrow */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-slate-800/90 hover:bg-slate-700 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                )}

                {/* Scrollable Content */}
                <div
                    ref={scrollRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {history.map((item, index) => {
                        const isSelected = item.theme_text === currentTheme;
                        const inputModeEmoji = item.input_mode === "url" ? "🔗" : item.input_mode === "voice" ? "🎤" : "✏️";

                        return (
                            <div
                                key={item.id}
                                className={`relative flex-shrink-0 group/card cursor-pointer transition-all ${
                                    isSelected
                                        ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900"
                                        : "hover:scale-105"
                                }`}
                                onClick={() => {
                                    onSelect(item);
                                    setSelectedIndex(index);
                                }}
                            >
                                {/* Card */}
                                <div
                                    className={`w-40 h-20 rounded-lg p-2 flex flex-col justify-between ${
                                        isSelected
                                            ? "bg-gradient-to-br from-blue-600 to-purple-600"
                                            : "bg-slate-800 hover:bg-slate-700"
                                    }`}
                                >
                                    {/* Theme text */}
                                    <p className="text-xs text-white line-clamp-2 leading-tight">
                                        {truncate(item.theme_text, 40)}
                                    </p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-300">
                                            {inputModeEmoji} {formatDate(item.used_at)}
                                        </span>
                                        {item.project_id && (
                                            <span className="text-[10px] px-1 py-0.5 bg-green-500/20 text-green-300 rounded">
                                                生成済
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(item.id);
                                    }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>

                                {/* Index badge */}
                                <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-slate-300 font-medium">
                                    {index + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Gradient fade edges */}
            {canScrollLeft && (
                <div className="absolute left-0 top-8 bottom-2 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
            )}
            {canScrollRight && (
                <div className="absolute right-0 top-8 bottom-2 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
            )}
        </div>
    );
}
