/**
 * Animation Types for Remotion Video Generation
 * 日本語の指示からJSON変換に使用するアニメーション設定の型定義
 */

// 画像エフェクトの種類
export type ImageEffect =
    | "none"           // エフェクトなし
    | "ken-burns"      // ゆっくりズーム＋パン
    | "parallax"       // パララックス（奥行き）
    | "pulse"          // 脈打つような拡大縮小
    | "float"          // ふわふわ浮遊
    | "shake"          // 振動
    | "zoom-in"        // ズームイン
    | "zoom-out"       // ズームアウト
    | "pan-left"       // 左へパン
    | "pan-right";     // 右へパン

// テキストアニメーションの種類
export type TextAnimation =
    | "none"           // アニメーションなし
    | "fade"           // フェードイン
    | "typewriter"     // タイプライター効果
    | "slide-up"       // 下からスライド
    | "slide-down"     // 上からスライド
    | "slide-left"     // 右からスライド
    | "slide-right"    // 左からスライド
    | "bounce"         // バウンス
    | "scale"          // スケールアップ
    | "reveal"         // 文字ずつ出現
    | "glow";          // グロー効果

// シーン間トランジションの種類
export type SceneTransition =
    | "none"           // 切り替えなし
    | "fade"           // フェード
    | "slide"          // スライド
    | "wipe"           // ワイプ
    | "zoom"           // ズーム
    | "flip"           // フリップ
    | "clock-wipe"     // 時計ワイプ
    | "blur"           // ブラー
    | "glitch";        // グリッチ

// イージング関数の種類
export type EasingType =
    | "linear"         // 一定速度
    | "ease-in"        // 加速
    | "ease-out"       // 減速
    | "ease-in-out"    // 加速→減速
    | "spring"         // バネ効果
    | "bounce";        // バウンス

// Ken Burns効果の設定
export interface KenBurnsConfig {
    startScale: number;    // 開始時のスケール（1.0 = 100%）
    endScale: number;      // 終了時のスケール
    startX?: number;       // 開始時のX位置（%）
    startY?: number;       // 開始時のY位置（%）
    endX?: number;         // 終了時のX位置（%）
    endY?: number;         // 終了時のY位置（%）
    easing?: EasingType;
}

// シーンアニメーション設定
export interface SceneAnimation {
    // 画像のアニメーション
    imageEffect?: ImageEffect;
    kenBurns?: KenBurnsConfig;

    // テキスト（字幕）のアニメーション
    textEntrance?: TextAnimation;
    textExit?: TextAnimation;
    textDelay?: number;        // テキスト表示の遅延（秒）

    // シーン全体のエフェクト
    sceneEntrance?: SceneTransition;
    sceneExit?: SceneTransition;
    transitionDuration?: number;  // トランジション時間（秒）

    // 背景エフェクト
    backgroundEffect?: "particles" | "noise" | "gradient" | "blur" | "none";

    // エフェクト強度
    intensity?: "subtle" | "normal" | "strong";

    // イージング
    easing?: EasingType;
}

// 動画全体のアニメーション設定
export interface VideoAnimation {
    // デフォルトのシーンアニメーション
    defaultSceneAnimation?: SceneAnimation;

    // オープニングのアニメーション
    openingAnimation?: {
        titleEntrance?: TextAnimation;
        subtitleEntrance?: TextAnimation;
        backgroundEffect?: "particles" | "gradient" | "blur";
    };

    // エンディングのアニメーション
    endingAnimation?: {
        ctaEntrance?: TextAnimation;
        backgroundEffect?: "particles" | "gradient" | "blur";
    };

    // グローバル設定
    globalEasing?: EasingType;
    motionBlur?: boolean;
    filmGrain?: boolean;
}

