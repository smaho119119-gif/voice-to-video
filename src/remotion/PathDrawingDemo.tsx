/**
 * PathDrawingDemo - @remotion/paths のSVGパスアニメーション
 *
 * 使用機能:
 * - evolvePath - パスが描かれるアニメーション
 * - getLength - パスの長さを取得
 * - getPointAtLength - パス上の点を取得
 * - interpolatePath - パス間の補間
 */

import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    spring,
    Easing,
} from "remotion";
import {
    evolvePath,
    getLength,
    getPointAtLength,
} from "@remotion/paths";

interface PathDrawingDemoProps {
    aspectRatio?: "16:9" | "9:16";
}

// Heart SVG path
const HEART_PATH = "M 100 200 C 100 100 200 0 300 100 C 400 0 500 100 500 200 C 500 350 300 450 300 450 C 300 450 100 350 100 200";

// Star SVG path
const STAR_PATH = "M 300 50 L 350 150 L 460 170 L 380 250 L 400 360 L 300 310 L 200 360 L 220 250 L 140 170 L 250 150 Z";

// Lightning bolt path
const LIGHTNING_PATH = "M 250 50 L 200 200 L 280 200 L 220 350 L 350 180 L 270 180 L 320 50 Z";

// Check mark path
const CHECK_PATH = "M 100 250 L 200 350 L 400 100";

// Signature-like path
const SIGNATURE_PATH = "M 100 300 Q 150 200 200 300 T 300 300 T 400 250 Q 450 200 500 250";

// Circle path (for particle movement)
const CIRCLE_PATH = "M 300 100 A 200 200 0 1 1 299.99 100";

