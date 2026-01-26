import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";

export interface QuizChoice {
    text: string;
    icon?: string; // emoji or icon
}

interface QuizSceneProps {
    question: string;
    choices: QuizChoice[];
    aspectRatio?: "16:9" | "9:16";
    theme?: "problem" | "benefit" | "compare" | "quiz";
    highlightIndex?: number; // Which choice to highlight at the end
}

// Theme configurations
const THEMES = {
    problem: {
        gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        questionBg: "rgba(239, 68, 68, 0.15)",
        questionBorder: "rgba(239, 68, 68, 0.6)",
        choiceBg: "rgba(30, 41, 59, 0.9)",
        choiceHover: "rgba(239, 68, 68, 0.2)",
        accent: "#ef4444",
        questionIcon: "😰",
    },
    benefit: {
        gradient: "linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #14532d 100%)",
        questionBg: "rgba(34, 197, 94, 0.15)",
        questionBorder: "rgba(34, 197, 94, 0.6)",
        choiceBg: "rgba(30, 41, 59, 0.9)",
        choiceHover: "rgba(34, 197, 94, 0.2)",
        accent: "#22c55e",
        questionIcon: "✨",
    },
    compare: {
        gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
        questionBg: "rgba(139, 92, 246, 0.15)",
        questionBorder: "rgba(139, 92, 246, 0.6)",
        choiceBg: "rgba(30, 41, 59, 0.9)",
        choiceHover: "rgba(139, 92, 246, 0.2)",
        accent: "#8b5cf6",
        questionIcon: "🤔",
    },
    quiz: {
        gradient: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)",
        questionBg: "rgba(56, 189, 248, 0.15)",
        questionBorder: "rgba(56, 189, 248, 0.6)",
        choiceBg: "rgba(30, 41, 59, 0.9)",
        choiceHover: "rgba(56, 189, 248, 0.2)",
        accent: "#38bdf8",
        questionIcon: "❓",
    },
};