// 日本語キーワードからアニメーション設定へのマッピング
export const JAPANESE_ANIMATION_KEYWORDS: Record<string, Partial<SceneAnimation>> = {
    // 画像エフェクト
    "ゆっくりズーム": { imageEffect: "ken-burns", kenBurns: { startScale: 1, endScale: 1.2 } },
    "ken burns": { imageEffect: "ken-burns", kenBurns: { startScale: 1, endScale: 1.2 } },
    "ズームイン": { imageEffect: "zoom-in" },
    "ズームアウト": { imageEffect: "zoom-out" },
    "左にパン": { imageEffect: "pan-left" },
    "右にパン": { imageEffect: "pan-right" },
    "パララックス": { imageEffect: "parallax" },
    "浮遊": { imageEffect: "float" },
    "揺れる": { imageEffect: "shake" },
    "脈打つ": { imageEffect: "pulse" },

    // テキストアニメーション
    "フェードイン": { textEntrance: "fade" },
    "タイプライター": { textEntrance: "typewriter" },
    "下からスライド": { textEntrance: "slide-up" },
    "上からスライド": { textEntrance: "slide-down" },
    "バウンス": { textEntrance: "bounce" },
    "文字ずつ": { textEntrance: "reveal" },
    "光る": { textEntrance: "glow" },

    // トランジション
    "フェード": { sceneEntrance: "fade", sceneExit: "fade" },
    "スライド": { sceneEntrance: "slide", sceneExit: "slide" },
    "ワイプ": { sceneEntrance: "wipe", sceneExit: "wipe" },
    "フリップ": { sceneEntrance: "flip", sceneExit: "flip" },
    "時計回り": { sceneEntrance: "clock-wipe" },
    "ブラー": { sceneEntrance: "blur", sceneExit: "blur" },
    "グリッチ": { sceneEntrance: "glitch" },

    // 強度
    "控えめ": { intensity: "subtle" },
    "派手": { intensity: "strong" },
    "ダイナミック": { intensity: "strong" },

    // 速度
    "ゆっくり": { easing: "ease-out" },
    "急速に": { easing: "ease-in" },
    "なめらか": { easing: "ease-in-out" },
    "バネ": { easing: "spring" },
};

// 動画スタイルのプリセット
export const VIDEO_STYLE_PRESETS: Record<string, VideoAnimation> = {
    "cinematic": {
        defaultSceneAnimation: {
            imageEffect: "ken-burns",
            kenBurns: { startScale: 1, endScale: 1.15 },
            textEntrance: "fade",
            sceneEntrance: "fade",
            transitionDuration: 0.8,
            intensity: "subtle",
            easing: "ease-in-out",
        },
        globalEasing: "ease-in-out",
        filmGrain: true,
    },
    "dynamic": {
        defaultSceneAnimation: {
            imageEffect: "zoom-in",
            textEntrance: "slide-up",
            sceneEntrance: "slide",
            transitionDuration: 0.4,
            intensity: "strong",
            easing: "spring",
        },
        globalEasing: "spring",
        motionBlur: true,
    },
    "minimal": {
        defaultSceneAnimation: {
            imageEffect: "none",
            textEntrance: "fade",
            sceneEntrance: "fade",
            transitionDuration: 0.5,
            intensity: "subtle",
            easing: "ease-out",
        },
        globalEasing: "ease-out",
    },
    "energetic": {
        defaultSceneAnimation: {
            imageEffect: "pulse",
            textEntrance: "bounce",
            sceneEntrance: "wipe",
            transitionDuration: 0.3,
            intensity: "strong",
            easing: "bounce",
        },
        globalEasing: "bounce",
    },
    "elegant": {
        defaultSceneAnimation: {
            imageEffect: "ken-burns",
            kenBurns: { startScale: 1.1, endScale: 1 },
            textEntrance: "fade",
            sceneEntrance: "fade",
            transitionDuration: 1.0,
            intensity: "subtle",
            easing: "ease-in-out",
        },
        globalEasing: "ease-in-out",
        filmGrain: true,
    },
};
