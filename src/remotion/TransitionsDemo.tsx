/**
 * TransitionsDemo - @remotion/transitions の全トランジションをデモ
 *
 * 使用機能:
 * - TransitionSeries - シーン間トランジション
 * - fade, slide, wipe, flip, clockWipe - 各種トランジション
 * - linearTiming, springTiming - タイミング制御
 */

import { AbsoluteFill, useVideoConfig } from "remotion";
import {
    TransitionSeries,
    linearTiming,
    springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";

interface TransitionsDemoProps {
    aspectRatio?: "16:9" | "9:16";
}

// Individual scene components
const SceneCard: React.FC<{
    title: string;
    subtitle: string;
    bgColor: string;
    textColor?: string;
    icon: string;
}> = ({ title, subtitle, bgColor, textColor = "white", icon }) => {
    return (
        <AbsoluteFill
            style={{
                background: bgColor,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
            }}
        >
            <div style={{ fontSize: 80 }}>{icon}</div>
            <h1
                style={{
                    fontSize: 64,
                    fontWeight: 900,
                    color: textColor,
                    margin: 0,
                    textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
            >
                {title}
            </h1>
            <p
                style={{
                    fontSize: 32,
                    color: textColor,
                    opacity: 0.8,
                    margin: 0,
                }}
            >
                {subtitle}
            </p>
        </AbsoluteFill>
    );
};

export const TransitionsDemo: React.FC<TransitionsDemoProps> = ({
    aspectRatio = "16:9",
}) => {
    const { fps } = useVideoConfig();
    const sceneDuration = fps * 2; // 2 seconds per scene
    const transitionDuration = fps * 0.8; // 0.8 second transitions

    return (
        <TransitionSeries>
            {/* Scene 1: Intro - Fade In */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="Fade"
                    subtitle="フェードトランジション"
                    bgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    icon="✨"
                />
            </TransitionSeries.Sequence>

            {/* Transition: Fade */}
            <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: transitionDuration })}
            />

            {/* Scene 2: Slide */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="Slide"
                    subtitle="スライドトランジション"
                    bgColor="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    icon="➡️"
                />
            </TransitionSeries.Sequence>

            {/* Transition: Slide from right */}
            <TransitionSeries.Transition
                presentation={slide({ direction: "from-right" })}
                timing={springTiming({
                    config: { damping: 12, stiffness: 100 },
                    durationInFrames: transitionDuration,
                })}
            />

            {/* Scene 3: Wipe */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="Wipe"
                    subtitle="ワイプトランジション"
                    bgColor="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                    icon="🌊"
                />
            </TransitionSeries.Sequence>

            {/* Transition: Wipe from left */}
            <TransitionSeries.Transition
                presentation={wipe({ direction: "from-left" })}
                timing={linearTiming({ durationInFrames: transitionDuration })}
            />

            {/* Scene 4: Flip */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="Flip"
                    subtitle="フリップトランジション"
                    bgColor="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                    icon="🔄"
                />
            </TransitionSeries.Sequence>

            {/* Transition: Flip */}
            <TransitionSeries.Transition
                presentation={flip({ direction: "from-right" })}
                timing={springTiming({
                    config: { damping: 15 },
                    durationInFrames: transitionDuration,
                })}
            />

            {/* Scene 5: Clock Wipe */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="Clock Wipe"
                    subtitle="時計ワイプトランジション"
                    bgColor="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                    icon="⏰"
                />
            </TransitionSeries.Sequence>

            {/* Transition: Clock Wipe */}
            <TransitionSeries.Transition
                presentation={clockWipe({ width: 1920, height: 1080 })}
                timing={linearTiming({ durationInFrames: transitionDuration })}
            />

            {/* Scene 6: Slide from bottom */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="Slide Up"
                    subtitle="下からスライド"
                    bgColor="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
                    icon="⬆️"
                />
            </TransitionSeries.Sequence>

            {/* Transition: Slide from bottom */}
            <TransitionSeries.Transition
                presentation={slide({ direction: "from-bottom" })}
                timing={springTiming({
                    config: { damping: 10, stiffness: 150 },
                    durationInFrames: transitionDuration,
                })}
            />

            {/* Scene 7: Final - All combined */}
            <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <SceneCard
                    title="完了!"
                    subtitle="全トランジションデモ終了"
                    bgColor="linear-gradient(135deg, #0c3483 0%, #a2b6df 50%, #6b8dd6 100%)"
                    icon="🎉"
                />
            </TransitionSeries.Sequence>
        </TransitionSeries>
    );
};
