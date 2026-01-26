"use client";

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { useMemo } from "react";
import type { SceneAsset, AssetAnimation, ShapeAsset, IconAsset, TextAsset, LottieAsset, SvgAsset } from "@/lib/video-presets";
import { Check, X, Star, Heart, ThumbsUp, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Play, Pause, Volume2, Mic, Camera, Sparkles, Zap, Flame, Trophy, Medal, Crown } from "lucide-react";

interface AssetRendererProps {
    assets: SceneAsset[];
    isVertical: boolean;
}

// Lucide icon mapping
const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
    "check": Check,
    "x": X,
    "star": Star,
    "heart": Heart,
    "thumbs-up": ThumbsUp,
    "arrow-right": ArrowRight,
    "arrow-left": ArrowLeft,
    "arrow-up": ArrowUp,
    "arrow-down": ArrowDown,
    "play": Play,
    "pause": Pause,
    "volume-2": Volume2,
    "mic": Mic,
    "camera": Camera,
    "sparkles": Sparkles,
    "zap": Zap,
    "flame": Flame,
    "trophy": Trophy,
    "medal": Medal,
    "crown": Crown,
};

export const AssetRenderer: React.FC<AssetRendererProps> = ({ assets, isVertical }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (!assets || assets.length === 0) return null;

    return (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
            {assets.map((asset) => (
                <SingleAsset
                    key={asset.id}
                    asset={asset}
                    frame={frame}
                    fps={fps}
                    isVertical={isVertical}
                />
            ))}
        </AbsoluteFill>
    );
};

interface SingleAssetProps {
    asset: SceneAsset;
    frame: number;
    fps: number;
    isVertical: boolean;
}

const SingleAsset: React.FC<SingleAssetProps> = ({ asset, frame, fps, isVertical }) => {
    // Calculate animation
    const animationStyle = useMemo(() => {
        const delay = (asset.animationDelay || 0) * fps;
        const duration = (asset.animationDuration || 0.5) * fps;
        const localFrame = frame - delay;

        if (localFrame < 0) {
            return { opacity: 0, transform: "none" };
        }

        const progress = Math.min(localFrame / duration, 1);

        // Spring animation for bouncy effects
        const springProgress = spring({
            fps,
            frame: Math.max(0, localFrame),
            config: {
                damping: 12,
                stiffness: 200,
                mass: 0.5,
            },
        });

        return getAnimationStyle(asset.animation, progress, springProgress);
    }, [asset.animation, asset.animationDelay, asset.animationDuration, frame, fps]);

    // Position style
    const positionStyle: React.CSSProperties = {
        position: "absolute",
        left: `${asset.position.x}%`,
        top: `${asset.position.y}%`,
        transform: `translate(-50%, -50%) ${animationStyle.transform || ""}`,
        opacity: (asset.opacity ?? 1) * (animationStyle.opacity ?? 1),
        zIndex: asset.zIndex || 1,
        width: asset.position.width ? `${asset.position.width}%` : "auto",
        height: asset.position.height ? `${asset.position.height}%` : "auto",
    };

    // Render based on asset type
    switch (asset.type) {
        case "shape":
            return <ShapeRenderer asset={asset} style={positionStyle} />;
        case "icon":
            return <IconRenderer asset={asset} style={positionStyle} />;
        case "text":
            return <TextRenderer asset={asset} style={positionStyle} />;
        case "lottie":
            return <LottieRenderer asset={asset} style={positionStyle} />;
        case "svg":
            return <SvgRenderer asset={asset} style={positionStyle} />;
        default:
            return null;
    }
};

// Animation style generator
function getAnimationStyle(animation: AssetAnimation, progress: number, springProgress: number): { opacity: number; transform: string } {
    switch (animation) {
        case "none":
            return { opacity: 1, transform: "" };
        case "fadeIn":
            return { opacity: progress, transform: "" };
        case "fadeOut":
            return { opacity: 1 - progress, transform: "" };
        case "slideInLeft":
            return { opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [-100, 0])}px)` };
        case "slideInRight":
            return { opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [100, 0])}px)` };
        case "slideInUp":
            return { opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [100, 0])}px)` };
        case "slideInDown":
            return { opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [-100, 0])}px)` };
        case "bounce":
            return { opacity: 1, transform: `scale(${interpolate(springProgress, [0, 0.5, 1], [0, 1.3, 1])})` };
        case "pulse":
            return { opacity: 1, transform: `scale(${1 + Math.sin(progress * Math.PI * 4) * 0.1})` };
        case "spin":
            return { opacity: 1, transform: `rotate(${progress * 360}deg)` };
        case "shake":
            return { opacity: 1, transform: `translateX(${Math.sin(progress * Math.PI * 10) * 10}px)` };
        case "scale":
            return { opacity: 1, transform: `scale(${interpolate(springProgress, [0, 1], [0, 1])})` };
        case "pop":
            return { opacity: springProgress, transform: `scale(${interpolate(springProgress, [0, 0.7, 1], [0, 1.2, 1])})` };
        default:
            return { opacity: 1, transform: "" };
    }
}

