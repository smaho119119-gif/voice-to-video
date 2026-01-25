/**
 * Video Style Presets and Types
 * ボタン式プロンプトシステム用の型定義とテンプレート
 */

// 画像エフェクト
export type ImageEffect =
  | "zoomIn"      // ズームイン
  | "zoomOut"     // ズームアウト
  | "panLeft"     // 左→右
  | "panRight"    // 右→左
  | "static";     // 静止

// シーン切り替え
export type SceneTransition =
  | "fade"        // フェード
  | "slide"       // スライド
  | "zoom"        // ズーム
  | "cut"         // カット（即切り替え）
  | "dissolve";   // ディゾルブ

// 字幕アニメーション
export type TextAnimation =
  | "typewriter"  // タイプライター
  | "fadeIn"      // フェードイン
  | "slideUp"     // 下から
  | "bounce"      // バウンス
  | "none";       // なし

// BGMスタイル
export type BgmStyle =
  | "quiet"       // 静か
  | "upbeat"      // アップテンポ
  | "dramatic"    // ドラマチック
  | "none";       // なし

// テンポ
export type Tempo =
  | "slow"        // ゆっくり（7秒/シーン）
  | "normal"      // 普通（5秒/シーン）
  | "fast";       // 速め（3秒/シーン）

// メインテキストのタイプ
export type MainTextType =
  | "title"           // 大きなタイトル文字
  | "quiz"            // クイズ形式（順番に出現）
  | "bullet"          // 箇条書き
  | "highlight";      // 強調テキスト

// メインテキスト設定
export interface MainTextConfig {
  type: MainTextType;
  lines: string[];      // 表示するテキスト行
  animation?: TextAnimation;  // 個別アニメーション設定
  delay?: number;       // 表示遅延（秒）
  style?: {
    fontSize?: "small" | "medium" | "large" | "xlarge";
    color?: string;
    position?: "top" | "center" | "bottom";
  };
}

// 画像設定
export interface SceneImage {
  id: string;
  url?: string;           // 画像URL（ギャラリーから読み込み時）
  prompt?: string;        // AI生成用プロンプト
  source: "generated" | "gallery" | "upload";
  startTime?: number;     // シーン内での表示開始時間（秒）
  duration?: number;      // 表示時間（秒）
  effect?: ImageEffect;   // 個別エフェクト
}

// 1カットの設定
export interface CutConfig {
  id: number;
  startTime: number;  // 秒
  endTime: number;    // 秒
  imageEffect: ImageEffect;
  textAnimation: TextAnimation;
  transition: SceneTransition;

  // ① メインテキスト（動く文字、タイトル、クイズ等）
  mainText?: MainTextConfig;

  // ② テロップ/字幕（画面下部の字幕）
  subtitle?: string;

  // ③ 音声テキスト（読み上げる文章）
  voiceText?: string;
  voiceStyle?: string;      // 演技指導（例: "疲れた声で、ゆっくりと"）
  voiceUrl?: string;        // 生成された音声URL

  // ④ 画像（複数可）
  images: SceneImage[];

  // Legacy（後方互換性）
  imagePrompt?: string;     // 画像生成プロンプト（単一画像用）
  imageUrl?: string;        // 生成された画像URL（単一画像用）
  audioUrl?: string;        // 音声URL（voiceUrlへの移行推奨）
}

// 動画全体の設定
export interface VideoStyleConfig {
  totalDuration: number;      // 総尺（秒）
  sceneDuration: number;      // 1シーンの長さ（秒）
  imageEffect: ImageEffect;   // デフォルト画像エフェクト
  transition: SceneTransition; // デフォルトトランジション
  textAnimation: TextAnimation; // デフォルト字幕アニメーション
  bgmStyle: BgmStyle;
  bgmVolume: number;          // 0-100
  cuts: CutConfig[];          // 各カットの設定
}

// テンプレート定義
export interface VideoTemplate {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  imageEffect: ImageEffect;
  transition: SceneTransition;
  textAnimation: TextAnimation;
  bgmStyle: BgmStyle;
  bgmVolume: number;
}

