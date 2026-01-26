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

// 話者タイプ（複数話者対応）
export type SpeakerType =
  | "narrator"        // ナレーター（メイン）
  | "host"            // ホスト（メイン司会）
  | "guest"           // ゲスト/相手
  | "customer"        // お客様の声
  | "expert"          // 専門家
  | "interviewer"     // インタビュアー
  | "interviewee"     // インタビュイー
  | "speaker1"        // 対話モード：話者1（メイン）
  | "speaker2";       // 対話モード：話者2（サブ）

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

// ========================================
// アセットシステム（図形・アイコン・テキスト・Lottie・SVG）
// ========================================

// アセットタイプ
export type AssetType =
  | "shape"       // 図形（矩形、円、矢印など）
  | "icon"        // アイコン（Lucide Icons）
  | "text"        // テキストアニメーション
  | "lottie"      // Lottieアニメーション
  | "svg";        // SVGアニメーション

// アセットアニメーションプリセット
export type AssetAnimation =
  | "none"        // なし
  | "fadeIn"      // フェードイン
  | "fadeOut"     // フェードアウト
  | "slideInLeft" // 左からスライドイン
  | "slideInRight"// 右からスライドイン
  | "slideInUp"   // 下からスライドイン
  | "slideInDown" // 上からスライドイン
  | "bounce"      // バウンス
  | "pulse"       // 脈動
  | "spin"        // 回転
  | "shake"       // 揺れ
  | "scale"       // 拡大縮小
  | "pop";        // ポップ

// 図形タイプ
export type ShapeType =
  | "rectangle"   // 矩形
  | "circle"      // 円
  | "triangle"    // 三角形
  | "arrow"       // 矢印
  | "line"        // 線
  | "star";       // 星

// アセット位置設定
export interface AssetPosition {
  x: number;      // X座標 (0-100%)
  y: number;      // Y座標 (0-100%)
  width?: number; // 幅 (0-100%)
  height?: number;// 高さ (0-100%)
  rotation?: number; // 回転角度 (度)
}

// アセット基底インターフェース
export interface SceneAssetBase {
  id: string;
  type: AssetType;
  position: AssetPosition;
  animation: AssetAnimation;
  animationDuration?: number;  // アニメーション時間（秒）
  animationDelay?: number;     // アニメーション遅延（秒）
  startTime?: number;          // シーン内での表示開始時間（秒）
  endTime?: number;            // シーン内での表示終了時間（秒）
  opacity?: number;            // 不透明度 (0-1)
  zIndex?: number;             // 重ね順
}

// 図形アセット
export interface ShapeAsset extends SceneAssetBase {
  type: "shape";
  shapeType: ShapeType;
  fillColor?: string;     // 塗りつぶし色
  strokeColor?: string;   // 枠線色
  strokeWidth?: number;   // 枠線幅
  borderRadius?: number;  // 角丸
}

// アイコンアセット（Lucide Icons）
export interface IconAsset extends SceneAssetBase {
  type: "icon";
  iconName: string;       // Lucideアイコン名（例: "check", "star", "heart"）
  color?: string;         // アイコン色
  size?: number;          // サイズ (px)
}

// テキストアセット
export interface TextAsset extends SceneAssetBase {
  type: "text";
  text: string;           // 表示テキスト
  fontSize?: number;      // フォントサイズ (px)
  fontWeight?: "normal" | "bold" | "extrabold";
  color?: string;         // テキスト色
  backgroundColor?: string; // 背景色
  padding?: number;       // パディング
  textAlign?: "left" | "center" | "right";
}

// Lottieアセット
export interface LottieAsset extends SceneAssetBase {
  type: "lottie";
  lottieId: string;       // プリセットLottie ID
  loop?: boolean;         // ループ再生
  speed?: number;         // 再生速度 (1.0 = 通常)
}

// SVGアセット
export interface SvgAsset extends SceneAssetBase {
  type: "svg";
  svgId: string;          // プリセットSVG ID
  color?: string;         // SVG色（単色の場合）
}

// ユニオン型
export type SceneAsset = ShapeAsset | IconAsset | TextAsset | LottieAsset | SvgAsset;

// アセットアニメーションオプション（UI用）
export const ASSET_ANIMATION_OPTIONS = [
  { value: "none", label: "なし", icon: "➖" },
  { value: "fadeIn", label: "フェードイン", icon: "👁️" },
  { value: "fadeOut", label: "フェードアウト", icon: "👁️‍🗨️" },
  { value: "slideInLeft", label: "左からスライド", icon: "➡️" },
  { value: "slideInRight", label: "右からスライド", icon: "⬅️" },
  { value: "slideInUp", label: "下からスライド", icon: "⬆️" },
  { value: "slideInDown", label: "上からスライド", icon: "⬇️" },
  { value: "bounce", label: "バウンス", icon: "🏀" },
  { value: "pulse", label: "脈動", icon: "💓" },
  { value: "spin", label: "回転", icon: "🔄" },
  { value: "shake", label: "揺れ", icon: "📳" },
  { value: "scale", label: "拡大縮小", icon: "🔍" },
  { value: "pop", label: "ポップ", icon: "💥" },
] as const;