// Shape Renderer
const ShapeRenderer: React.FC<{ asset: ShapeAsset; style: React.CSSProperties }> = ({ asset, style }) => {
    const shapeStyle: React.CSSProperties = {
        ...style,
        backgroundColor: asset.fillColor || "#3B82F6",
        border: asset.strokeWidth ? `${asset.strokeWidth}px solid ${asset.strokeColor || "#1D4ED8"}` : "none",
        borderRadius: asset.shapeType === "circle" ? "50%" : (asset.borderRadius || 0),
    };

    switch (asset.shapeType) {
        case "circle":
            return <div style={{ ...shapeStyle, width: style.width || 100, height: style.height || 100, aspectRatio: "1" }} />;
        case "triangle":
            return (
                <div
                    style={{
                        ...style,
                        width: 0,
                        height: 0,
                        borderLeft: "50px solid transparent",
                        borderRight: "50px solid transparent",
                        borderBottom: `100px solid ${asset.fillColor || "#3B82F6"}`,
                        backgroundColor: "transparent",
                    }}
                />
            );
        case "arrow":
            return (
                <div style={{ ...style, display: "flex", alignItems: "center" }}>
                    <ArrowRight size={48} color={asset.fillColor || "#3B82F6"} />
                </div>
            );
        case "line":
            return (
                <div
                    style={{
                        ...style,
                        width: style.width || 100,
                        height: asset.strokeWidth || 4,
                        backgroundColor: asset.fillColor || "#3B82F6",
                    }}
                />
            );
        case "star":
            return (
                <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Star size={48} fill={asset.fillColor || "#FBBF24"} color={asset.strokeColor || "#F59E0B"} />
                </div>
            );
        case "rectangle":
        default:
            return <div style={{ ...shapeStyle, width: style.width || 100, height: style.height || 60 }} />;
    }
};

// Icon Renderer
const IconRenderer: React.FC<{ asset: IconAsset; style: React.CSSProperties }> = ({ asset, style }) => {
    const IconComponent = ICON_COMPONENTS[asset.iconName] || Star;
    return (
        <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconComponent size={asset.size || 48} color={asset.color || "#FBBF24"} />
        </div>
    );
};

// Text Renderer
const TextRenderer: React.FC<{ asset: TextAsset; style: React.CSSProperties }> = ({ asset, style }) => {
    return (
        <div
            style={{
                ...style,
                fontSize: asset.fontSize || 32,
                fontWeight: asset.fontWeight || "bold",
                color: asset.color || "#FFFFFF",
                backgroundColor: asset.backgroundColor || "transparent",
                padding: asset.padding || 8,
                textAlign: asset.textAlign || "center",
                whiteSpace: "nowrap",
            }}
        >
            {asset.text}
        </div>
    );
};

// Lottie Renderer (placeholder - actual Lottie implementation would need @lottiefiles/react-lottie-player)
const LottieRenderer: React.FC<{ asset: LottieAsset; style: React.CSSProperties }> = ({ asset, style }) => {
    // For now, show a placeholder with the Lottie ID
    // In production, you would use a Lottie player library
    return (
        <div
            style={{
                ...style,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: style.width || 100,
                height: style.height || 100,
            }}
        >
            {asset.lottieId === "confetti" && <Sparkles size={48} color="#FBBF24" />}
            {asset.lottieId === "fireworks" && <Sparkles size={48} color="#EC4899" />}
            {asset.lottieId === "checkmark" && <Check size={48} color="#10B981" />}
            {asset.lottieId === "error" && <X size={48} color="#EF4444" />}
            {!["confetti", "fireworks", "checkmark", "error"].includes(asset.lottieId) && (
                <Sparkles size={48} color="#8B5CF6" />
            )}
        </div>
    );
};

// SVG Renderer (placeholder)
const SvgRenderer: React.FC<{ asset: SvgAsset; style: React.CSSProperties }> = ({ asset, style }) => {
    return (
        <div
            style={{
                ...style,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Check size={48} color={asset.color || "#10B981"} />
        </div>
    );
};
