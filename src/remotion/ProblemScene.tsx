import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface ProblemSceneProps {
    headline: string; // e.g., "こんな悩みはありませんか？"
    problems: string[]; // List of problems to show one by one
    aspectRatio?: "16:9" | "9:16";
    variant?: "shake" | "pulse" | "dramatic";
}

export const ProblemScene: React.FC<ProblemSceneProps> = ({
    headline,
    problems,
    aspectRatio = "16:9",
    variant = "dramatic",
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // === TIMING ===
    const headlineDelay = fps * 0.2;
    const problemStartDelay = fps * 1.5;
    const problemInterval = fps * 1.0; // 1 second between each problem

    // === BACKGROUND EFFECTS ===
    // Pulsing red/dark gradient
    const pulseIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.8, 1]);
    const bgGradient = `radial-gradient(circle at 50% 50%,
        rgba(127, 29, 29, ${0.3 * pulseIntensity}) 0%,
        rgba(15, 23, 42, 1) 50%,
        rgba(0, 0, 0, 1) 100%)`;

    // Breathing background scale
    const bgScale = interpolate(Math.sin(frame * 0.03), [-1, 1], [1, 1.08]);

    // Lightning flash effect (occasional)
    const flashFrame = Math.floor(frame / (fps * 2.5)) * (fps * 2.5);
    const flashProgress = frame - flashFrame;
    const flashOpacity = flashProgress < fps * 0.1
        ? interpolate(flashProgress, [0, fps * 0.05, fps * 0.1], [0, 0.3, 0])
        : 0;

    // === FLOATING EMOJIS (worried faces, question marks) ===
    const floatingEmojis = ["😰", "😟", "❓", "😣", "💭", "😔"];
    const emojiElements = Array.from({ length: 12 }, (_, i) => {
        const seed = i * 456.789;
        const emoji = floatingEmojis[i % floatingEmojis.length];
        const startX = ((Math.sin(seed) + 1) / 2) * 100;
        const startY = ((Math.cos(seed) + 1) / 2) * 120 - 10;
        const speed = 0.15 + ((Math.sin(seed * 2) + 1) / 2) * 0.3;
        const size = isVertical ? 24 : 32;

        const y = (startY + frame * speed * 0.15) % 130 - 15;
        const x = startX + Math.sin(frame * 0.012 + seed) * 15;
        const rotation = Math.sin(frame * 0.02 + seed) * 20;
        const opacity = interpolate(frame, [0, fps * 0.8], [0, 0.5], { extrapolateRight: "clamp" });

        return { emoji, x, y, size, rotation, opacity, key: i };
    });

    // === HEADLINE ANIMATION ===
    const headlineProgress = spring({
        frame: Math.max(0, frame - headlineDelay),
        fps,
        config: { damping: 10, stiffness: 80 },
    });
    const headlineScale = interpolate(headlineProgress, [0, 0.5, 1], [0.5, 1.2, 1]);
    const headlineOpacity = interpolate(headlineProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
    const headlineY = interpolate(headlineProgress, [0, 1], [-50, 0]);

    // Shake effect for dramatic variant
    const headlineShake = variant === "shake" || variant === "dramatic"
        ? Math.sin(frame * 0.6) * 3 * interpolate(frame, [headlineDelay + fps, headlineDelay + fps * 2], [1, 0], { extrapolateRight: "clamp" })
        : 0;

    // === PROBLEM ITEM ANIMATIONS ===
    const getProblemStyle = (index: number) => {
        const delay = problemStartDelay + index * problemInterval;
        const localFrame = Math.max(0, frame - delay);

        // Dramatic entrance spring
        const progress = spring({
            frame: localFrame,
            fps,
            config: { damping: 8, stiffness: 120, mass: 0.7 },
        });

        // Scale with dramatic overshoot
        const scale = interpolate(progress, [0, 0.4, 1], [0, 1.3, 1]);

        // Slide from alternating sides
        const direction = index % 2 === 0 ? -1 : 1;
        const slideX = interpolate(progress, [0, 1], [120 * direction, 0]);

        // Rotation for impact
        const rotation = interpolate(progress, [0, 0.5, 1], [direction * 15, direction * -5, 0]);

        // Opacity
        const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

        // Screen shake on impact (for dramatic variant)
        const impactShake = variant === "dramatic" && localFrame > 0 && localFrame < fps * 0.3
            ? Math.sin(localFrame * 2) * 5 * (1 - localFrame / (fps * 0.3))
            : 0;

        // Glowing pulse after appearing
        const glowPulse = localFrame > fps * 0.5
            ? Math.sin((localFrame - fps * 0.5) * 0.1) * 0.5 + 0.5
            : 0;

        return { scale, slideX, rotation, opacity, impactShake, glowPulse };
    };

    // === FADE OUT ===
    const fadeOut = interpolate(
        frame,
        [durationInFrames - fps * 0.4, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <AbsoluteFill style={{ opacity: fadeOut }}>
            {/* Dark pulsing background */}
            <div
                style={{
                    position: "absolute",
                    inset: "-15%",
                    background: bgGradient,
                    transform: `scale(${bgScale})`,
                }}
            />

            {/* Lightning flash overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "white",
                    opacity: flashOpacity,
                    pointerEvents: "none",
                }}
            />

            {/* Vignette */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)",
                }}
            />

            {/* Floating emojis */}
            {emojiElements.map((e) => (
                <div
                    key={e.key}
                    style={{
                        position: "absolute",
                        left: `${e.x}%`,
                        top: `${e.y}%`,
                        fontSize: e.size,
                        transform: `rotate(${e.rotation}deg)`,
                        opacity: e.opacity,
                        filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))",
                    }}
                >
                    {e.emoji}
                </div>
            ))}

            {/* Main content */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: isVertical ? "40px 20px" : "60px",
                    gap: isVertical ? 30 : 50,
                }}
            >
                {/* Headline */}
                <div
                    style={{
                        opacity: headlineOpacity,
                        transform: `translateY(${headlineY}px) translateX(${headlineShake}px) scale(${headlineScale})`,
                    }}
                >
                    <h1
                        style={{
                            fontSize: isVertical ? "2.2rem" : "3.5rem",
                            fontWeight: 900,
                            color: "#fecaca",
                            margin: 0,
                            textAlign: "center",
                            textShadow: `
                                0 0 20px rgba(239, 68, 68, 0.8),
                                0 0 40px rgba(239, 68, 68, 0.5),
                                0 4px 20px rgba(0, 0, 0, 0.8)
                            `,
                            letterSpacing: "0.05em",
                        }}
                    >
                        {headline}
                    </h1>
                </div>

                {/* Problems list */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: isVertical ? 16 : 24,
                        width: "100%",
                        maxWidth: isVertical ? "100%" : "75%",
                    }}
                >
                    {problems.map((problem, index) => {
                        const style = getProblemStyle(index);

                        return (
                            <div
                                key={index}
                                style={{
                                    opacity: style.opacity,
                                    transform: `translateX(${style.slideX + style.impactShake}px) scale(${style.scale}) rotate(${style.rotation}deg)`,
                                    background: `linear-gradient(135deg, rgba(127, 29, 29, 0.4) 0%, rgba(30, 41, 59, 0.95) 100%)`,
                                    border: "2px solid rgba(239, 68, 68, 0.5)",
                                    borderRadius: 16,
                                    padding: isVertical ? "18px 20px" : "24px 32px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                    boxShadow: `
                                        0 0 ${20 + style.glowPulse * 20}px rgba(239, 68, 68, ${0.3 + style.glowPulse * 0.3}),
                                        0 10px 40px rgba(0, 0, 0, 0.4)
                                    `,
                                    backdropFilter: "blur(8px)",
                                }}
                            >
                                {/* Warning icon */}
                                <div
                                    style={{
                                        width: isVertical ? 36 : 44,
                                        height: isVertical ? 36 : 44,
                                        borderRadius: "50%",
                                        background: "rgba(239, 68, 68, 0.3)",
                                        border: "2px solid rgba(239, 68, 68, 0.8)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: isVertical ? "1.3rem" : "1.6rem",
                                        flexShrink: 0,
                                    }}
                                >
                                    ✗
                                </div>

                                {/* Problem text */}
                                <p
                                    style={{
                                        fontSize: isVertical ? "1.3rem" : "1.7rem",
                                        fontWeight: 700,
                                        color: "white",
                                        margin: 0,
                                        lineHeight: 1.4,
                                        textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
                                    }}
                                >
                                    {problem}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Animated border glow */}
            <div
                style={{
                    position: "absolute",
                    inset: 8,
                    border: `3px solid rgba(239, 68, 68, ${0.2 + Math.sin(frame * 0.1) * 0.15})`,
                    borderRadius: 16,
                    pointerEvents: "none",
                    opacity: interpolate(frame, [fps * 0.5, fps], [0, 1], { extrapolateRight: "clamp" }),
                }}
            />
        </AbsoluteFill>
    );
};