// 図形オプション（UI用）
export const SHAPE_OPTIONS = [
  { value: "rectangle", label: "矩形", icon: "⬜" },
  { value: "circle", label: "円", icon: "⚪" },
  { value: "triangle", label: "三角形", icon: "🔺" },
  { value: "arrow", label: "矢印", icon: "➡️" },
  { value: "line", label: "線", icon: "➖" },
  { value: "star", label: "星", icon: "⭐" },
] as const;

// よく使うアイコンプリセット（Lucide）
export const ICON_PRESETS = [
  { value: "check", label: "チェック", category: "ui" },
  { value: "x", label: "バツ", category: "ui" },
  { value: "star", label: "星", category: "ui" },
  { value: "heart", label: "ハート", category: "ui" },
  { value: "thumbs-up", label: "いいね", category: "ui" },
  { value: "arrow-right", label: "矢印（右）", category: "arrow" },
  { value: "arrow-left", label: "矢印（左）", category: "arrow" },
  { value: "arrow-up", label: "矢印（上）", category: "arrow" },
  { value: "arrow-down", label: "矢印（下）", category: "arrow" },
  { value: "play", label: "再生", category: "media" },
  { value: "pause", label: "一時停止", category: "media" },
  { value: "volume-2", label: "音量", category: "media" },
  { value: "mic", label: "マイク", category: "media" },
  { value: "camera", label: "カメラ", category: "media" },
  { value: "sparkles", label: "キラキラ", category: "effect" },
  { value: "zap", label: "稲妻", category: "effect" },
  { value: "flame", label: "炎", category: "effect" },
  { value: "trophy", label: "トロフィー", category: "achievement" },
  { value: "medal", label: "メダル", category: "achievement" },
  { value: "crown", label: "王冠", category: "achievement" },
] as const;

// Lottieプリセット
export const LOTTIE_PRESETS = [
  { value: "confetti", label: "紙吹雪", category: "celebration" },
  { value: "fireworks", label: "花火", category: "celebration" },
  { value: "loading-dots", label: "ローディング（ドット）", category: "ui" },
  { value: "loading-spinner", label: "ローディング（スピナー）", category: "ui" },
  { value: "checkmark", label: "チェックマーク", category: "ui" },
  { value: "error", label: "エラー", category: "ui" },
  { value: "arrow-bounce", label: "矢印（バウンス）", category: "arrow" },
  { value: "hand-pointing", label: "指差し", category: "gesture" },
  { value: "hand-tap", label: "タップ", category: "gesture" },
] as const;

// デフォルトアセット設定
export function createDefaultAsset(type: AssetType): SceneAsset {
  const base: Omit<SceneAssetBase, "type"> = {
    id: `asset-${Date.now()}`,
    position: { x: 50, y: 50, width: 20, height: 20 },
    animation: "fadeIn",
    animationDuration: 0.5,
    animationDelay: 0,
    opacity: 1,
    zIndex: 1,
  };

  switch (type) {
    case "shape":
      return {
        ...base,
        type: "shape",
        shapeType: "rectangle",
        fillColor: "#3B82F6",
        strokeColor: "#1D4ED8",
        strokeWidth: 2,
        borderRadius: 8,
      };
    case "icon":
      return {
        ...base,
        type: "icon",
        iconName: "star",
        color: "#FBBF24",
        size: 48,
      };
    case "text":
      return {
        ...base,
        type: "text",
        text: "テキスト",
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFFFFF",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 8,
        textAlign: "center",
      };
    case "lottie":
      return {
        ...base,
        type: "lottie",
        lottieId: "confetti",
        loop: false,
        speed: 1,
      };
    case "svg":
      return {
        ...base,
        type: "svg",
        svgId: "checkmark",
        color: "#10B981",
      };
  }
}

// シーンタイプ（RemotionのSceneTypeと対応）
export type SceneType = "normal" | "text" | "quiz" | "problem";

// クイズテーマ
export type QuizTheme = "problem" | "benefit" | "compare" | "quiz";

// 問題シーンバリアント
export type ProblemVariant = "dramatic" | "list";

// クイズ選択肢
export interface QuizChoice {
  text: string;
  icon?: string; // emoji or icon
}

// テキスト表示モード
export type TextDisplayMode = "instant" | "sync-typewriter" | "word-bounce";

// テキスト表示モードオプション（UI用）
export const TEXT_DISPLAY_MODE_OPTIONS: { value: TextDisplayMode; label: string; icon: string; description: string }[] = [
  { value: "word-bounce", label: "バウンス", icon: "🎯", description: "単語ごとにバウンス表示" },
  { value: "sync-typewriter", label: "タイプライター", icon: "⌨️", description: "音声に同期して1文字ずつ" },
  { value: "instant", label: "即時表示", icon: "⚡", description: "最初から全文表示" },
];

