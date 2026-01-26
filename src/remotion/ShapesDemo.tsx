/**
 * ShapesDemo - @remotion/shapes のアニメーション図形デモ
 *
 * 使用機能:
 * - makeCircle, makeRect, makeTriangle, makeStar, makePie
 * - 図形の生成とアニメーション
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
    makeCircle,
    makeRect,
    makeTriangle,
    makeStar,
    makePie,
    makePolygon,
} from "@remotion/shapes";

interface ShapesDemoProps {
    aspectRatio?: "16:9" | "9:16";
}

export const ShapesDemo: React.FC<ShapesDemoProps> = ({
    aspectRatio = "16:9",
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // Animation progress values
    const circleProgress = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    const rectProgress = spring({
        frame: Math.max(0, frame - fps * 0.2),
        fps,
        config: { damping: 10, stiffness: 120 },
    });

    const triangleProgress = spring({
        frame: Math.max(0, frame - fps * 0.4),
        fps,
        config: { damping: 8, stiffness: 150 },
    });

    const starProgress = spring({
        frame: Math.max(0, frame - fps * 0.6),
        fps,
        config: { damping: 10, stiffness: 100 },
    });

    const pieProgress = spring({
        frame: Math.max(0, frame - fps * 0.8),
        fps,
        config: { damping: 12, stiffness: 80 },
    });

    const hexagonProgress = spring({
        frame: Math.max(0, frame - fps * 1.0),
        fps,
        config: { damping: 10, stiffness: 100 },
    });

    // Generate shapes
    const circle = makeCircle({ radius: 50 });
    const rect = makeRect({ width: 100, height: 80, cornerRadius: 10 });
    const triangle = makeTriangle({ length: 100, direction: "up" });
    const star = makeStar({ points: 5, innerRadius: 30, outerRadius: 60 });
    const pie = makePie({
        radius: 50,
        progress: interpolate(frame, [fps, fps * 3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        }),
    });
    const hexagon = makePolygon({ points: 6, radius: 50 });

    // Rotating and pulsing animations
    const rotation = frame * 2;
    const pulse = 1 + Math.sin(frame * 0.1) * 0.1;

    // Background
    const bgHue = interpolate(frame, [0, durationInFrames], [180, 240]);

    // Fade
    const opacity = interpolate(
        frame,
        [0, fps * 0.3, durationInFrames - fps * 0.3, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Shape configurations
    const shapes = [
        {
            name: "Circle",
            path: circle.path,
            color: "#ef4444",
            progress: circleProgress,
            x: isVertical ? 270 : 200,
            y: isVertical ? 400 : 250,
            rotation: rotation,
            scale: pulse,
        },
        {
            name: "Rectangle",
            path: rect.path,
            color: "#f59e0b",
            progress: rectProgress,
            x: isVertical ? 540 : 450,
            y: isVertical ? 400 : 250,
            rotation: -rotation * 0.5,
            scale: pulse * 1.1,
        },
        {
            name: "Triangle",
            path: triangle.path,
            color: "#22c55e",
            progress: triangleProgress,
            x: isVertical ? 810 : 700,
            y: isVertical ? 400 : 250,
            rotation: rotation * 0.7,
            scale: pulse * 0.9,
        },
        {
            name: "Star",
            path: star.path,
            color: "#3b82f6",
            progress: starProgress,
            x: isVertical ? 270 : 950,
            y: isVertical ? 700 : 250,
            rotation: rotation * 1.2,
            scale: pulse * 1.05,
        },
        {
            name: "Pie",
            path: pie.path,
            color: "#8b5cf6",
            progress: pieProgress,
            x: isVertical ? 540 : 1200,
            y: isVertical ? 700 : 250,
            rotation: 0,
            scale: 1,
        },
        {
            name: "Hexagon",
            path: hexagon.path,
            color: "#ec4899",
            progress: hexagonProgress,
            x: isVertical ? 810 : 1450,
            y: isVertical ? 700 : 250,
            rotation: rotation * 0.3,
            scale: pulse,
        },
    ];

    return (
        <AbsoluteFill style={{ opacity }}>
            {/* Background */}
            <AbsoluteFill
                style={{
                    background: `linear-gradient(135deg,
                        hsl(${bgHue}, 40%, 8%) 0%,
                        hsl(${bgHue + 30}, 50%, 12%) 50%,
                        hsl(${bgHue + 60}, 40%, 8%) 100%)`,
                }}
            />

            {/* Floating particles */}
            {Array.from({ length: 30 }, (_, i) => {
                const seed = i * 123;
                const x = ((Math.sin(seed) + 1) / 2) * 100;
                const y = ((Math.cos(seed) + 1) / 2) * 100;
                const size = 2 + (i % 4);
                const speed = 0.1 + (i % 5) * 0.05;
                const yPos = (y + frame * speed) % 110 - 5;

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${x}%`,
                            top: `${yPos}%`,
                            width: size,
                            height: size,
                            borderRadius: "50%",
                            background: "white",
                            opacity: 0.2,
                        }}
                    />
                );
            })}

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
                        fontSize: 42,
                        fontWeight: 900,
                        color: "white",
                        margin: 0,
                        textShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    }}
                >
                    @remotion/shapes Demo
                </h2>
                <p
                    style={{
                        fontSize: 20,
                        color: "white",
                        opacity: 0.7,
                        margin: "10px 0 0",
                    }}
                >
                    Animated SVG Shapes
                </p>
            </div>

            {/* Render all shapes */}
            {shapes.map((shape, index) => {
                const scale = interpolate(shape.progress, [0, 0.5, 1], [0, 1.3, 1]);
                const shapeOpacity = interpolate(shape.progress, [0, 0.3], [0, 1], {
                    extrapolateRight: "clamp",
                });
                const y = interpolate(shape.progress, [0, 1], [50, 0]);

                return (
                    <div
                        key={shape.name}
                        style={{
                            position: "absolute",
                            left: shape.x,
                            top: shape.y + y,
                            transform: `translate(-50%, -50%) scale(${scale * shape.scale}) rotate(${shape.rotation}deg)`,
                            opacity: shapeOpacity,
                        }}
                    >
                        <svg
                            width={150}
                            height={150}
                            viewBox="-75 -75 150 150"
                            style={{
                                filter: `drop-shadow(0 0 20px ${shape.color}80)`,
                            }}
                        >
                            <path
                                d={shape.path}
                                fill={`${shape.color}40`}
                                stroke={shape.color}
                                strokeWidth={3}
                            />
                        </svg>
                        <div
                            style={{
                                textAlign: "center",
                                marginTop: 10,
                                color: shape.color,
                                fontWeight: 700,
                                fontSize: 16,
                                textShadow: `0 0 10px ${shape.color}`,
                            }}
                        >
                            {shape.name}
                        </div>
                    </div>
                );
            })}

            {/* Orbiting shapes at bottom */}
            <div
                style={{
                    position: "absolute",
                    bottom: isVertical ? 200 : 120,
                    left: "50%",
                    transform: "translateX(-50%)",
                }}
            >
                {[0, 1, 2, 3, 4, 5].map((i) => {
                    const angle = (frame * 1.5 + i * 60) * (Math.PI / 180);
                    const radius = 120;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius * 0.4; // Elliptical orbit
                    const orbScale = interpolate(Math.sin(angle), [-1, 1], [0.6, 1]);
                    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

                    return (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                left: x,
                                top: y,
                                transform: `translate(-50%, -50%) scale(${orbScale})`,
                                zIndex: Math.sin(angle) > 0 ? 1 : 0,
                            }}
                        >
                            <svg width={30} height={30} viewBox="-15 -15 30 30">
                                <path
                                    d={makeCircle({ radius: 12 }).path}
                                    fill={colors[i]}
                                    style={{
                                        filter: `drop-shadow(0 0 10px ${colors[i]})`,
                                    }}
                                />
                            </svg>
                        </div>
                    );
                })}
            </div>

            {/* Info */}
            <div
                style={{
                    position: "absolute",
                    bottom: 30,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                }}
            >
                <p
                    style={{
                        fontSize: 16,
                        color: "white",
                        opacity: 0.5,
                        margin: 0,
                    }}
                >
                    makeCircle • makeRect • makeTriangle • makeStar • makePie • makePolygon
                </p>
            </div>
        </AbsoluteFill>
    );
};
