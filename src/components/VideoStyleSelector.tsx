"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  VideoStyleConfig,
  VideoTemplate,
  VIDEO_TEMPLATES,
  IMAGE_EFFECT_OPTIONS,
  TRANSITION_OPTIONS,
  TEXT_ANIMATION_OPTIONS,
  BGM_STYLE_OPTIONS,
  DURATION_OPTIONS,
  SCENE_DURATION_OPTIONS,
  ImageEffect,
  SceneTransition,
  TextAnimation,
  BgmStyle,
  calculateCutCount,
  applyTemplate,
} from "@/lib/video-presets";

interface VideoStyleSelectorProps {
  config: VideoStyleConfig;
  onChange: (config: VideoStyleConfig) => void;
  onGenerateCuts: (styleKeyword: string) => void;
  isGenerating?: boolean;
}

type SectionId = "settings" | "template" | "style" | "imageEffect" | "transition" | "textAnimation" | "bgm";

interface AccordionSectionProps {
  id: SectionId;
  icon: string;
  title: string;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ icon, title, badge, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <section className="border-b border-gray-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-800/50 transition-colors rounded-lg"
      >
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
          {badge}
        </h3>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 px-2">
          {children}
        </div>
      )}
    </section>
  );
}

export function VideoStyleSelector({
  config,
  onChange,
  onGenerateCuts,
  isGenerating = false,
}: VideoStyleSelectorProps) {
  const [styleKeyword, setStyleKeyword] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(["settings", "template", "style"]) // Default open sections
  );

  // Use actual cuts.length if cuts exist, otherwise calculate from duration settings
  const cutCount = config.cuts?.length || calculateCutCount(config.totalDuration, config.sceneDuration);

  const toggleSection = (sectionId: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleTemplateSelect = (template: VideoTemplate) => {
    setSelectedTemplate(template.id);
    const newConfig = {
      ...config,
      ...applyTemplate(template),
    };
    onChange(newConfig);
  };

  const handleDurationChange = (duration: number) => {
    onChange({ ...config, totalDuration: duration });
  };

  const handleSceneDurationChange = (sceneDuration: number) => {
    onChange({ ...config, sceneDuration });
  };

  const handleImageEffectChange = (imageEffect: ImageEffect) => {
    setSelectedTemplate(null);
    onChange({ ...config, imageEffect });
  };

  const handleTransitionChange = (transition: SceneTransition) => {
    setSelectedTemplate(null);
    onChange({ ...config, transition });
  };

  const handleTextAnimationChange = (textAnimation: TextAnimation) => {
    setSelectedTemplate(null);
    onChange({ ...config, textAnimation });
  };

  const handleBgmStyleChange = (bgmStyle: BgmStyle) => {
    setSelectedTemplate(null);
    onChange({ ...config, bgmStyle });
  };

  const handleBgmVolumeChange = (bgmVolume: number) => {
    onChange({ ...config, bgmVolume });
  };

  return (
    <div className="bg-gray-900 rounded-lg divide-y divide-gray-800">
      {/* 動画設定 */}
      <AccordionSection
        id="settings"
        icon="⏱️"
        title="動画設定"
        badge={
          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            {cutCount}カット
          </span>
        }
        isOpen={openSections.has("settings")}
        onToggle={() => toggleSection("settings")}
      >
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">総尺</label>
            <div className="flex gap-1">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDurationChange(option.value)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    config.totalDuration === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">1シーン</label>
            <div className="flex gap-1">
              {SCENE_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSceneDurationChange(option.value)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    config.sceneDuration === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* テンプレート */}
      <AccordionSection
        id="template"
        icon="📋"
        title="テンプレート"
        badge={
          selectedTemplate && (
            <span className="ml-2 text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded">
              {VIDEO_TEMPLATES.find((t) => t.id === selectedTemplate)?.nameJa}
            </span>
          )
        }
        isOpen={openSections.has("template")}
        onToggle={() => toggleSection("template")}
      >
        <div className="flex flex-wrap gap-2">
          {VIDEO_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTemplate === template.id
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              title={template.description}
            >
              {template.nameJa}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* スタイルキーワード */}
      <AccordionSection
        id="style"
        icon="🎨"
        title="スタイルキーワード"
        isOpen={openSections.has("style")}
        onToggle={() => toggleSection("style")}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={styleKeyword}
            onChange={(e) => setStyleKeyword(e.target.value)}
            placeholder="例: 落ち着いた雰囲気で、ビジネス向け"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => onGenerateCuts(styleKeyword)}
            disabled={isGenerating || !styleKeyword.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              isGenerating || !styleKeyword.trim()
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
            }`}
          >
            {isGenerating ? "生成中..." : "✨ AI自動生成"}
          </button>
        </div>
      </AccordionSection>

      {/* 画像エフェクト */}
      <AccordionSection
        id="imageEffect"
        icon="🖼️"
        title="画像エフェクト"
        badge={
          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            {IMAGE_EFFECT_OPTIONS.find((o) => o.value === config.imageEffect)?.label}
          </span>
        }
        isOpen={openSections.has("imageEffect")}
        onToggle={() => toggleSection("imageEffect")}
      >
        <div className="flex flex-wrap gap-2">
          {IMAGE_EFFECT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleImageEffectChange(option.value)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                config.imageEffect === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* シーン切り替え */}
      <AccordionSection
        id="transition"
        icon="✨"
        title="シーン切り替え"
        badge={
          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            {TRANSITION_OPTIONS.find((o) => o.value === config.transition)?.label}
          </span>
        }
        isOpen={openSections.has("transition")}
        onToggle={() => toggleSection("transition")}
      >
        <div className="flex flex-wrap gap-2">
          {TRANSITION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTransitionChange(option.value)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                config.transition === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* 字幕アニメーション */}
      <AccordionSection
        id="textAnimation"
        icon="💬"
        title="字幕アニメーション"
        badge={
          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            {TEXT_ANIMATION_OPTIONS.find((o) => o.value === config.textAnimation)?.label}
          </span>
        }
        isOpen={openSections.has("textAnimation")}
        onToggle={() => toggleSection("textAnimation")}
      >
        <div className="flex flex-wrap gap-2">
          {TEXT_ANIMATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTextAnimationChange(option.value)}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                config.textAnimation === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* BGM設定 */}
      <AccordionSection
        id="bgm"
        icon="🎵"
        title="BGM"
        badge={
          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
            {BGM_STYLE_OPTIONS.find((o) => o.value === config.bgmStyle)?.label}
            {config.bgmStyle !== "none" && ` ${config.bgmVolume}%`}
          </span>
        }
        isOpen={openSections.has("bgm")}
        onToggle={() => toggleSection("bgm")}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {BGM_STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleBgmStyleChange(option.value)}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  config.bgmStyle === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          {config.bgmStyle !== "none" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">音量:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={config.bgmVolume}
                onChange={(e) => handleBgmVolumeChange(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-sm text-gray-400 w-12">{config.bgmVolume}%</span>
            </div>
          )}
        </div>
      </AccordionSection>
    </div>
  );
}
