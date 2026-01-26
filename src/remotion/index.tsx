import React from "react";
import { Composition } from "remotion";
import { MainVideo, VideoProps } from "./MainVideo";
import { AllEffectsDemo } from "./AllEffectsDemo";
import { TransitionsDemo } from "./TransitionsDemo";
import { MotionBlurDemo } from "./MotionBlurDemo";
import { PathDrawingDemo } from "./PathDrawingDemo";
import { ShapesDemo } from "./ShapesDemo";
import { SkiaDemo } from "./SkiaDemo";
import { BouncingBallDemo } from "./BouncingBallDemo";

// Calculate total duration in frames based on video config
function calculateDuration(props: VideoProps): number {
    const fps = 30;
    let totalDuration = 0;

    // Add opening duration
    if (props.opening?.enabled && props.opening.duration) {
        totalDuration += props.opening.duration;
    }

    // Add scenes duration
    props.scenes.forEach(scene => {
        totalDuration += scene.duration || 3;
    });

    // Add ending duration
    if (props.ending?.enabled && props.ending.duration) {
        totalDuration += props.ending.duration;
    }

    return Math.ceil(totalDuration * fps);
}

// Get resolution from aspect ratio
function getResolution(aspectRatio?: string): { width: number; height: number } {
    if (aspectRatio === "9:16") {
        return { width: 1080, height: 1920 };
    }
    return { width: 1920, height: 1080 }; // default 16:9
}

export const RemotionRoot: React.FC = () => {
    const defaultProps: VideoProps = {
        title: "AI Video Project",
        scenes: [
            {
                duration: 3,
                avatar_script: "こんにちは。AIによる自動動画生成の世界へようこそ。",
                subtitle: "AI自動動画生成へようこそ",
                image_prompt: "Futuristic city landscape, high tech, blue lighting, photorealistic",
                imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"
            }
        ]
    };

    const resolution = getResolution(defaultProps.aspectRatio);
    const duration = calculateDuration(defaultProps);

    // Demo props with quiz and problem scenes
    const demoProps: VideoProps = {
        title: "インタラクティブ動画デモ",
        scenes: [
            // Problem scene - 悩み提示
            {
                duration: 6,
                avatar_script: "",
                subtitle: "",
                image_prompt: "",
                sceneType: "problem" as const,
                problemHeadline: "こんな悩みはありませんか？",
                problemItems: [
                    "動画編集に時間がかかりすぎる",
                    "プロのような動画が作れない",
                    "毎回同じような動画になってしまう",
                ],
                problemVariant: "dramatic" as const,
            },
            // Quiz scene - 解決策提示
            {
                duration: 6,
                avatar_script: "",
                subtitle: "",
                image_prompt: "",
                sceneType: "quiz" as const,
                quizQuestion: "どの機能が一番欲しいですか？",
                quizChoices: [
                    { text: "AIによる自動編集", icon: "🤖" },
                    { text: "プロ級のエフェクト", icon: "✨" },
                    { text: "ワンクリック動画生成", icon: "🚀" },
                ],
                quizTheme: "benefit" as const,
                quizHighlightIndex: 2,
            },
            // Text scene
            {
                duration: 4,
                avatar_script: "全部叶えます！",
                subtitle: "AI動画生成で全て解決！",
                image_prompt: "",
                sceneType: "text" as const,
                emotion: "excited" as const,
            },
        ],
        opening: {
            enabled: true,
            duration: 3,
            subtitle: "新時代の動画制作",
        },
        ending: {
            enabled: true,
            duration: 4,
            callToAction: "今すぐ無料で始める",
            channelName: "AI Video Generator",
        },
    };

    const demoResolution = getResolution(demoProps.aspectRatio);
    const demoDuration = calculateDuration(demoProps);

    return (
        <>
            {/* Main Video Composition */}
            <Composition
                id="MainVideo"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component={MainVideo as any}
                durationInFrames={duration}
                fps={30}
                width={resolution.width}
                height={resolution.height}
                defaultProps={defaultProps}
                calculateMetadata={({ props }) => {
                    const videoProps = props as unknown as VideoProps;
                    const res = getResolution(videoProps.aspectRatio);
                    const dur = calculateDuration(videoProps);
                    return {
                        durationInFrames: dur,
                        fps: 30,
                        width: res.width,
                        height: res.height,
                    };
                }}
            />

            {/* Interactive Demo - Quiz & Problem Scenes */}
            <Composition
                id="InteractiveDemo"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component={MainVideo as any}
                durationInFrames={demoDuration}
                fps={30}
                width={demoResolution.width}
                height={demoResolution.height}
                defaultProps={demoProps}
            />

            {/* All Effects Demo - Showcase all Remotion features */}
            <Composition
                id="AllEffectsDemo"
                component={AllEffectsDemo}
                durationInFrames={30 * 5} // 5 seconds
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Vertical versions */}
            <Composition
                id="AllEffectsDemo-Vertical"
                component={AllEffectsDemo}
                durationInFrames={30 * 5}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />

            {/* Transitions Demo - fade, slide, wipe, flip, clockWipe */}
            <Composition
                id="TransitionsDemo"
                component={TransitionsDemo}
                durationInFrames={30 * 14} // 7 scenes × 2 seconds each
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            <Composition
                id="TransitionsDemo-Vertical"
                component={TransitionsDemo}
                durationInFrames={30 * 14}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />

            {/* Motion Blur Demo - Trail effects */}
            <Composition
                id="MotionBlurDemo"
                component={MotionBlurDemo}
                durationInFrames={30 * 8} // 8 seconds
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            <Composition
                id="MotionBlurDemo-Vertical"
                component={MotionBlurDemo}
                durationInFrames={30 * 8}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />

            {/* Path Drawing Demo - SVG path animations */}
            <Composition
                id="PathDrawingDemo"
                component={PathDrawingDemo}
                durationInFrames={30 * 6} // 6 seconds
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            <Composition
                id="PathDrawingDemo-Vertical"
                component={PathDrawingDemo}
                durationInFrames={30 * 6}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />

            {/* Shapes Demo - @remotion/shapes animated */}
            <Composition
                id="ShapesDemo"
                component={ShapesDemo}
                durationInFrames={30 * 6} // 6 seconds
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            <Composition
                id="ShapesDemo-Vertical"
                component={ShapesDemo}
                durationInFrames={30 * 6}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />

            {/* Skia Demo - GPU-accelerated graphics */}
            <Composition
                id="SkiaDemo"
                component={SkiaDemo as React.FC}
                durationInFrames={30 * 8}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            <Composition
                id="SkiaDemo-Vertical"
                component={SkiaDemo as React.FC}
                durationInFrames={30 * 8}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />

            {/* Bouncing Ball Demo - Squash & Stretch Physics */}
            <Composition
                id="BouncingBallDemo"
                component={BouncingBallDemo as React.FC}
                durationInFrames={30 * 10}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            <Composition
                id="BouncingBallDemo-Vertical"
                component={BouncingBallDemo as React.FC}
                durationInFrames={30 * 10}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ aspectRatio: "9:16" as const }}
            />
        </>
    );
};
