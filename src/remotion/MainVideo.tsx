"use client";

import { AbsoluteFill, Sequence, useVideoConfig, Audio } from "remotion";
import { OpeningScene } from "./OpeningScene";
import { EndingScene } from "./EndingScene";
import { TextOnlyScene } from "./TextOnlyScene";
import { QuizScene, QuizChoice } from "./QuizScene";
import { ProblemScene } from "./ProblemScene";
import { SceneComponent } from "./components/SceneComponent";
import { VOLUME_LEVELS, TRANSITION_OVERLAP } from "./utils/constants";
import type { SceneAnimation, VideoAnimation } from "@/types/animation";

// Transition types
export type TransitionType = "fade" | "slide" | "zoom" | "wipe";

// Aspect ratio type
export type AspectRatio = "16:9" | "9:16";

export interface SoundEffect {
    type: "ambient" | "action" | "transition" | "emotion";
    keyword: string;
    timing: "start" | "middle" | "end" | "throughout";
    volume: number;
    url?: string;
}

// Scene types for different content
export type SceneType = "normal" | "text" | "quiz" | "problem";

// テキスト表示モード
// - "instant": 即座に全文表示
// - "sync-typewriter": 音声の長さに合わせて1文字ずつ表示
// - "word-bounce": 単語ごとにバウンスアニメーション（デフォルト）
export type TextDisplayMode = "instant" | "sync-typewriter" | "word-bounce";

export interface Scene {
    duration: number;
    avatar_script: string;
    subtitle: string;
    image_prompt: string;
    imageUrl?: string;
    audioUrl?: string;
    heygenVideoUrl?: string;
    lipSyncVideoUrl?: string; // Easy-Wav2Lip generated video
    sound_effects?: SoundEffect[];
    emotion?: "neutral" | "happy" | "serious" | "excited" | "thoughtful";
    transition?: TransitionType;
    emphasis_words?: string[];
    // New scene type properties
    sceneType?: SceneType;
    // Quiz scene properties
    quizQuestion?: string;
    quizChoices?: QuizChoice[];
    quizTheme?: "problem" | "benefit" | "compare" | "quiz";
    quizHighlightIndex?: number;
    // Problem scene properties
    problemHeadline?: string;
    problemItems?: string[];
    problemVariant?: "shake" | "pulse" | "dramatic";
    // Animation settings
    animation?: SceneAnimation;
    // Assets (shapes, icons, text, lottie, svg)
    assets?: any[];
    // Text display mode
    textDisplayMode?: TextDisplayMode;
}

export interface BGMConfig {
    url: string;
    volume: number;
}

export interface OpeningConfig {
    enabled: boolean;
    duration?: number; // in seconds, default 3
    subtitle?: string;
}

export interface EndingConfig {
    enabled: boolean;
    duration?: number; // in seconds, default 4
    callToAction?: string;
    channelName?: string;
}

export interface AvatarConfig {
    enabled: boolean;
    position?: "left" | "right" | "center";
    size?: "small" | "medium" | "large";
    imageUrl?: string;
}

export interface VideoProps {
    title: string;
    scenes: Scene[];
    bgm?: BGMConfig;
    aspectRatio?: AspectRatio;
    opening?: OpeningConfig;
    ending?: EndingConfig;
    avatar?: AvatarConfig;
    textOnly?: boolean; // テキストのみモード（画像なし）
    animation?: VideoAnimation; // 動画全体のアニメーション設定
    showSubtitle?: boolean; // テロップ表示（デフォルト: false）
}

