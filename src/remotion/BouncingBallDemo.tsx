import React, { useMemo } from "react";
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    Audio,
    Sequence,
} from "remotion";

interface BouncingBallDemoProps {
    aspectRatio: "16:9" | "9:16";
}

interface BallConfig {
    color: string;
    startX: number;
    size: number;
    bounceHeight: number;
    bounceDuration: number;
    delay: number;
    pitch: number;
}

interface BallProps extends BallConfig {
    shadowColor?: string;
}

// Generate bounce sound as base64 data URL
function generateBounceSound(pitch: number = 1.0): string {
    const sampleRate = 44100;
    const duration = 0.15; // Short bounce sound
    const numSamples = Math.floor(sampleRate * duration);

    // Create WAV file in memory
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, numSamples * 2, true);

    // Generate bounce sound (descending frequency with decay)
    const baseFreq = 200 * pitch;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = i / numSamples;

        // Frequency drops quickly (impact sound)
        const freq = baseFreq * Math.pow(0.3, progress * 2);

        // Quick attack, fast decay envelope
        const envelope = Math.exp(-progress * 15) * (1 - Math.exp(-progress * 100));

        // Mix of sine and noise for realistic impact
        const sine = Math.sin(2 * Math.PI * freq * t);
        const noise = (Math.random() * 2 - 1) * 0.3;

        const sample = (sine * 0.7 + noise * 0.3) * envelope;
        const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));

        view.setInt16(44 + i * 2, intSample, true);
    }

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return "data:audio/wav;base64," + btoa(binary);
}