// シーンタイプオプション（UI用）
export const SCENE_TYPE_OPTIONS: { value: SceneType; label: string; icon: string; description: string }[] = [
  { value: "normal", label: "通常", icon: "🖼️", description: "画像+テキストの通常シーン" },
  { value: "text", label: "テキストのみ", icon: "📝", description: "画像なし、テキストアニメーション" },
  { value: "quiz", label: "クイズ形式", icon: "❓", description: "質問と選択肢が順に出現" },
  { value: "problem", label: "問題提起", icon: "😰", description: "問題リストを順番に表示" },
];

// クイズテーマオプション（UI用）
export const QUIZ_THEME_OPTIONS: { value: QuizTheme; label: string; icon: string; color: string }[] = [
  { value: "problem", label: "問題", icon: "😰", color: "text-red-400" },
  { value: "benefit", label: "メリット", icon: "✨", color: "text-green-400" },
  { value: "compare", label: "比較", icon: "🤔", color: "text-purple-400" },
  { value: "quiz", label: "クイズ", icon: "❓", color: "text-blue-400" },
];

// 1カットの設定
export interface CutConfig {
  id: number;
  startTime: number;  // 秒
  endTime: number;    // 秒
  imageEffect: ImageEffect;
  textAnimation: TextAnimation;
  transition: SceneTransition;

  // ★ シーンタイプ（normal: 画像あり, text: テキストのみ, quiz: クイズ形式, problem: 問題提起）
  sceneType?: SceneType;

  // ★ クイズシーン用プロパティ
  quizQuestion?: string;           // クイズの質問
  quizChoices?: QuizChoice[];      // 選択肢（A, B, C...）
  quizTheme?: QuizTheme;           // テーマ（problem/benefit/compare/quiz）
  quizHighlightIndex?: number;     // 正解のインデックス（最後にハイライト）

  // ★ 問題シーン用プロパティ
  problemHeadline?: string;        // 見出し
  problemItems?: string[];         // 問題項目リスト
  problemVariant?: ProblemVariant; // スタイル

  // ① メインテキスト（動く文字、タイトル、クイズ等）
  mainText?: MainTextConfig;

  // ★ テキスト表示モード（sync-typewriter: 音声同期タイプライター）
  textDisplayMode?: TextDisplayMode;

  // ② テロップ/字幕（画面下部の字幕）
  subtitle?: string;

  // ③ 音声テキスト（読み上げる文章）
  voiceText?: string;
  voiceStyle?: string;      // 演技指導（例: "疲れた声で、ゆっくりと"）
  voiceUrl?: string;        // 生成された音声URL
  speaker?: SpeakerType;    // 話者（複数話者対応）
  voiceId?: string;         // Gemini TTS 声ID（Zephyr, Puck等）

  // ④ 画像（複数可）
  images: SceneImage[];

  // ⑤ アセット（図形・アイコン・テキスト・Lottie・SVG）
  assets?: SceneAsset[];

  // Legacy（後方互換性）
  imagePrompt?: string;     // 画像生成プロンプト（単一画像用）
  imageUrl?: string;        // 生成された画像URL（単一画像用）- 現在のアスペクト比用
  imageUrl16x9?: string;    // PC用画像URL（16:9）
  imageUrl9x16?: string;    // スマホ用画像URL（9:16）
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
  showSubtitle: boolean;      // テロップ表示（デフォルト: false）
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

// Gemini 2.5 TTS ボイスオプション（8種類：女性4名、男性4名）
export type GeminiVoiceId = "Zephyr" | "Kore" | "Leda" | "Aoede" | "Puck" | "Charon" | "Fenrir" | "Orus";

export const GEMINI_VOICE_OPTIONS: { value: GeminiVoiceId; label: string; gender: "female" | "male"; color: string }[] = [
  // 女性ボイス
  { value: "Zephyr", label: "Zephyr - 明るい", gender: "female", color: "text-pink-400" },
  { value: "Kore", label: "Kore - 柔らかい", gender: "female", color: "text-rose-400" },
  { value: "Leda", label: "Leda - 温かい", gender: "female", color: "text-orange-400" },
  { value: "Aoede", label: "Aoede - 自然", gender: "female", color: "text-amber-400" },
  // 男性ボイス
  { value: "Puck", label: "Puck - 活発", gender: "male", color: "text-blue-400" },
  { value: "Charon", label: "Charon - 落ち着き", gender: "male", color: "text-cyan-400" },
  { value: "Fenrir", label: "Fenrir - 力強い", gender: "male", color: "text-indigo-400" },
  { value: "Orus", label: "Orus - 知的", gender: "male", color: "text-violet-400" },
];

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
    showSubtitle: false,  // テロップはデフォルトオフ
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