export const MainVideo: React.FC<VideoProps> = ({ title, scenes, bgm, aspectRatio = "16:9", opening, ending, avatar, textOnly = false, showSubtitle = false }) => {
    const { fps } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // Calculate opening/ending durations
    const openingDuration = opening?.enabled ? (opening.duration || 3) : 0;
    const endingDuration = ending?.enabled ? (ending.duration || 4) : 0;
    const openingFrames = openingDuration * fps;
    const endingFrames = endingDuration * fps;

    // Pre-calculate start frames with transition overlap (offset by opening duration)
    // Each scene overlaps with the previous scene by the transition duration to avoid black gaps
    const sceneFrames = scenes.map((scene, index) => {
        // Calculate base start time (sum of all previous scene durations)
        let startFrame = openingFrames;
        for (let i = 0; i < index; i++) {
            startFrame += scenes[i].duration * fps;
            // Subtract overlap for all scenes except the first
            if (i > 0) {
                startFrame -= TRANSITION_OVERLAP;
            }
        }
        // For scenes after the first, subtract overlap to create seamless transition
        if (index > 0) {
            startFrame -= TRANSITION_OVERLAP;
        }
        const durationInFrames = scene.duration * fps;
        return { startFrame, durationInFrames };
    });

    // Calculate ending start frame (accounting for overlaps)
    let endingStartFrame = openingFrames;
    scenes.forEach((scene, index) => {
        endingStartFrame += scene.duration * fps;
        if (index > 0) {
            endingStartFrame -= TRANSITION_OVERLAP;
        }
    });

    return (
        <AbsoluteFill className="bg-black">
            {/* BGM - plays throughout entire video */}
            {bgm?.url && (
                <Audio
                    src={bgm.url}
                    volume={bgm.volume || VOLUME_LEVELS.bgm}
                    loop
                />
            )}

            {/* Opening Scene */}
            {opening?.enabled && (
                <Sequence from={0} durationInFrames={openingFrames}>
                    <OpeningScene
                        title={title}
                        subtitle={opening.subtitle}
                        aspectRatio={aspectRatio}
                    />
                </Sequence>
            )}

            {/* Main Content Scenes */}
            {scenes.map((scene: Scene, index: number) => {
                // Validate media URLs
                const hasValidAudio = scene.audioUrl && scene.audioUrl.trim().length > 0;

                // Determine scene type
                const sceneType = scene.sceneType || (textOnly ? "text" : "normal");

                return (
                    <Sequence
                        key={index}
                        from={sceneFrames[index].startFrame}
                        durationInFrames={sceneFrames[index].durationInFrames}
                    >
                        {/* Audio for all scene types */}
                        {hasValidAudio && (
                            <Audio
                                key={`audio-${index}`}
                                src={scene.audioUrl!}
                                volume={VOLUME_LEVELS.narration}
                            />
                        )}

                        {/* Render based on scene type */}
                        {sceneType === "quiz" && scene.quizQuestion && scene.quizChoices ? (
                            <QuizScene
                                question={scene.quizQuestion}
                                choices={scene.quizChoices}
                                aspectRatio={aspectRatio}
                                theme={scene.quizTheme || "quiz"}
                                highlightIndex={scene.quizHighlightIndex}
                            />
                        ) : sceneType === "problem" && scene.problemHeadline && scene.problemItems ? (
                            <ProblemScene
                                headline={scene.problemHeadline}
                                problems={scene.problemItems}
                                aspectRatio={aspectRatio}
                                variant={scene.problemVariant || "dramatic"}
                            />
                        ) : sceneType === "text" || textOnly ? (
                            <TextOnlyScene
                                subtitle={scene.subtitle}
                                emotion={scene.emotion}
                                aspectRatio={aspectRatio}
                                sceneIndex={index}
                            />
                        ) : (
                            <SceneComponent
                                scene={scene}
                                sceneIndex={index}
                                isVertical={isVertical}
                                avatar={avatar}
                                showSubtitle={showSubtitle}
                            />
                        )}
                    </Sequence>
                );
            })}

            {/* Ending Scene */}
            {ending?.enabled && (
                <Sequence from={endingStartFrame} durationInFrames={endingFrames}>
                    <EndingScene
                        title={title}
                        callToAction={ending.callToAction}
                        channelName={ending.channelName}
                        aspectRatio={aspectRatio}
                    />
                </Sequence>
            )}
        </AbsoluteFill>
    );
};
