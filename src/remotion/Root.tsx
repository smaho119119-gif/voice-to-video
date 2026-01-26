import React from "react";
import { registerRoot, Composition } from "remotion";
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

    if (props.opening?.enabled && props.opening.duration) {
        totalDuration += props.opening.duration;
    }

    props.scenes.forEach(scene => {
        totalDuration += scene.duration || 3;
    });

    if (props.ending?.enabled && props.ending.duration) {
        totalDuration += props.ending.duration;
    }

    return Math.ceil(totalDuration * fps);
}

function getResolution(aspectRatio?: string): { width: number; height: number } {
    if (aspectRatio === "9:16") {
        return { width: 1080, height: 1920 };
    }
    return { width: 1920, height: 1080 };
}

const RemotionRoot: React.FC = () => {
    const defaultProps: VideoProps = {
        title: "AI Video Project",
        scenes: [
            {
                duration: 3,
                avatar_script: "こんにちは。AIによる自動動画生成の世界へようこそ。",
                subtitle: "AI自動動画生成へようこそ",
                image_prompt: "Futuristic city landscape",
                imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000"
            }
        ]
    };

    const resolution = getResolution(defaultProps.aspectRatio);
    const duration = calculateDuration(defaultProps);

    return (
        <>
            {/* Main Video */}
            <Composition
                id="MainVideo"
                component={MainVideo as React.FC}
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

            {/* All Effects Demo */}
            <Composition
                id="AllEffectsDemo"
                component={AllEffectsDemo}
                durationInFrames={30 * 5}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Transitions Demo */}
            <Composition
                id="TransitionsDemo"
                component={TransitionsDemo}
                durationInFrames={30 * 14}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Motion Blur Demo */}
            <Composition
                id="MotionBlurDemo"
                component={MotionBlurDemo}
                durationInFrames={30 * 8}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Path Drawing Demo */}
            <Composition
                id="PathDrawingDemo"
                component={PathDrawingDemo}
                durationInFrames={30 * 6}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Shapes Demo */}
            <Composition
                id="ShapesDemo"
                component={ShapesDemo}
                durationInFrames={30 * 6}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Skia Demo */}
            <Composition
                id="SkiaDemo"
                component={SkiaDemo as React.FC}
                durationInFrames={30 * 8}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ aspectRatio: "16:9" as const }}
            />

            {/* Bouncing Ball Demo */}
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

registerRoot(RemotionRoot);
