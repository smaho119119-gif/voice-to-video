import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface TextOnlySceneProps {
    subtitle: string;
    emotion?: "neutral" | "happy" | "serious" | "excited" | "thoughtful";
    aspectRatio?: "16:9" | "9:16";
    sceneIndex: number;
}

// Background color themes based on emotion
const EMOTION_THEMES = {
    neutral: {
        gradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e3a5f 100%)",
        accent: "rgba(147, 197, 253, 0.8)",
        textColor: "white",
    },
    happy: {
        gradient: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)",
        accent: "rgba(251, 191, 36, 1)",
        textColor: "#1e293b",
    },
    serious: {
        gradient: "linear-gradient(135deg, #1e293b 0%, #312e81 50%, #1e1b4b 100%)",
        accent: "rgba(99, 102, 241, 0.8)",
        textColor: "white",
    },
    excited: {
        gradient: "linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)",
        accent: "rgba(244, 114, 182, 1)",
        textColor: "white",
    },
    thoughtful: {
        gradient: "linear-gradient(135deg, #0f172a 0%, #4c1d95 50%, #7c3aed 100%)",
        accent: "rgba(139, 92, 246, 0.8)",
        textColor: "white",
    },
};

export const TextOnlyScene: React.FC<TextOnlySceneProps> = ({
    subtitle,
    emotion = "neutral",
    aspectRatio = "16:9",
    sceneIndex,
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";
    const theme = EMOTION_THEMES[emotion];

    // Split text into words for animation
    const words = subtitle.split(/(\s+)/).filter(w => w.trim());

    // Animated gradient background
    const gradientRotation = interpolate(frame, [0, durationInFrames], [0, 30]);

    // Breathing effect for background
    const breathingScale = interpolate(
        Math.sin(frame * 0.03),
        [-1, 1],
        [1, 1.05]
    );

    // Floating particles
    const particles = Array.from({ length: 15 }, (_, i) => {
        const seed = (i + sceneIndex * 100) * 123.456;
        const startX = ((Math.sin(seed) + 1) / 2) * 100;
        const startY = ((Math.cos(seed) + 1) / 2) * 100;
        const speed = 0.3 + ((Math.sin(seed * 2) + 1) / 2) * 0.5;
        const size = 4 + ((Math.cos(seed * 3) + 1) / 2) * 8;

        const y = (startY + (frame * speed * 0.3)) % 120 - 10;
        const x = startX + Math.sin(frame * 0.02 + seed) * 8;
        const opacity = interpolate(frame, [0, fps * 0.3], [0, 0.4], {
            extrapolateRight: "clamp",
        });

        return { x, y, size, opacity, key: i };
    });

    // Word animation with staggered entrance
    const getWordStyle = (wordIndex: number) => {
        const wordDelay = wordIndex * 3; // 3 frames per word
        const totalWords = words.length;

        // Scale animation
        const wordScale = spring({
            frame: Math.max(0, frame - wordDelay),
            fps,
            config: { damping: 12, stiffness: 200 },
        });

        // Opacity animation
        const wordOpacity = interpolate(
            frame,
            [wordDelay, wordDelay + 8],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        // Y position animation
        const wordY = interpolate(
            frame,
            [wordDelay, wordDelay + 10],
            [20, 0],
            {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: (t) => 1 - Math.pow(1 - t, 3),
            }
        );

        // Subtle pulse on important words (every 3rd word)
        const isPulseWord = wordIndex % 4 === 0 && wordIndex > 0;
        const pulseScale = isPulseWord
            ? interpolate(Math.sin((frame - wordDelay) * 0.1), [-1, 1], [1, 1.05])
            : 1;

        return {
            display: "inline-block",
            transform: `scale(${wordScale * pulseScale}) translateY(${wordY}px)`,
            opacity: wordOpacity,
            marginRight: "0.3em",
            textShadow: isPulseWord
                ? `0 0 20px ${theme.accent}, 0 0 40px ${theme.accent}`
                : `0 2px 10px rgba(0, 0, 0, 0.5)`,
        };
    };

    // Fade out at end
    const fadeOut = interpolate(
        frame,
        [durationInFrames - fps * 0.3, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <AbsoluteFill style={{ opacity: fadeOut }}>
            {/* Animated gradient background */}
            <div
                style={{
                    position: "absolute",
                    inset: "-20%",
                    background: theme.gradient,
                    transform: `rotate(${gradientRotation}deg) scale(${breathingScale})`,
                }}
            />

            {/* Secondary radial gradient */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at 50% 50%, ${theme.accent.replace("0.8", "0.15")} 0%, transparent 60%)`,
                }}
            />

            {/* Floating particles */}
            {particles.map((p) => (
                <div
                    key={p.key}
                    style={{
                        position: "absolute",
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        borderRadius: "50%",
                        backgroundColor: theme.accent,
                        opacity: p.opacity,
                        boxShadow: `0 0 ${p.size * 2}px ${theme.accent}`,
                    }}
                />
            ))}

            {/* Animated lines decoration */}
            <div
                style={{
                    position: "absolute",
                    top: "10%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: interpolate(frame, [fps * 0.2, fps * 0.6], [0, isVertical ? 200 : 400], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    }),
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                    opacity: 0.6,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "10%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: interpolate(frame, [fps * 0.2, fps * 0.6], [0, isVertical ? 200 : 400], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    }),
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                    opacity: 0.6,
                }}
            />

            {/* Main text container */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: isVertical ? "60px 40px" : "60px 100px",
                }}
            >
                <p
                    style={{
                        fontSize: isVertical ? "2.5rem" : "3.5rem",
                        fontWeight: 700,
                        color: theme.textColor,
                        textAlign: "center",
                        lineHeight: 1.4,
                        maxWidth: isVertical ? "90%" : "80%",
                    }}
                >
                    {words.map((word, i) => (
                        <span key={i} style={getWordStyle(i)}>
                            {word}
                        </span>
                    ))}
                </p>
            </div>

            {/* Corner decorations */}
            <div
                style={{
                    position: "absolute",
                    top: 30,
                    left: 30,
                    width: 50,
                    height: 50,
                    borderTop: `3px solid ${theme.accent}`,
                    borderLeft: `3px solid ${theme.accent}`,
                    opacity: interpolate(frame, [fps * 0.3, fps * 0.5], [0, 0.6], {
                        extrapolateRight: "clamp",
                    }),
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: 30,
                    right: 30,
                    width: 50,
                    height: 50,
                    borderBottom: `3px solid ${theme.accent}`,
                    borderRight: `3px solid ${theme.accent}`,
                    opacity: interpolate(frame, [fps * 0.3, fps * 0.5], [0, 0.6], {
                        extrapolateRight: "clamp",
                    }),
                }}
            />
        </AbsoluteFill>
    );
};