const BouncingBall: React.FC<BallProps> = ({
    color,
    startX,
    size,
    bounceHeight,
    bounceDuration,
    delay = 0,
    shadowColor = "rgba(0,0,0,0.3)",
}) => {
    const frame = useCurrentFrame();
    const { height } = useVideoConfig();
    const groundY = height - 100;
    const adjustedFrame = Math.max(0, frame - delay);

    const bounceProgress = (adjustedFrame % bounceDuration) / bounceDuration;
    const normalizedY = -4 * bounceHeight * Math.pow(bounceProgress - 0.5, 2) + bounceHeight;
    const ballY = groundY - size / 2 - normalizedY;

    const velocity = -8 * bounceHeight * (bounceProgress - 0.5);
    const normalizedVelocity = velocity / (4 * bounceHeight);

    const distanceFromGround = Math.min(bounceProgress, 1 - bounceProgress);
    const isNearGround = distanceFromGround < 0.15;

    const squashAmount = isNearGround
        ? interpolate(distanceFromGround, [0, 0.15], [0.4, 0], {
              extrapolateRight: "clamp",
          })
        : 0;

    const stretchAmount = Math.abs(normalizedVelocity) * 0.2;
    const scaleX = 1 + squashAmount - stretchAmount * 0.5;
    const scaleY = 1 - squashAmount + stretchAmount;

    const squashOffset = (squashAmount * size) / 2;
    const finalY = isNearGround ? groundY - size / 2 + squashOffset : ballY;

    const shadowScale = interpolate(normalizedY, [0, bounceHeight], [1, 0.3], {
        extrapolateRight: "clamp",
    });
    const shadowOpacity = interpolate(normalizedY, [0, bounceHeight], [0.4, 0.1], {
        extrapolateRight: "clamp",
    });

    const wobble = Math.sin(adjustedFrame * 0.3) * 5;

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    left: startX + wobble - (size * shadowScale) / 2,
                    top: groundY - 5,
                    width: size * shadowScale * scaleX,
                    height: 15 * shadowScale,
                    background: `radial-gradient(ellipse, ${shadowColor} 0%, transparent 70%)`,
                    opacity: shadowOpacity,
                    borderRadius: "50%",
                    transform: `scaleX(${1 + squashAmount})`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    left: startX + wobble - size / 2,
                    top: finalY - size / 2,
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 30% 30%, ${color}, ${adjustColor(color, -40)})`,
                    boxShadow: `
                        inset -${size * 0.1}px -${size * 0.1}px ${size * 0.3}px rgba(0,0,0,0.3),
                        inset ${size * 0.05}px ${size * 0.05}px ${size * 0.2}px rgba(255,255,255,0.3)
                    `,
                    transform: `scaleX(${scaleX}) scaleY(${scaleY})`,
                    transformOrigin: "center bottom",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: "15%",
                        left: "20%",
                        width: "25%",
                        height: "20%",
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: "50%",
                        filter: "blur(2px)",
                    }}
                />
            </div>
        </>
    );
};

function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Bounce sound component with generated audio
const BounceSound: React.FC<{
    bounceDuration: number;
    delay: number;
    totalFrames: number;
    pitch: number;
}> = ({ bounceDuration, delay, totalFrames, pitch }) => {
    // Pre-generate the sound URL
    const soundUrl = useMemo(() => generateBounceSound(pitch), [pitch]);

    // Calculate all bounce frames
    const bounceFrames = useMemo(() => {
        const frames: number[] = [];
        let currentFrame = delay;
        while (currentFrame < totalFrames) {
            frames.push(currentFrame);
            currentFrame += bounceDuration;
        }
        return frames;
    }, [bounceDuration, delay, totalFrames]);

    const volume = interpolate(pitch, [0.8, 1.5], [0.9, 0.6]);

    return (
        <>
            {bounceFrames.map((startFrame, index) => (
                <Sequence key={index} from={startFrame} durationInFrames={8}>
                    <Audio src={soundUrl} volume={volume} />
                </Sequence>
            ))}
        </>
    );
};

export const BouncingBallDemo: React.FC<BouncingBallDemoProps> = ({ aspectRatio }) => {
    const frame = useCurrentFrame();
    const { width, height, durationInFrames } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    const balls: BallConfig[] = useMemo(() => {
        const baseBalls: BallConfig[] = [
            {
                color: "#ef4444",
                startX: isVertical ? width * 0.3 : width * 0.2,
                size: 80,
                bounceHeight: 400,
                bounceDuration: 60,
                delay: 0,
                pitch: 1.0,
            },
            {
                color: "#22c55e",
                startX: isVertical ? width * 0.5 : width * 0.4,
                size: 60,
                bounceHeight: 350,
                bounceDuration: 50,
                delay: 10,
                pitch: 1.3,
            },
            {
                color: "#3b82f6",
                startX: isVertical ? width * 0.7 : width * 0.6,
                size: 100,
                bounceHeight: 450,
                bounceDuration: 70,
                delay: 20,
                pitch: 0.7,
            },
            {
                color: "#f59e0b",
                startX: isVertical ? width * 0.5 : width * 0.8,
                size: 50,
                bounceHeight: 300,
                bounceDuration: 45,
                delay: 30,
                pitch: 1.5,
            },
        ];

        if (!isVertical) {
            baseBalls.push({
                color: "#ec4899",
                startX: width * 0.15,
                size: 70,
                bounceHeight: 380,
                bounceDuration: 55,
                delay: 15,
                pitch: 1.1,
            });
        }

        return baseBalls;
    }, [isVertical, width]);

    const groundShake = Math.sin(frame * 0.5) * 2;

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            }}
        >
            {/* Bounce Sounds */}
            {balls.map((ball, index) => (
                <BounceSound
                    key={`sound-${index}`}
                    bounceDuration={ball.bounceDuration}
                    delay={ball.delay}
                    totalFrames={durationInFrames}
                    pitch={ball.pitch}
                />
            ))}

            {/* Stars background */}
            {Array.from({ length: 50 }).map((_, i) => {
                const x = (i * 137.5) % 100;
                const y = (i * 73.7) % 60;
                const twinkle = Math.sin(frame * 0.1 + i) * 0.5 + 0.5;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${x}%`,
                            top: `${y}%`,
                            width: 3,
                            height: 3,
                            background: "white",
                            borderRadius: "50%",
                            opacity: twinkle * 0.8,
                        }}
                    />
                );
            })}

            {/* Ground */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    background: "linear-gradient(180deg, #2d4a3e 0%, #1a2f27 100%)",
                    transform: `translateY(${groundShake}px)`,
                }}
            >
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            bottom: 80,
                            left: `${(i / 30) * 100}%`,
                            width: 4,
                            height: 20 + Math.sin(i + frame * 0.1) * 5,
                            background: "#3d6b4f",
                            borderRadius: "50% 50% 0 0",
                            transform: `rotate(${Math.sin(i + frame * 0.05) * 10}deg)`,
                            transformOrigin: "bottom center",
                        }}
                    />
                ))}
            </div>

            {/* Bouncing balls */}
            {balls.map((ball, index) => (
                <BouncingBall key={index} {...ball} />
            ))}

            {/* Title */}
            <div
                style={{
                    position: "absolute",
                    top: 40,
                    left: "50%",
                    transform: "translateX(-50%)",
                    textAlign: "center",
                }}
            >
                <h1
                    style={{
                        fontSize: isVertical ? 48 : 64,
                        fontWeight: "bold",
                        color: "white",
                        margin: 0,
                        textShadow: "0 4px 20px rgba(0,0,0,0.5)",
                        fontFamily: "sans-serif",
                    }}
                >
                    Bouncing Balls
                </h1>
                <p
                    style={{
                        fontSize: isVertical ? 20 : 28,
                        color: "rgba(255,255,255,0.7)",
                        margin: "10px 0 0 0",
                        fontFamily: "sans-serif",
                    }}
                >
                    Squash & Stretch + Generated Sound
                </p>
            </div>

            {/* Sound wave visualization */}
            <div
                style={{
                    position: "absolute",
                    top: 40,
                    right: 30,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "12px 20px",
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 25,
                }}
            >
                {Array.from({ length: 5 }).map((_, i) => {
                    const barHeight = 8 + Math.sin(frame * 0.3 + i * 0.5) * 8;
                    return (
                        <div
                            key={i}
                            style={{
                                width: 4,
                                height: barHeight,
                                background: "#22c55e",
                                borderRadius: 2,
                            }}
                        />
                    );
                })}
                <span
                    style={{
                        color: "white",
                        fontSize: 14,
                        fontFamily: "sans-serif",
                        marginLeft: 8,
                    }}
                >
                    Sound ON
                </span>
            </div>

            {/* Info panels */}
            <div
                style={{
                    position: "absolute",
                    bottom: 120,
                    left: 30,
                    padding: "15px 25px",
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 15,
                    backdropFilter: "blur(10px)",
                }}
            >
                <p style={{ margin: 0, color: "white", fontSize: 18, fontFamily: "monospace" }}>
                    Parabolic Motion
                </p>
                <p style={{ margin: "5px 0 0 0", color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "monospace" }}>
                    y = -4h(t - 0.5)² + h
                </p>
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 120,
                    right: 30,
                    padding: "15px 25px",
                    background: "rgba(0,0,0,0.5)",
                    borderRadius: 15,
                    backdropFilter: "blur(10px)",
                }}
            >
                <p style={{ margin: 0, color: "white", fontSize: 18, fontFamily: "monospace" }}>
                    Pitch by Size
                </p>
                <p style={{ margin: "5px 0 0 0", color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "monospace" }}>
                    Big = Low, Small = High
                </p>
            </div>
        </AbsoluteFill>
    );
};
