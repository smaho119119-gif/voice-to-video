/**
 * MotionBlurDemo - @remotion/motion-blur のモーションブラーデモ
 *
 * 使用機能:
 * - Trail - 残像エフェクト
 * - CameraMotionBlur - カメラ風モーションブラー
 */

import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    spring,
} from "remotion";
import { Trail } from "@remotion/motion-blur";

interface MotionBlurDemoProps {
    aspectRatio?: "16:9" | "9:16";
}

// Moving ball component
const MovingBall: React.FC<{
    color: string;
    size: number;
    xRange: [number, number];
    yRange: [number, number];
    delay?: number;
}> = ({ color, size, xRange, yRange, delay = 0 }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    const localFrame = Math.max(0, frame - delay);

    // Smooth movement using spring
    const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 15, stiffness: 50 },
        durationInFrames: durationInFrames - delay,
    });

    const x = interpolate(progress, [0, 1], xRange);
    const y = interpolate(progress, [0, 1], yRange);

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 ${size / 2}px ${color}, 0 0 ${size}px ${color}50`,
            }}
        />
    );
};

// Fast moving object for trail effect
const FastMovingObject: React.FC<{
    color: string;
    label: string;
}> = ({ color, label }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Oscillating movement
    const x = interpolate(
        Math.sin(frame * 0.08),
        [-1, 1],
        [100, 700]
    );

    const y = interpolate(
        Math.cos(frame * 0.06),
        [-1, 1],
        [200, 400]
    );

    const rotation = frame * 3;

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `rotate(${rotation}deg)`,
            }}
        >
            <div
                style={{
                    width: 100,
                    height: 100,
                    background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 900,
                    fontSize: 24,
                    boxShadow: `0 10px 40px ${color}60`,
                }}
            >
                {label}
            </div>
        </div>
    );
};

// Bouncing text
const BouncingText: React.FC<{ text: string }> = ({ text }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const bounce = spring({
        frame: frame % (fps * 2),
        fps,
        config: { damping: 5, stiffness: 100 },
    });

    const y = interpolate(bounce, [0, 1], [0, -100]);
    const scale = interpolate(bounce, [0, 0.5, 1], [1, 1.3, 1]);

    return (
        <div
            style={{
                position: "absolute",
                bottom: 150,
                left: "50%",
                transform: `translateX(-50%) translateY(${y}px) scale(${scale})`,
            }}
        >
            <h1
                style={{
                    fontSize: 72,
                    fontWeight: 900,
                    color: "white",
                    margin: 0,
                    textShadow: "0 0 30px rgba(255,255,255,0.5)",
                }}
            >
                {text}
            </h1>
        </div>
    );
};

export const MotionBlurDemo: React.FC<MotionBlurDemoProps> = ({
    aspectRatio = "16:9",
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // Background gradient animation
    const bgHue = interpolate(frame, [0, durationInFrames], [220, 280]);

    // Fade in/out
    const opacity = interpolate(
        frame,
        [0, fps * 0.5, durationInFrames - fps * 0.5, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <AbsoluteFill style={{ opacity }}>
            {/* Animated gradient background */}
            <AbsoluteFill
                style={{
                    background: `linear-gradient(${frame}deg,
                        hsl(${bgHue}, 70%, 15%) 0%,
                        hsl(${bgHue + 30}, 60%, 10%) 50%,
                        hsl(${bgHue + 60}, 50%, 5%) 100%)`,
                }}
            />

            {/* Title */}
            <div
                style={{
                    position: "absolute",
                    top: 40,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                }}
            >
                <h2
                    style={{
                        fontSize: 36,
                        fontWeight: 700,
                        color: "white",
                        opacity: 0.8,
                        margin: 0,
                    }}
                >
                    Motion Blur & Trail Effects
                </h2>
            </div>

            {/* Trail effect - Moving balls with blur */}
            <Trail layers={8} lagInFrames={0.5} trailOpacity={0.6}>
                <AbsoluteFill>
                    <MovingBall
                        color="#ef4444"
                        size={60}
                        xRange={[100, 800]}
                        yRange={[150, 350]}
                    />
                </AbsoluteFill>
            </Trail>

            <Trail layers={6} lagInFrames={0.4} trailOpacity={0.5}>
                <AbsoluteFill>
                    <MovingBall
                        color="#22c55e"
                        size={50}
                        xRange={[800, 200]}
                        yRange={[300, 200]}
                        delay={fps * 0.3}
                    />
                </AbsoluteFill>
            </Trail>

            <Trail layers={10} lagInFrames={0.6} trailOpacity={0.7}>
                <AbsoluteFill>
                    <MovingBall
                        color="#3b82f6"
                        size={70}
                        xRange={[400, 600]}
                        yRange={[400, 150]}
                        delay={fps * 0.5}
                    />
                </AbsoluteFill>
            </Trail>

            {/* Trail effect - Rotating object */}
            <Trail layers={5} lagInFrames={0.3} trailOpacity={0.5}>
                <AbsoluteFill>
                    <FastMovingObject color="#8b5cf6" label="BLUR" />
                </AbsoluteFill>
            </Trail>

            {/* Trail effect - Bouncing text */}
            <Trail layers={4} lagInFrames={0.25} trailOpacity={0.4}>
                <AbsoluteFill>
                    <BouncingText text="Motion Blur!" />
                </AbsoluteFill>
            </Trail>

            {/* Info text */}
            <div
                style={{
                    position: "absolute",
                    bottom: 40,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                }}
            >
                <p
                    style={{
                        fontSize: 20,
                        color: "white",
                        opacity: 0.6,
                        margin: 0,
                    }}
                >
                    Trail layers: 4-10 | Lag: 0.25-0.6 frames
                </p>
            </div>

            {/* Corner particles with trail */}
            {[0, 1, 2, 3].map((i) => {
                const angle = (frame * 2 + i * 90) * (Math.PI / 180);
                const radius = 150 + Math.sin(frame * 0.05) * 30;
                const centerX = isVertical ? 540 : 960;
                const centerY = isVertical ? 960 : 540;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                return (
                    <Trail key={i} layers={6} lagInFrames={0.4} trailOpacity={0.6}>
                        <AbsoluteFill>
                            <div
                                style={{
                                    position: "absolute",
                                    left: x - 15,
                                    top: y - 15,
                                    width: 30,
                                    height: 30,
                                    borderRadius: "50%",
                                    background: `hsl(${i * 90 + frame}, 80%, 60%)`,
                                    boxShadow: `0 0 20px hsl(${i * 90 + frame}, 80%, 60%)`,
                                }}
                            />
                        </AbsoluteFill>
                    </Trail>
                );
            })}
        </AbsoluteFill>
    );
};
