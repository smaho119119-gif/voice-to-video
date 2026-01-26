/**
 * Animation Prompt Builder
 * 日本語の自然言語からRemotionのJSON（VideoProps）を生成するためのプロンプト構築
 */

import { VIDEO_STYLE_PRESETS } from "@/types/animation";

export interface NaturalLanguageVideoRequest {
    description: string;           // 日本語での動画説明
    duration?: number;             // 目標時間（秒）
    aspectRatio?: "16:9" | "9:16"; // アスペクト比
    style?: keyof typeof VIDEO_STYLE_PRESETS; // スタイルプリセット
}

/**
 * 利用可能なアニメーション効果のリファレンス（AIへの説明用）
 */
const ANIMATION_REFERENCE = `
【利用可能なアニメーション効果】

■ 画像エフェクト (imageEffect)
- "none": エフェクトなし
- "ken-burns": ゆっくりズーム＋パン（映画的）
- "parallax": 奥行き感のあるパララックス
- "pulse": 脈打つような拡大縮小
- "float": ふわふわ浮遊
- "shake": 振動・揺れ
- "zoom-in": ズームイン
- "zoom-out": ズームアウト
- "pan-left": 左へパン
- "pan-right": 右へパン

■ テキストアニメーション (textEntrance / textExit)
- "none": アニメーションなし
- "fade": フェードイン
- "typewriter": タイプライター効果
- "slide-up": 下からスライド
- "slide-down": 上からスライド
- "slide-left": 右からスライド
- "slide-right": 左からスライド
- "bounce": バウンス
- "scale": スケールアップ
- "reveal": 文字ずつ出現
- "glow": グロー効果

■ シーン間トランジション (sceneEntrance / sceneExit)
- "none": 切り替えなし
- "fade": フェード（滑らか）
- "slide": スライド（テンポ良い）
- "wipe": ワイプ（ダイナミック）
- "zoom": ズーム（インパクト）
- "flip": フリップ（立体的）
- "clock-wipe": 時計ワイプ
- "blur": ブラー
- "glitch": グリッチ（現代的）

■ イージング (easing)
- "linear": 一定速度
- "ease-in": 加速
- "ease-out": 減速
- "ease-in-out": 加速→減速
- "spring": バネ効果
- "bounce": バウンス

■ 強度 (intensity)
- "subtle": 控えめ
- "normal": 標準
- "strong": 派手・ダイナミック
`;

/**
 * 日本語の自然言語からVideoProps JSONを生成するプロンプトを構築
 */
export function buildAnimationPrompt(request: NaturalLanguageVideoRequest): string {
    const duration = request.duration || 60;
    const aspectRatio = request.aspectRatio || "16:9";
    const stylePreset = request.style ? VIDEO_STYLE_PRESETS[request.style] : null;

    const styleHint = stylePreset
        ? `\n【推奨スタイル: ${request.style}】\nデフォルトアニメーション: ${JSON.stringify(stylePreset.defaultSceneAnimation, null, 2)}`
        : "";

    return `
あなたはプロの動画ディレクターです。以下の日本語での動画説明を読み、Remotion用の完全なJSON設定を生成してください。

【動画説明（ユーザー入力）】
${request.description}

【基本設定】
- 目標時間: 約${duration}秒
- アスペクト比: ${aspectRatio}
${styleHint}

${ANIMATION_REFERENCE}

【出力JSONフォーマット】
以下の形式で出力してください（VideoProps型）:

\`\`\`json
{
  "title": "動画タイトル",
  "aspectRatio": "${aspectRatio}",
  "animation": {
    "defaultSceneAnimation": {
      "imageEffect": "ken-burns",
      "kenBurns": { "startScale": 1, "endScale": 1.2 },
      "textEntrance": "fade",
      "sceneEntrance": "fade",
      "transitionDuration": 0.5,
      "intensity": "normal",
      "easing": "ease-in-out"
    },
    "openingAnimation": {
      "titleEntrance": "scale",
      "subtitleEntrance": "fade",
      "backgroundEffect": "particles"
    },
    "endingAnimation": {
      "ctaEntrance": "bounce",
      "backgroundEffect": "gradient"
    },
    "globalEasing": "ease-in-out",
    "motionBlur": false,
    "filmGrain": false
  },
  "opening": {
    "enabled": true,
    "duration": 3,
    "subtitle": "オープニング字幕"
  },
  "ending": {
    "enabled": true,
    "duration": 4,
    "callToAction": "アクションを促すテキスト",
    "channelName": "チャンネル名"
  },
  "scenes": [
    {
      "duration": 5,
      "avatar_script": "ナレーション原稿",
      "subtitle": "字幕テキスト",
      "image_prompt": "画像生成プロンプト（日本語、具体的に）",
      "emotion": "neutral",
      "transition": "fade",
      "animation": {
        "imageEffect": "ken-burns",
        "kenBurns": { "startScale": 1, "endScale": 1.15 },
        "textEntrance": "slide-up",
        "textDelay": 0.5,
        "sceneEntrance": "fade",
        "intensity": "normal"
      }
    }
  ],
  "bgm": {
    "url": "",
    "volume": 0.3
  }
}
\`\`\`

【重要なルール】
1. ユーザーの日本語説明から意図を読み取り、適切なアニメーションを選択
2. 各シーンにユニークなアニメーションを設定（単調にならないように）
3. シーンの内容に合わせてエフェクトを選択:
   - 重要なポイント → zoom, scaleなど強調効果
   - 説明シーン → ken-burns, fadeなど落ち着いた効果
   - 盛り上がり → bounce, shake, glitchなどダイナミック効果
4. トランジションは連続して同じものを使わない
5. image_promptは日本語で、具体的なシーンを記述
6. avatar_scriptは自然な日本語で
7. 全体のトーンとペースを統一

【キーワードからの推論例】
- 「フェードイン」「ゆっくり」→ fade, ken-burns, ease-out
- 「派手に」「ダイナミック」→ zoom, bounce, spring, intensity: "strong"
- 「シンプル」「控えめ」→ fade, ease-in-out, intensity: "subtle"
- 「カッコよく」「モダン」→ glitch, wipe, blur
- 「楽しく」「ポップ」→ bounce, scale, spring

JSONのみを出力してください。説明は不要です。
`;
}