// プリセットテンプレート
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "news",
    name: "News",
    nameJa: "ニュース風",
    description: "落ち着いた雰囲気、信頼感のある演出",
    imageEffect: "static",
    transition: "cut",
    textAnimation: "fadeIn",
    bgmStyle: "none",
    bgmVolume: 0,
  },
  {
    id: "vlog",
    name: "Vlog",
    nameJa: "Vlog風",
    description: "カジュアルで親しみやすい演出",
    imageEffect: "zoomIn",
    transition: "slide",
    textAnimation: "slideUp",
    bgmStyle: "upbeat",
    bgmVolume: 30,
  },
  {
    id: "explainer",
    name: "Explainer",
    nameJa: "解説動画",
    description: "わかりやすく、テンポの良い演出",
    imageEffect: "panRight",
    transition: "fade",
    textAnimation: "typewriter",
    bgmStyle: "quiet",
    bgmVolume: 20,
  },
  {
    id: "story",
    name: "Story",
    nameJa: "ストーリー",
    description: "感情的で印象的な演出",
    imageEffect: "zoomOut",
    transition: "dissolve",
    textAnimation: "fadeIn",
    bgmStyle: "dramatic",
    bgmVolume: 40,
  },
  {
    id: "ad",
    name: "Advertisement",
    nameJa: "広告",
    description: "インパクトのある、注目を集める演出",
    imageEffect: "zoomIn",
    transition: "zoom",
    textAnimation: "bounce",
    bgmStyle: "upbeat",
    bgmVolume: 35,
  },
];

// UI表示用のオプション
export const IMAGE_EFFECT_OPTIONS = [
  { value: "zoomIn", label: "ズームイン", icon: "🔍" },
  { value: "zoomOut", label: "ズームアウト", icon: "🔭" },
  { value: "panLeft", label: "左→右", icon: "➡️" },
  { value: "panRight", label: "右→左", icon: "⬅️" },
  { value: "static", label: "静止", icon: "🖼️" },
] as const;

export const TRANSITION_OPTIONS = [
  { value: "fade", label: "フェード", icon: "🌫️" },
  { value: "slide", label: "スライド", icon: "📱" },
  { value: "zoom", label: "ズーム", icon: "🔎" },
  { value: "cut", label: "カット", icon: "✂️" },
  { value: "dissolve", label: "ディゾルブ", icon: "✨" },
] as const;

export const TEXT_ANIMATION_OPTIONS = [
  { value: "typewriter", label: "タイプライター", icon: "⌨️" },
  { value: "fadeIn", label: "フェードイン", icon: "👁️" },
  { value: "slideUp", label: "下から", icon: "⬆️" },
  { value: "bounce", label: "バウンス", icon: "🏀" },
  { value: "none", label: "なし", icon: "➖" },
] as const;

export const BGM_STYLE_OPTIONS = [
  { value: "quiet", label: "静か", icon: "🎵" },
  { value: "upbeat", label: "アップテンポ", icon: "🎸" },
  { value: "dramatic", label: "ドラマチック", icon: "🎻" },
  { value: "none", label: "なし", icon: "🔇" },
] as const;

export const DURATION_OPTIONS = [
  { value: 60, label: "1分" },
  { value: 180, label: "3分" },
  { value: 300, label: "5分" },
  { value: 600, label: "10分" },
] as const;

export const SCENE_DURATION_OPTIONS = [
  { value: 3, label: "3秒" },
  { value: 5, label: "5秒" },
  { value: 7, label: "7秒" },
  { value: 10, label: "10秒" },
] as const;

// ユーティリティ関数
export function calculateCutCount(totalDuration: number, sceneDuration: number): number {
  return Math.ceil(totalDuration / sceneDuration);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getDefaultConfig(): VideoStyleConfig {
  return {
    totalDuration: 180,
    sceneDuration: 5,
    imageEffect: "zoomIn",
    transition: "fade",
    textAnimation: "typewriter",
    bgmStyle: "quiet",
    bgmVolume: 20,
    cuts: [],
  };
}

export function applyTemplate(template: VideoTemplate): Partial<VideoStyleConfig> {
  return {
    imageEffect: template.imageEffect,
    transition: template.transition,
    textAnimation: template.textAnimation,
    bgmStyle: template.bgmStyle,
    bgmVolume: template.bgmVolume,
  };
}