export const QuizScene: React.FC<QuizSceneProps> = ({
    question,
    choices,
    aspectRatio = "16:9",
    theme = "problem",
    highlightIndex,
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";
    const themeConfig = THEMES[theme];

    // === TIMING ===
    const questionDelay = fps * 0.3;
    const choiceStartDelay = fps * 1.2; // Choices start appearing after 1.2s
    const choiceInterval = fps * 0.6; // 0.6s between each choice
    const highlightDelay = durationInFrames - fps * 1.5; // Highlight 1.5s before end

    // === BACKGROUND ANIMATION ===
    const bgRotation = interpolate(frame, [0, durationInFrames], [0, 15]);
    const bgScale = interpolate(Math.sin(frame * 0.02), [-1, 1], [1, 1.05]);

    // === FLOATING PARTICLES ===
    const particles = Array.from({ length: 20 }, (_, i) => {
        const seed = i * 789.123;
        const startX = ((Math.sin(seed) + 1) / 2) * 100;
        const startY = ((Math.cos(seed) + 1) / 2) * 100;
        const speed = 0.2 + ((Math.sin(seed * 2) + 1) / 2) * 0.4;
        const size = 3 + ((Math.cos(seed * 3) + 1) / 2) * 6;

        const y = (startY + frame * speed * 0.2) % 110 - 5;
        const x = startX + Math.sin(frame * 0.015 + seed) * 10;
        const opacity = interpolate(frame, [0, fps * 0.5], [0, 0.4], { extrapolateRight: "clamp" });

        return { x, y, size, opacity, key: i };
    });

    // === QUESTION ANIMATION ===
    const questionProgress = spring({
        frame: Math.max(0, frame - questionDelay),
        fps,
        config: { damping: 12, stiffness: 100 },
    });
    const questionScale = interpolate(questionProgress, [0, 0.5, 1], [0.8, 1.1, 1]);
    const questionOpacity = interpolate(questionProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
    const questionY = interpolate(questionProgress, [0, 1], [30, 0]);

    // Shaking effect for problem theme
    const shakeX = theme === "problem" && frame > questionDelay + fps * 0.5
        ? Math.sin(frame * 0.5) * 2 * interpolate(frame, [questionDelay + fps * 0.5, questionDelay + fps * 1.5], [1, 0], { extrapolateRight: "clamp" })
        : 0;

    // === CHOICE ANIMATIONS ===
    const getChoiceStyle = (index: number) => {
        const choiceDelay = choiceStartDelay + index * choiceInterval;
        const localFrame = Math.max(0, frame - choiceDelay);

        // Spring entrance
        const choiceProgress = spring({
            frame: localFrame,
            fps,
            config: { damping: 10, stiffness: 150, mass: 0.8 },
        });

        // Scale with overshoot
        const scale = interpolate(choiceProgress, [0, 0.5, 1], [0, 1.15, 1]);

        // Slide from side (alternating directions)
        const slideDirection = index % 2 === 0 ? -1 : 1;
        const slideX = interpolate(choiceProgress, [0, 1], [80 * slideDirection, 0]);

        // Opacity
        const opacity = interpolate(choiceProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

        // Rotation
        const rotation = interpolate(choiceProgress, [0, 0.5, 1], [slideDirection * 10, slideDirection * -3, 0]);

        // Highlight effect (at the end)
        const isHighlighted = highlightIndex === index && frame > highlightDelay;
        const highlightPulse = isHighlighted
            ? 1 + Math.sin((frame - highlightDelay) * 0.3) * 0.08
            : 1;

        // Glow intensity for highlighted
        const glowIntensity = isHighlighted
            ? interpolate(frame, [highlightDelay, highlightDelay + fps * 0.3], [0, 1], { extrapolateRight: "clamp" })
            : 0;

        return {
            opacity,
            transform: `translateX(${slideX}px) scale(${scale * highlightPulse}) rotate(${rotation}deg)`,
            background: isHighlighted
                ? `linear-gradient(135deg, ${themeConfig.accent}40, ${themeConfig.accent}20)`
                : themeConfig.choiceBg,
            border: isHighlighted
                ? `3px solid ${themeConfig.accent}`
                : `2px solid ${themeConfig.accent}40`,
            boxShadow: isHighlighted
                ? `0 0 30px ${themeConfig.accent}60, 0 0 60px ${themeConfig.accent}30, 0 10px 40px rgba(0,0,0,0.3)`
                : `0 8px 32px rgba(0,0,0,0.3)`,
            glowIntensity,
        };
    };

    // === FADE OUT ===
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
                    background: themeConfig.gradient,
                    transform: `rotate(${bgRotation}deg) scale(${bgScale})`,
                }}
            />

            {/* Radial overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at 50% 30%, ${themeConfig.accent}15 0%, transparent 60%)`,
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
                        backgroundColor: themeConfig.accent,
                        opacity: p.opacity,
                        boxShadow: `0 0 ${p.size * 2}px ${themeConfig.accent}`,
                    }}
                />
            ))}

            {/* Main content container */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: isVertical ? "40px 24px" : "40px 80px",
                    gap: isVertical ? 30 : 40,
                }}
            >
                {/* Question box */}
                <div
                    style={{
                        opacity: questionOpacity,
                        transform: `translateY(${questionY}px) translateX(${shakeX}px) scale(${questionScale})`,
                        background: themeConfig.questionBg,
                        border: `3px solid ${themeConfig.questionBorder}`,
                        borderRadius: 20,
                        padding: isVertical ? "24px 28px" : "32px 48px",
                        backdropFilter: "blur(12px)",
                        boxShadow: `0 0 40px ${themeConfig.accent}30, 0 20px 60px rgba(0,0,0,0.3)`,
                        maxWidth: isVertical ? "95%" : "80%",
                    }}
                >
                    <p
                        style={{
                            fontSize: isVertical ? "2rem" : "3rem",
                            fontWeight: 800,
                            color: "white",
                            margin: 0,
                            textAlign: "center",
                            lineHeight: 1.4,
                            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        }}
                    >
                        <span style={{ marginRight: 12 }}>{themeConfig.questionIcon}</span>
                        {question}
                    </p>
                </div>

                {/* Choices container */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: isVertical ? 16 : 20,
                        width: "100%",
                        maxWidth: isVertical ? "100%" : "70%",
                    }}
                >
                    {choices.map((choice, index) => {
                        const style = getChoiceStyle(index);
                        const isHighlighted = highlightIndex === index && frame > highlightDelay;

                        return (
                            <div
                                key={index}
                                style={{
                                    opacity: style.opacity,
                                    transform: style.transform,
                                    background: style.background,
                                    border: style.border,
                                    boxShadow: style.boxShadow,
                                    borderRadius: 16,
                                    padding: isVertical ? "18px 24px" : "22px 36px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Glow effect layer */}
                                {isHighlighted && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: `radial-gradient(circle at 50% 50%, ${themeConfig.accent}40 0%, transparent 70%)`,
                                            opacity: style.glowIntensity,
                                        }}
                                    />
                                )}

                                {/* Number badge */}
                                <div
                                    style={{
                                        width: isVertical ? 40 : 48,
                                        height: isVertical ? 40 : 48,
                                        borderRadius: "50%",
                                        background: isHighlighted
                                            ? themeConfig.accent
                                            : `${themeConfig.accent}30`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 900,
                                        fontSize: isVertical ? "1.3rem" : "1.5rem",
                                        color: isHighlighted ? "white" : themeConfig.accent,
                                        flexShrink: 0,
                                        border: `2px solid ${themeConfig.accent}`,
                                        position: "relative",
                                        zIndex: 1,
                                    }}
                                >
                                    {choice.icon || String.fromCharCode(65 + index)}
                                </div>

                                {/* Choice text */}
                                <p
                                    style={{
                                        fontSize: isVertical ? "1.4rem" : "1.8rem",
                                        fontWeight: 700,
                                        color: "white",
                                        margin: 0,
                                        lineHeight: 1.3,
                                        position: "relative",
                                        zIndex: 1,
                                        textShadow: isHighlighted
                                            ? `0 0 20px ${themeConfig.accent}`
                                            : "0 2px 10px rgba(0,0,0,0.3)",
                                    }}
                                >
                                    {choice.text}
                                </p>

                                {/* Checkmark for highlighted */}
                                {isHighlighted && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            right: isVertical ? 16 : 24,
                                            fontSize: isVertical ? "2rem" : "2.5rem",
                                            opacity: style.glowIntensity,
                                        }}
                                    >
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Corner decorations */}
            <div
                style={{
                    position: "absolute",
                    top: 24,
                    left: 24,
                    width: 60,
                    height: 60,
                    borderTop: `4px solid ${themeConfig.accent}60`,
                    borderLeft: `4px solid ${themeConfig.accent}60`,
                    opacity: interpolate(frame, [fps * 0.5, fps * 0.8], [0, 0.8], { extrapolateRight: "clamp" }),
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: 24,
                    right: 24,
                    width: 60,
                    height: 60,
                    borderBottom: `4px solid ${themeConfig.accent}60`,
                    borderRight: `4px solid ${themeConfig.accent}60`,
                    opacity: interpolate(frame, [fps * 0.5, fps * 0.8], [0, 0.8], { extrapolateRight: "clamp" }),
                }}
            />
        </AbsoluteFill>
    );
};