/**
 * スタイルプリセットのリストを取得
 */
export function getAvailableStylePresets(): string[] {
    return Object.keys(VIDEO_STYLE_PRESETS);
}

/**
 * 簡易版：キーワードから基本的なアニメーション設定を生成
 * （AIを使わない軽量版）
 */
export function inferAnimationFromKeywords(text: string): Partial<{
    imageEffect: string;
    textEntrance: string;
    sceneEntrance: string;
    intensity: string;
    easing: string;
}> {
    const result: Record<string, string> = {};

    // 画像エフェクト
    if (text.includes("ズームイン") || text.includes("拡大")) {
        result.imageEffect = "zoom-in";
    } else if (text.includes("ズームアウト") || text.includes("縮小")) {
        result.imageEffect = "zoom-out";
    } else if (text.includes("パン") || text.includes("移動")) {
        result.imageEffect = text.includes("左") ? "pan-left" : "pan-right";
    } else if (text.includes("揺れ") || text.includes("振動")) {
        result.imageEffect = "shake";
    } else if (text.includes("浮遊") || text.includes("ふわふわ")) {
        result.imageEffect = "float";
    } else if (text.includes("ken burns") || text.includes("映画的") || text.includes("シネマティック")) {
        result.imageEffect = "ken-burns";
    }

    // テキストアニメーション
    if (text.includes("タイプライター") || text.includes("タイピング")) {
        result.textEntrance = "typewriter";
    } else if (text.includes("バウンス") || text.includes("弾む")) {
        result.textEntrance = "bounce";
    } else if (text.includes("スライド")) {
        result.textEntrance = text.includes("上") ? "slide-down" : "slide-up";
    } else if (text.includes("文字ずつ")) {
        result.textEntrance = "reveal";
    } else if (text.includes("光") || text.includes("グロー")) {
        result.textEntrance = "glow";
    }

    // トランジション
    if (text.includes("ワイプ")) {
        result.sceneEntrance = "wipe";
    } else if (text.includes("フリップ") || text.includes("回転")) {
        result.sceneEntrance = "flip";
    } else if (text.includes("グリッチ")) {
        result.sceneEntrance = "glitch";
    } else if (text.includes("ブラー") || text.includes("ぼかし")) {
        result.sceneEntrance = "blur";
    } else if (text.includes("スライド")) {
        result.sceneEntrance = "slide";
    }

    // 強度
    if (text.includes("派手") || text.includes("ダイナミック") || text.includes("強")) {
        result.intensity = "strong";
    } else if (text.includes("控えめ") || text.includes("シンプル") || text.includes("優しい")) {
        result.intensity = "subtle";
    }

    // イージング
    if (text.includes("バネ") || text.includes("弾力")) {
        result.easing = "spring";
    } else if (text.includes("なめらか") || text.includes("滑らか")) {
        result.easing = "ease-in-out";
    } else if (text.includes("急") || text.includes("素早")) {
        result.easing = "ease-in";
    }

    return result;
}