export const PathDrawingDemo: React.FC<PathDrawingDemoProps> = ({
    aspectRatio = "16:9",
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // Animation progress
    const drawProgress = interpolate(
        frame,
        [0, fps * 2],
        [0, 1],
        { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
    );

    // Staggered delays for each shape
    const heartProgress = interpolate(frame, [fps * 0.2, fps * 2], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
    });

    const starProgress = interpolate(frame, [fps * 0.6, fps * 2.4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
    });

    const lightningProgress = interpolate(frame, [fps * 1, fps * 2.2], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.exp),
    });

    const checkProgress = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
    });

    const signatureProgress = interpolate(frame, [fps * 2, fps * 4], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
    });

    // Get evolved paths (drawing animation) - evolvePath returns style props
    const heartStyle = evolvePath(heartProgress, HEART_PATH);
    const starStyle = evolvePath(starProgress, STAR_PATH);
    const lightningStyle = evolvePath(lightningProgress, LIGHTNING_PATH);
    const checkStyle = evolvePath(checkProgress, CHECK_PATH);
    const signatureStyle = evolvePath(signatureProgress, SIGNATURE_PATH);

    // Particle moving along circle path
    const circleLength = getLength(CIRCLE_PATH);
    const particlePosition = getPointAtLength(
        CIRCLE_PATH,
        (frame * 5) % circleLength
    );

    // Fade
    const opacity = interpolate(
        frame,
        [0, fps * 0.3, durationInFrames - fps * 0.3, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Background hue shift
    const bgHue = interpolate(frame, [0, durationInFrames], [200, 260]);

    return (
        <AbsoluteFill style={{ opacity }}>
            {/* Background */}
            <AbsoluteFill
                style={{
                    background: `linear-gradient(135deg,
                        hsl(${bgHue}, 50%, 10%) 0%,
                        hsl(${bgHue + 20}, 40%, 5%) 100%)`,
                }}
            />

            {/* Title */}
            <div
                style={{
                    position: "absolute",
                    top: 30,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                }}
            >
                <h2
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: "white",
                        margin: 0,
                        opacity: 0.9,
                    }}
                >
                    SVG Path Drawing Animation
                </h2>
            </div>

            {/* Heart - Top Left */}
            <svg
                viewBox="0 0 600 500"
                style={{
                    position: "absolute",
                    top: 80,
                    left: 50,
                    width: 250,
                    height: 200,
                }}
            >
                <path
                    d={HEART_PATH}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: `drop-shadow(0 0 10px #ef4444)`,
                        strokeDasharray: heartStyle.strokeDasharray,
                        strokeDashoffset: heartStyle.strokeDashoffset,
                    }}
                />
                {/* Filled heart (fades in after drawing) */}
                <path
                    d={HEART_PATH}
                    fill="#ef444440"
                    stroke="none"
                    style={{
                        opacity: interpolate(heartProgress, [0.8, 1], [0, 1], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        }),
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: 290,
                    left: 120,
                    color: "#ef4444",
                    fontSize: 18,
                    fontWeight: 600,
                }}
            >
                Heart ❤️
            </div>

            {/* Star - Top Right */}
            <svg
                viewBox="0 0 600 400"
                style={{
                    position: "absolute",
                    top: 80,
                    right: 100,
                    width: 250,
                    height: 200,
                }}
            >
                <path
                    d={STAR_PATH}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: `drop-shadow(0 0 10px #fbbf24)`,
                        strokeDasharray: starStyle.strokeDasharray,
                        strokeDashoffset: starStyle.strokeDashoffset,
                    }}
                />
                <path
                    d={STAR_PATH}
                    fill="#fbbf2440"
                    stroke="none"
                    style={{
                        opacity: interpolate(starProgress, [0.8, 1], [0, 1], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        }),
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: 290,
                    right: 180,
                    color: "#fbbf24",
                    fontSize: 18,
                    fontWeight: 600,
                }}
            >
                Star ⭐
            </div>

            {/* Lightning - Center Left */}
            <svg
                viewBox="0 0 500 400"
                style={{
                    position: "absolute",
                    top: 320,
                    left: 100,
                    width: 200,
                    height: 180,
                }}
            >
                <path
                    d={LIGHTNING_PATH}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: `drop-shadow(0 0 15px #3b82f6)`,
                        strokeDasharray: lightningStyle.strokeDasharray,
                        strokeDashoffset: lightningStyle.strokeDashoffset,
                    }}
                />
                <path
                    d={LIGHTNING_PATH}
                    fill="#3b82f640"
                    stroke="none"
                    style={{
                        opacity: interpolate(lightningProgress, [0.8, 1], [0, 1], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        }),
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: 510,
                    left: 150,
                    color: "#3b82f6",
                    fontSize: 18,
                    fontWeight: 600,
                }}
            >
                Lightning ⚡
            </div>

            {/* Check - Center Right */}
            <svg
                viewBox="0 0 500 400"
                style={{
                    position: "absolute",
                    top: 340,
                    right: 150,
                    width: 200,
                    height: 150,
                }}
            >
                <path
                    d={CHECK_PATH}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: `drop-shadow(0 0 15px #22c55e)`,
                        strokeDasharray: checkStyle.strokeDasharray,
                        strokeDashoffset: checkStyle.strokeDashoffset,
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: 500,
                    right: 200,
                    color: "#22c55e",
                    fontSize: 18,
                    fontWeight: 600,
                }}
            >
                Check ✓
            </div>

            {/* Signature - Bottom Center */}
            <svg
                viewBox="0 0 600 400"
                style={{
                    position: "absolute",
                    bottom: 100,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 400,
                    height: 150,
                }}
            >
                <path
                    d={SIGNATURE_PATH}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: `drop-shadow(0 0 10px #8b5cf6)`,
                        strokeDasharray: signatureStyle.strokeDasharray,
                        strokeDashoffset: signatureStyle.strokeDashoffset,
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    bottom: 60,
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: "#8b5cf6",
                    fontSize: 18,
                    fontWeight: 600,
                }}
            >
                Signature ✍️
            </div>

            {/* Moving particle along circle */}
            <svg
                viewBox="0 0 600 600"
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 300,
                    height: 300,
                    opacity: 0.3,
                }}
            >
                <path
                    d={CIRCLE_PATH}
                    fill="none"
                    stroke="white"
                    strokeWidth={1}
                    strokeDasharray="5,5"
                />
            </svg>
            {particlePosition && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: `translate(
                            ${(particlePosition.x - 300) * 0.5 - 10}px,
                            ${(particlePosition.y - 300) * 0.5 - 10}px
                        )`,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "white",
                        boxShadow: "0 0 20px white, 0 0 40px white",
                    }}
                />
            )}

            {/* Progress indicator */}
            <div
                style={{
                    position: "absolute",
                    bottom: 20,
                    left: 40,
                    right: 40,
                    height: 4,
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: 2,
                }}
            >
                <div
                    style={{
                        width: `${(frame / durationInFrames) * 100}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                        borderRadius: 2,
                    }}
                />
            </div>
        </AbsoluteFill>
    );
};
