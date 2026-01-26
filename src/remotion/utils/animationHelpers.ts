/**
 * Animation Helpers for Remotion
 * アニメーション設定からRemotionのスタイル/変換を生成するユーティリティ
 */

import { interpolate, Easing } from "remotion";
import type { SceneAnimation, EasingType, ImageEffect, TextAnimation } from "@/types/animation";

/**
 * EasingTypeからRemotionのEasing関数を取得
 */
export function getEasingFunction(easingType?: EasingType): ((t: number) => number) {
    switch (easingType) {
        case "linear":
            return (t: number) => t;
        case "ease-in":
            return Easing.in(Easing.cubic);
        case "ease-out":
            return Easing.out(Easing.cubic);
        case "ease-in-out":
            return Easing.inOut(Easing.cubic);
        case "spring":
            return Easing.bezier(0.68, -0.55, 0.265, 1.55);
        case "bounce":
            return Easing.bounce;
        default:
            return Easing.inOut(Easing.cubic);
    }
}

/**
 * 画像エフェクトのスタイルを計算
 */
export function calculateImageEffectStyle(
    effect: ImageEffect | undefined,
    frame: number,
    durationInFrames: number,
    fps: number,
    kenBurnsConfig?: { startScale: number; endScale: number; startX?: number; endX?: number; startY?: number; endY?: number },
    easing?: EasingType
): React.CSSProperties {
    const easingFn = getEasingFunction(easing);
    const progress = frame / durationInFrames;

    switch (effect) {
        case "ken-burns": {
            const config = kenBurnsConfig || { startScale: 1, endScale: 1.15 };
            const scale = interpolate(progress, [0, 1], [config.startScale, config.endScale], {
                easing: easingFn,
            });
            const x = config.startX !== undefined && config.endX !== undefined
                ? interpolate(progress, [0, 1], [config.startX, config.endX], { easing: easingFn })
                : 0;
            const y = config.startY !== undefined && config.endY !== undefined
                ? interpolate(progress, [0, 1], [config.startY, config.endY], { easing: easingFn })
                : 0;
            return {
                transform: `scale(${scale}) translate(${x}%, ${y}%)`,
            };
        }

        case "zoom-in": {
            const scale = interpolate(progress, [0, 1], [1, 1.3], { easing: easingFn });
            return { transform: `scale(${scale})` };
        }

        case "zoom-out": {
            const scale = interpolate(progress, [0, 1], [1.3, 1], { easing: easingFn });
            return { transform: `scale(${scale})` };
        }

        case "pan-left": {
            const x = interpolate(progress, [0, 1], [0, -10], { easing: easingFn });
            return { transform: `translateX(${x}%) scale(1.1)` };
        }

        case "pan-right": {
            const x = interpolate(progress, [0, 1], [0, 10], { easing: easingFn });
            return { transform: `translateX(${x}%) scale(1.1)` };
        }

        case "pulse": {
            const scale = 1 + Math.sin(frame * 0.1) * 0.05;
            return { transform: `scale(${scale})` };
        }

        case "float": {
            const y = Math.sin(frame * 0.05) * 10;
            const rotation = Math.sin(frame * 0.03) * 2;
            return { transform: `translateY(${y}px) rotate(${rotation}deg)` };
        }

        case "shake": {
            const intensity = 3;
            const x = Math.sin(frame * 0.5) * intensity;
            const y = Math.cos(frame * 0.7) * intensity;
            return { transform: `translate(${x}px, ${y}px)` };
        }

        case "parallax": {
            const scale = 1.1;
            const x = interpolate(progress, [0, 1], [-2, 2], { easing: easingFn });
            return { transform: `scale(${scale}) translateX(${x}%)` };
        }

        default:
            return {};
    }
}

/**
 * テキストアニメーションのスタイルを計算
 */
export function calculateTextAnimationStyle(
    animation: TextAnimation | undefined,
    frame: number,
    startFrame: number,
    fps: number,
    easing?: EasingType
): React.CSSProperties {
    const easingFn = getEasingFunction(easing);
    const animationDuration = fps * 0.5; // 0.5秒のアニメーション
    const localFrame = frame - startFrame;
    const progress = Math.min(1, Math.max(0, localFrame / animationDuration));

    switch (animation) {
        case "fade": {
            const opacity = interpolate(progress, [0, 1], [0, 1], { easing: easingFn });
            return { opacity };
        }

        case "slide-up": {
            const opacity = interpolate(progress, [0, 0.3], [0, 1], { easing: easingFn });
            const y = interpolate(progress, [0, 1], [50, 0], { easing: easingFn });
            return { opacity, transform: `translateY(${y}px)` };
        }

        case "slide-down": {
            const opacity = interpolate(progress, [0, 0.3], [0, 1], { easing: easingFn });
            const y = interpolate(progress, [0, 1], [-50, 0], { easing: easingFn });
            return { opacity, transform: `translateY(${y}px)` };
        }

        case "slide-left": {
            const opacity = interpolate(progress, [0, 0.3], [0, 1], { easing: easingFn });
            const x = interpolate(progress, [0, 1], [100, 0], { easing: easingFn });
            return { opacity, transform: `translateX(${x}px)` };
        }

        case "slide-right": {
            const opacity = interpolate(progress, [0, 0.3], [0, 1], { easing: easingFn });
            const x = interpolate(progress, [0, 1], [-100, 0], { easing: easingFn });
            return { opacity, transform: `translateX(${x}px)` };
        }

        case "scale": {
            const opacity = interpolate(progress, [0, 0.3], [0, 1], { easing: easingFn });
            const scale = interpolate(progress, [0, 1], [0.5, 1], { easing: easingFn });
            return { opacity, transform: `scale(${scale})` };
        }

        case "bounce": {
            const bounceEasing = Easing.bounce;
            const opacity = interpolate(progress, [0, 0.2], [0, 1]);
            const y = interpolate(progress, [0, 1], [100, 0], { easing: bounceEasing });
            return { opacity, transform: `translateY(${y}px)` };
        }

        case "glow": {
            const opacity = interpolate(progress, [0, 1], [0, 1], { easing: easingFn });
            const glowIntensity = interpolate(progress, [0, 0.5, 1], [0, 20, 10]);
            return {
                opacity,
                textShadow: `0 0 ${glowIntensity}px currentColor`,
            };
        }

        case "typewriter":
        case "reveal":
            // これらは別途処理が必要（文字単位）
            return { opacity: 1 };

        default:
            return { opacity: 1 };
    }
}

/**
 * タイプライター効果用のテキスト表示文字数を計算
 */
export function calculateTypewriterText(
    text: string,
    frame: number,
    startFrame: number,
    fps: number,
    charsPerSecond: number = 15
): string {
    const localFrame = frame - startFrame;
    const charsPerFrame = charsPerSecond / fps;
    const visibleChars = Math.floor(localFrame * charsPerFrame);
    return text.slice(0, visibleChars);
}

/**
 * シーンアニメーション設定からデフォルト値を適用
 */
export function applyAnimationDefaults(
    sceneAnimation?: SceneAnimation,
    defaultAnimation?: SceneAnimation
): SceneAnimation {
    const defaults: SceneAnimation = {
        imageEffect: "ken-burns",
        textEntrance: "fade",
        sceneEntrance: "fade",
        transitionDuration: 0.5,
        intensity: "normal",
        easing: "ease-in-out",
    };

    return {
        ...defaults,
        ...defaultAnimation,
        ...sceneAnimation,
    };
}
