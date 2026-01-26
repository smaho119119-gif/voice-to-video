import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SkiaCanvas } from "@remotion/skia";
import {
    Circle,
    Group,
    LinearGradient,
    RoundedRect,
    Path,
    vec,
    Blur,
    ColorMatrix,
    Rect,
    Line,
    Skia,
    SweepGradient,
    TwoPointConicalGradient,
    DashPathEffect,
    DiscretePathEffect,
    CornerPathEffect,
} from "@shopify/react-native-skia";

export const SkiaDemo: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const time = frame / fps;

    // Animation values
    const rotation = interpolate(frame, [0, fps * 8], [0, Math.PI * 4]);
    const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5;

    const centerX = width / 2;
    const centerY = height / 2;

    // Color matrix for hue rotation (Skia-specific feature)
    const hueRotation = interpolate(frame, [0, fps * 4], [0, Math.PI * 2]);
    const cos = Math.cos(hueRotation);
    const sin = Math.sin(hueRotation);

    // Hue rotation matrix
    const hueMatrix = [
        0.213 + cos * 0.787 - sin * 0.213,
        0.715 - cos * 0.715 - sin * 0.715,
        0.072 - cos * 0.072 + sin * 0.928,
        0,
        0,
        0.213 - cos * 0.213 + sin * 0.143,
        0.715 + cos * 0.285 + sin * 0.140,
        0.072 - cos * 0.072 - sin * 0.283,
        0,
        0,
        0.213 - cos * 0.213 - sin * 0.787,
        0.715 - cos * 0.715 + sin * 0.715,
        0.072 + cos * 0.928 + sin * 0.072,
        0,
        0,
        0,
        0,
        0,
        1,
        0,
    ];

    // Create Skia path for complex shape
    const spiralPath = React.useMemo(() => {
        const path = Skia.Path.Make();
        const spiralRadius = 150;
        const turns = 4;
        const points = 200;

        for (let i = 0; i <= points; i++) {
            const t = i / points;
            const angle = t * turns * Math.PI * 2 + rotation;
            const r = spiralRadius * t;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            if (i === 0) {
                path.moveTo(x, y);
            } else {
                path.lineTo(x, y);
            }
        }
        return path;
    }, [rotation, centerX, centerY]);

    // Flower path with bezier curves
    const flowerPath = React.useMemo(() => {
        const path = Skia.Path.Make();
        const petals = 6;
        const innerRadius = 30;
        const outerRadius = 80 + pulse * 20;

        for (let i = 0; i < petals; i++) {
            const angle1 = (i / petals) * Math.PI * 2;
            const angle2 = ((i + 0.5) / petals) * Math.PI * 2;
            const angle3 = ((i + 1) / petals) * Math.PI * 2;

            const x1 = centerX + Math.cos(angle1) * innerRadius;
            const y1 = centerY + Math.sin(angle1) * innerRadius;
            const cx = centerX + Math.cos(angle2) * outerRadius;
            const cy = centerY + Math.sin(angle2) * outerRadius;
            const x2 = centerX + Math.cos(angle3) * innerRadius;
            const y2 = centerY + Math.sin(angle3) * innerRadius;

            if (i === 0) {
                path.moveTo(x1, y1);
            }
            path.quadTo(cx, cy, x2, y2);
        }
        path.close();
        return path;
    }, [centerX, centerY, pulse]);

    // Points for scatter effect
    const scatterPoints = React.useMemo(() => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2 + rotation * 0.5;
            const radius = 200 + Math.sin(i * 0.5 + frame * 0.1) * 50;
            pts.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
            });
        }
        return pts;
    }, [frame, rotation, centerX, centerY]);

    return (
        <SkiaCanvas width={width} height={height}>
            {/* Dark background */}
            <Rect x={0} y={0} width={width} height={height} color="#0a0a0f" />

            {/* Sweep Gradient circle - Skia exclusive */}
            <Group transform={[{ rotate: rotation }]} origin={vec(centerX, centerY)}>
                <Circle cx={centerX} cy={centerY} r={250}>
                    <SweepGradient
                        c={vec(centerX, centerY)}
                        colors={["#ff0080", "#7928ca", "#0070f3", "#00dfd8", "#ff0080"]}
                    />
                    <Blur blur={2} />
                </Circle>
            </Group>

            {/* Two Point Conical Gradient - Skia exclusive */}
            <Circle cx={centerX - 300} cy={centerY - 200} r={100}>
                <TwoPointConicalGradient
                    start={vec(centerX - 320, centerY - 220)}
                    startR={10}
                    end={vec(centerX - 280, centerY - 180)}
                    endR={100}
                    colors={["#ffd700", "#ff6b6b", "#4ecdc4"]}
                />
            </Circle>

            {/* Spiral with dash effect - Skia exclusive */}
            <Path path={spiralPath} style="stroke" strokeWidth={4} color="#00ff88">
                <DashPathEffect intervals={[10, 5, 2, 5]} />
            </Path>

            {/* Flower with color matrix hue rotation */}
            <Group transform={[{ rotate: -rotation * 0.5 }]} origin={vec(centerX, centerY)}>
                <Path path={flowerPath} color="#ff6b9d">
                    <ColorMatrix matrix={hueMatrix} />
                </Path>
            </Group>

            {/* Discrete path effect - wobbly lines */}
            <Path
                path={`M ${100} ${height - 150} Q ${centerX} ${height - 300} ${width - 100} ${height - 150}`}
                style="stroke"
                strokeWidth={6}
                color="#ffcc00"
            >
                <DiscretePathEffect length={10} deviation={5 + Math.sin(frame * 0.2) * 3} />
            </Path>

            {/* Corner path effect on rectangle */}
            <RoundedRect
                x={width - 250}
                y={100}
                width={150}
                height={150}
                r={0}
                color="#00ccff"
                style="stroke"
                strokeWidth={4}
            >
                <CornerPathEffect r={20 + pulse * 30} />
            </RoundedRect>

            {/* Scatter points with blend mode */}
            <Group blendMode="screen">
                {scatterPoints.map((pt, i) => (
                    <Circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={4 + Math.sin(i + frame * 0.1) * 2}
                        color={`rgba(255, ${100 + i * 3}, ${200 - i * 2}, 0.8)`}
                    />
                ))}
            </Group>

            {/* Glowing lines with blur */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2 + rotation;
                const x1 = centerX + Math.cos(angle) * 280;
                const y1 = centerY + Math.sin(angle) * 280;
                const x2 = centerX + Math.cos(angle) * 350;
                const y2 = centerY + Math.sin(angle) * 350;

                return (
                    <Line
                        key={i}
                        p1={vec(x1, y1)}
                        p2={vec(x2, y2)}
                        strokeWidth={3}
                        color={`hsl(${i * 45 + frame * 2}, 100%, 60%)`}
                    >
                        <Blur blur={4} />
                    </Line>
                );
            })}

            {/* Title with backdrop blur */}
            <Group>
                <RoundedRect
                    x={centerX - 200}
                    y={30}
                    width={400}
                    height={70}
                    r={35}
                >
                    <LinearGradient
                        start={vec(centerX - 200, 30)}
                        end={vec(centerX + 200, 100)}
                        colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
                    />
                </RoundedRect>
            </Group>

            {/* Info labels */}
            <RoundedRect x={30} y={height - 80} width={250} height={50} r={10}>
                <LinearGradient
                    start={vec(30, height - 80)}
                    end={vec(280, height - 30)}
                    colors={["rgba(0,112,243,0.3)", "rgba(121,40,202,0.3)"]}
                />
            </RoundedRect>

            <RoundedRect x={width - 280} y={height - 80} width={250} height={50} r={10}>
                <LinearGradient
                    start={vec(width - 280, height - 80)}
                    end={vec(width - 30, height - 30)}
                    colors={["rgba(255,107,155,0.3)", "rgba(255,204,0,0.3)"]}
                />
            </RoundedRect>
        </SkiaCanvas>
    );
};
