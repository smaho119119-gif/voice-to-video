/**
 * AllEffectsDemo - Remotionの全アニメーション機能をデモ
 *
 * 使用機能:
 * - spring() - 物理ベースアニメーション (bouncy, smooth, snappy)
 * - Easing - ease, elastic, bounce, back, bezier
 * - interpolate() - 値の補間
 * - interpolateColors() - 色の補間
 * - noise - ノイズベースの動き
 * - CSS transforms - scale, rotate, translate, skew
 */

import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    interpolateColors,
    spring,
    Easing,
    Sequence,
} from "remotion";
import { noise2D } from "@remotion/noise";

interface AllEffectsDemoProps {
    aspectRatio?: "16:9" | "9:16";
}

export const AllEffectsDemo: React.FC<AllEffectsDemoProps> = ({
    aspectRatio = "16:9",
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // ===============================
    // 1. SPRING ANIMATIONS (物理ベース)
    // ===============================

    // Bouncy Spring (弾むような動き)
    const bouncySpring = spring({
        frame,
        fps,
        config: { damping: 5, stiffness: 100, mass: 0.8 },
    });

    // Smooth Spring (滑らかな動き)
    const smoothSpring = spring({
        frame,
        fps,
        config: { damping: 20, stiffness: 50 },
    });

    // Snappy Spring (キビキビした動き)
    const snappySpring = spring({
        frame: Math.max(0, frame - fps * 0.5),
        fps,
        config: { damping: 12, stiffness: 200, mass: 0.5 },
    });

    // ===============================
    // 2. EASING FUNCTIONS
    // ===============================

    // Linear (直線的)
    const linear = interpolate(frame, [0, fps * 2], [0, 1], {
        extrapolateRight: "clamp",
    });

    // Ease (基本的なイージング)
    const easeValue = interpolate(frame, [0, fps * 2], [0, 1], {
        easing: Easing.ease,
        extrapolateRight: "clamp",
    });

    // Elastic (弾性のある動き)
    const elasticValue = interpolate(frame, [fps * 0.5, fps * 2], [0, 1], {
        easing: Easing.elastic(2),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Bounce (バウンス)
    const bounceValue = interpolate(frame, [fps, fps * 2.5], [0, 1], {
        easing: Easing.bounce,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Back (少し戻ってから進む)
    const backValue = interpolate(frame, [fps * 0.3, fps * 1.5], [0, 1], {
        easing: Easing.back(2),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Bezier (カスタムカーブ)
    const bezierValue = interpolate(frame, [0, fps * 2], [0, 1], {
        easing: Easing.bezier(0.68, -0.6, 0.32, 1.6),
        extrapolateRight: "clamp",
    });

    // ===============================
    // 3. INTERPOLATE COLORS (色補間)
    // ===============================

    // 背景グラデーション色の変化
    const bgColor1 = interpolateColors(
        frame,
        [0, fps, fps * 2, fps * 3],
        ["#1a1a2e", "#16213e", "#0f3460", "#1a1a2e"]
    );

    const bgColor2 = interpolateColors(
        frame,
        [0, fps, fps * 2, fps * 3],
        ["#e94560", "#0f3460", "#533483", "#e94560"]
    );

    // テキスト色の変化
    const textColor = interpolateColors(
        frame,
        [0, fps * 0.5, fps, fps * 1.5, fps * 2],
        ["#ffffff", "#fef08a", "#22c55e", "#38bdf8", "#ffffff"]
    );

    // アクセント色の脈動
    const accentColor = interpolateColors(
        Math.sin(frame * 0.1) * 0.5 + 0.5,
        [0, 0.5, 1],
        ["#ef4444", "#8b5cf6", "#ef4444"]
    );

    // ===============================
    // 4. NOISE (ノイズベースの動き)
    // ===============================

    // 有機的な動きを生成
    const noiseX = noise2D("seedX", frame * 0.02, 0) * 30;
    const noiseY = noise2D("seedY", 0, frame * 0.02) * 20;
    const noiseRotation = noise2D("seedR", frame * 0.015, frame * 0.01) * 10;
    const noiseScale = 1 + noise2D("seedS", frame * 0.01, 0) * 0.1;

    // ===============================
    // 5. MULTI-POINT INTERPOLATION
    // ===============================

    // 複数キーフレーム補間
    const multiPointValue = interpolate(
        frame,
        [0, fps * 0.5, fps, fps * 1.5, fps * 2, fps * 2.5],
        [0, 1.2, 0.8, 1.1, 0.95, 1],
        { extrapolateRight: "clamp" }
    );

    // 複雑なパス補間
    const pathX = interpolate(
        frame,
        [0, fps, fps * 2, fps * 3],
        [0, 100, -50, 0],
        { extrapolateRight: "clamp" }
    );
    const pathY = interpolate(
        frame,
        [0, fps, fps * 2, fps * 3],
        [0, -80, 60, 0],
        { extrapolateRight: "clamp" }
    );

    // ===============================
    // 6. STAGGERED ANIMATIONS
    // ===============================

    const items = ["Spring", "Ease", "Elastic", "Bounce", "Bezier"];
    const getStaggeredStyle = (index: number) => {
        const delay = index * fps * 0.15;
        const localFrame = Math.max(0, frame - delay);

        const staggerSpring = spring({
            frame: localFrame,
            fps,
            config: { damping: 10, stiffness: 150 },
        });

        const scale = interpolate(staggerSpring, [0, 0.5, 1], [0, 1.2, 1]);
        const opacity = interpolate(staggerSpring, [0, 0.3], [0, 1], {
            extrapolateRight: "clamp",
        });
        const y = interpolate(staggerSpring, [0, 1], [50, 0]);
        const rotation = interpolate(staggerSpring, [0, 0.5, 1], [-20, 5, 0]);

        return { scale, opacity, y, rotation };
    };

    // ===============================
    // 7. COMBINED TRANSFORMS
    // ===============================

    // 複合変形
    const complexTransform = `
        translateX(${pathX}px)
        translateY(${pathY}px)
        scale(${multiPointValue})
        rotate(${noiseRotation}deg)
        skewX(${Math.sin(frame * 0.05) * 5}deg)
    `;

    // ===============================
    // 8. FADE IN/OUT
    // ===============================

    const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
        extrapolateRight: "clamp",
    });
    const fadeOut = interpolate(
        frame,
        [durationInFrames - fps * 0.5, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const globalOpacity = Math.min(fadeIn, fadeOut);

    // ===============================
    // RENDER
    // ===============================

    return (
        <AbsoluteFill style={{ opacity: globalOpacity }}>
            {/* 動的グラデーション背景 */}
            <div
                style={{
                    position: "absolute",
                    inset: "-20%",
                    background: `linear-gradient(${frame * 0.5}deg, ${bgColor1}, ${bgColor2})`,
                    transform: `scale(${noiseScale})`,
                }}
            />

            {/* ノイズベースのパーティクル */}
            {Array.from({ length: 20 }, (_, i) => {
                const seed = i * 123;
                const x = noise2D(`x${i}`, frame * 0.01, seed) * 50 + 50;
                const y = noise2D(`y${i}`, seed, frame * 0.01) * 50 + 50;
                const size = 4 + noise2D(`s${i}`, frame * 0.02, 0) * 8;
                const particleOpacity = interpolate(frame, [0, fps], [0, 0.6], {
                    extrapolateRight: "clamp",
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${x}%`,
                            top: `${y}%`,
                            width: size,
                            height: size,
                            borderRadius: "50%",
                            background: accentColor,
                            opacity: particleOpacity,
                            boxShadow: `0 0 ${size * 2}px ${accentColor}`,
                        }}
                    />
                );
            })}

            {/* メインコンテンツ */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: isVertical ? 20 : 30,
                    padding: isVertical ? 30 : 60,
                }}
            >
                {/* タイトル - 複合変形デモ */}
                <div
                    style={{
                        transform: complexTransform,
                        padding: "20px 40px",
                        background: "rgba(0,0,0,0.5)",
                        borderRadius: 16,
                        border: `3px solid ${accentColor}`,
                        boxShadow: `0 0 30px ${accentColor}50`,
                    }}
                >
                    <h1
                        style={{
                            fontSize: isVertical ? "2rem" : "3rem",
                            fontWeight: 900,
                            color: textColor,
                            margin: 0,
                            textShadow: `0 0 20px ${textColor}`,
                        }}
                    >
                        Remotion Effects Demo
                    </h1>
                </div>

                {/* Spring比較 */}
                <div
                    style={{
                        display: "flex",
                        gap: isVertical ? 15 : 30,
                        flexWrap: "wrap",
                        justifyContent: "center",
                    }}
                >
                    {/* Bouncy Spring */}
                    <div
                        style={{
                            transform: `scale(${0.5 + bouncySpring * 0.5}) translateY(${(1 - bouncySpring) * 50}px)`,
                            padding: "16px 24px",
                            background: "rgba(239, 68, 68, 0.3)",
                            border: "2px solid #ef4444",
                            borderRadius: 12,
                        }}
                    >
                        <span style={{ color: "white", fontWeight: 700, fontSize: isVertical ? "1rem" : "1.2rem" }}>
                            Bouncy 🎾
                        </span>
                    </div>

                    {/* Smooth Spring */}
                    <div
                        style={{
                            transform: `scale(${0.5 + smoothSpring * 0.5}) translateY(${(1 - smoothSpring) * 50}px)`,
                            padding: "16px 24px",
                            background: "rgba(34, 197, 94, 0.3)",
                            border: "2px solid #22c55e",
                            borderRadius: 12,
                        }}
                    >
                        <span style={{ color: "white", fontWeight: 700, fontSize: isVertical ? "1rem" : "1.2rem" }}>
                            Smooth 🌊
                        </span>
                    </div>

                    {/* Snappy Spring */}
                    <div
                        style={{
                            transform: `scale(${0.5 + snappySpring * 0.5}) translateY(${(1 - snappySpring) * 50}px)`,
                            padding: "16px 24px",
                            background: "rgba(59, 130, 246, 0.3)",
                            border: "2px solid #3b82f6",
                            borderRadius: 12,
                        }}
                    >
                        <span style={{ color: "white", fontWeight: 700, fontSize: isVertical ? "1rem" : "1.2rem" }}>
                            Snappy ⚡
                        </span>
                    </div>
                </div>

                {/* Staggered Items (段階的アニメーション) */}
                <div
                    style={{
                        display: "flex",
                        gap: isVertical ? 10 : 20,
                        flexWrap: "wrap",
                        justifyContent: "center",
                    }}
                >
                    {items.map((item, index) => {
                        const style = getStaggeredStyle(index);
                        const itemColors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"];

                        return (
                            <div
                                key={item}
                                style={{
                                    opacity: style.opacity,
                                    transform: `scale(${style.scale}) translateY(${style.y}px) rotate(${style.rotation}deg)`,
                                    padding: isVertical ? "12px 18px" : "14px 24px",
                                    background: `${itemColors[index]}30`,
                                    border: `2px solid ${itemColors[index]}`,
                                    borderRadius: 10,
                                    boxShadow: `0 0 15px ${itemColors[index]}40`,
                                }}
                            >
                                <span style={{ color: "white", fontWeight: 700, fontSize: isVertical ? "0.9rem" : "1.1rem" }}>
                                    {item}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Easing比較バー */}
                <div
                    style={{
                        width: "80%",
                        maxWidth: 600,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    {[
                        { name: "Linear", value: linear, color: "#94a3b8" },
                        { name: "Ease", value: easeValue, color: "#22c55e" },
                        { name: "Elastic", value: elasticValue, color: "#f59e0b" },
                        { name: "Bounce", value: bounceValue, color: "#ef4444" },
                        { name: "Bezier", value: bezierValue, color: "#8b5cf6" },
                    ].map(({ name, value, color }) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span
                                style={{
                                    width: 70,
                                    color: "white",
                                    fontSize: isVertical ? "0.8rem" : "0.9rem",
                                    fontWeight: 600,
                                }}
                            >
                                {name}
                            </span>
                            <div
                                style={{
                                    flex: 1,
                                    height: 8,
                                    background: "rgba(255,255,255,0.1)",
                                    borderRadius: 4,
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: `${Math.max(0, Math.min(1, value)) * 100}%`,
                                        height: "100%",
                                        background: color,
                                        borderRadius: 4,
                                        boxShadow: `0 0 10px ${color}`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ノイズ動きデモ */}
                <div
                    style={{
                        transform: `translateX(${noiseX}px) translateY(${noiseY}px) rotate(${noiseRotation}deg)`,
                        padding: "16px 32px",
                        background: "rgba(139, 92, 246, 0.3)",
                        border: "2px solid #8b5cf6",
                        borderRadius: 16,
                        boxShadow: `0 0 20px #8b5cf680`,
                    }}
                >
                    <span style={{ color: "white", fontWeight: 700, fontSize: isVertical ? "1rem" : "1.2rem" }}>
                        🌀 Noise Movement
                    </span>
                </div>
            </div>

            {/* コーナーデコレーション */}
            {[
                { top: 20, left: 20, borderTop: true, borderLeft: true },
                { top: 20, right: 20, borderTop: true, borderRight: true },
                { bottom: 20, left: 20, borderBottom: true, borderLeft: true },
                { bottom: 20, right: 20, borderBottom: true, borderRight: true },
            ].map((pos, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        ...pos,
                        width: 40,
                        height: 40,
                        borderTop: pos.borderTop ? `3px solid ${accentColor}60` : "none",
                        borderBottom: pos.borderBottom ? `3px solid ${accentColor}60` : "none",
                        borderLeft: pos.borderLeft ? `3px solid ${accentColor}60` : "none",
                        borderRight: pos.borderRight ? `3px solid ${accentColor}60` : "none",
                        opacity: interpolate(frame, [fps * 0.3, fps * 0.6], [0, 1], {
                            extrapolateRight: "clamp",
                        }),
                    }}
                />
            ))}
        </AbsoluteFill>
    );
};
