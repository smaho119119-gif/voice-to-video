"use client";

import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, interpolate, Audio, Img, spring, Easing, OffthreadVideo } from "remotion";
import { AvatarComponent } from "../AvatarComponent";
import { FilmGrain } from "../FilmGrain";
import { AssetRenderer } from "./AssetRenderer";
import type { Scene, AvatarConfig, TextDisplayMode } from "../MainVideo";
import { VOLUME_LEVELS, TRANSITION_CONFIGS, KEN_BURNS_PATTERNS } from "../utils/constants";
import { getTransitionForScene } from "../utils/transitions";
import { splitTextForAnimation, splitWordsJa } from "../utils/textSplitter";
import { useMemo } from "react";

interface SceneComponentProps {
    scene: Scene;
    sceneIndex: number;
    isVertical: boolean;
    avatar?: AvatarConfig;
    showSubtitle?: boolean;
}

export const SceneComponent: React.FC<SceneComponentProps> = ({ scene, sceneIndex, isVertical, avatar, showSubtitle = false }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const totalFrames = scene.duration * fps;

    // Validate media URLs
    const hasValidAudio = scene.audioUrl && scene.audioUrl.trim().length > 0;
    const hasValidImage = scene.imageUrl && scene.imageUrl.trim().length > 0;
    const hasValidLipSync = scene.lipSyncVideoUrl && scene.lipSyncVideoUrl.trim().length > 0;

    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    const transition = getTransitionForScene(scene, sceneIndex);
    const transitionDuration = TRANSITION_CONFIGS[transition].duration;

    // === TRANSITION EFFECTS ===
    // Memoize expensive calculations
    const transitionStyles = useMemo(() => {
        let transitionInStyle: React.CSSProperties = {};
        let transitionOutStyle: React.CSSProperties = {};

        // Fade (always present as base)
        const fadeIn = interpolate(frame, [0, transitionDuration], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
        });
        const fadeOut = interpolate(frame, [totalFrames - transitionDuration, totalFrames], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
        });

        // Slide transition - more dramatic
        if (transition === "slide") {
            const slideInX = interpolate(frame, [0, transitionDuration], [isVertical ? 0 : 150, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
            });
            const slideInY = interpolate(frame, [0, transitionDuration], [isVertical ? 150 : 0, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
            });
            transitionInStyle = { transform: `translate3d(${slideInX}%, ${slideInY}%, 0)` };
        }

        // Zoom transition - more dramatic
        if (transition === "zoom") {
            const zoomIn = interpolate(frame, [0, transitionDuration], [0.5, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
            });
            const zoomOut = interpolate(frame, [totalFrames - transitionDuration, totalFrames], [1, 1.5], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
            });
            transitionInStyle = { transform: `scale(${zoomIn})` };
            transitionOutStyle = { transform: `scale(${zoomOut})` };
        }

        // Wipe transition (using clip-path)
        let clipPath = "none";
        if (transition === "wipe") {
            const wipeProgress = interpolate(frame, [0, transitionDuration], [0, 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
            });
            clipPath = `polygon(0 0, ${wipeProgress}% 0, ${wipeProgress}% 100%, 0 100%)`;
        }

        // Only apply fade-out at the end, start immediately at full opacity to avoid black gaps
        // When TRANSITION_OVERLAP is 0, we don't want fade-in as it creates gaps
        const sceneOpacity = fadeOut;

        return { transitionInStyle, transitionOutStyle, clipPath, sceneOpacity };
    }, [frame, transition, transitionDuration, totalFrames, isVertical, ease]);

    // === KEN BURNS EFFECT - Enhanced Background Animation ===
    const kenBurnsTransform = useMemo(() => {
        // Select pattern based on scene index (ensures variation)
        const patternIndex = sceneIndex % KEN_BURNS_PATTERNS.length;
        const pattern = KEN_BURNS_PATTERNS[patternIndex];

        // Smooth progress using bezier easing (no linear!)
        const kenBurnsProgress = interpolate(
            frame,
            [0, totalFrames],
            [0, 1],
            {
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.4, 0.0, 0.2, 1) // Material Design easing
            }
        );

        // Calculate scale and translation values
        const scale = interpolate(kenBurnsProgress, [0, 1], pattern.zoom);
        const translateX = interpolate(kenBurnsProgress, [0, 1], pattern.pan.x);
        const translateY = interpolate(kenBurnsProgress, [0, 1], pattern.pan.y);

        // === BREATHING EFFECT (anti-slideshow) ===
        const breathingScale = interpolate(
            Math.sin(frame * 0.015),
            [-1, 1],
            [1, 1.02]
        );

        return {
            transform: `translate3d(${translateX}%, ${translateY}%, 0) scale(${scale * breathingScale})`,
            transition: 'transform 0.1s ease-out', // Micro-smoothing for frame-to-frame
        };
    }, [frame, sceneIndex, totalFrames]);

    // === SOUND EFFECTS ===
    const getSoundStartFrame = (timing: string): number => {
        switch (timing) {
            case "start": return 0;
            case "middle": return Math.floor(totalFrames / 2);
            case "end": return Math.floor(totalFrames * 0.8);
            case "throughout": return 0;
            default: return 0;
        }
    };

    // === TEXT ANIMATION ===
    // Split text into characters for typewriter effect
    const chars = useMemo(() => splitTextForAnimation(scene.subtitle), [scene.subtitle]);
    const words = useMemo(() => splitWordsJa(scene.subtitle), [scene.subtitle]);

    // Text display mode (default: word-bounce for backward compatibility)
    const textDisplayMode: TextDisplayMode = scene.textDisplayMode || "word-bounce";

    // Timing: characters appear one by one, then stay visible
    const charDelay = 2; // frames between each character
    const charDuration = 8; // frames for each char to animate in

    // === SYNC-TYPEWRITER: Calculate timing based on audio duration ===
    // 音声の長さに合わせて1文字ずつ表示
    const syncTypewriterConfig = useMemo(() => {
        if (textDisplayMode !== "sync-typewriter" || chars.length === 0) {
            return { framesPerChar: 2, startDelay: fps * 0.1 };
        }
        // 音声の90%の時間で全文字を表示（残り10%は表示維持）
        const displayDuration = totalFrames * 0.9;
        const framesPerChar = Math.max(1, Math.floor(displayDuration / chars.length));
        return { framesPerChar, startDelay: fps * 0.1 };
    }, [textDisplayMode, chars.length, totalFrames, fps]);

    // === CENTER TEXT ANIMATION (タイプライター + ビヨーン効果) ===
    const centerTextEnterDelay = fps * 0.3; // Start after 0.3 seconds

    // Check if word should be emphasized
    const isEmphasisWord = (word: string): boolean => {
        if (!scene.emphasis_words) return false;
        return scene.emphasis_words.some(ew => word.includes(ew) || ew.includes(word));
    };

    // Emotion-based accent color
    const emotionColors: Record<string, string> = {
        neutral: "rgba(147, 197, 253, 1)",
        happy: "rgba(251, 191, 36, 1)",
        serious: "rgba(99, 102, 241, 1)",
        excited: "rgba(244, 114, 182, 1)",
        thoughtful: "rgba(139, 92, 246, 1)",
    };
    const accentColor = emotionColors[scene.emotion || "neutral"];

    return (
        <AbsoluteFill
            style={{
                opacity: transitionStyles.sceneOpacity,
                clipPath: transition === "wipe" ? transitionStyles.clipPath : "none",
                ...transitionStyles.transitionInStyle,
                ...(frame > totalFrames - transitionDuration ? transitionStyles.transitionOutStyle : {}),
            }}
        >
            {/* Narration Audio is handled by MainVideo.tsx - do not duplicate here */}

            {/* Sound Effects */}
            {scene.sound_effects?.map((sfx, i) => (
                sfx.url && (
                    <Sequence key={`sfx-${i}`} from={getSoundStartFrame(sfx.timing)}>
                        <Audio
                            src={sfx.url}
                            volume={Math.min(sfx.volume || 0.3, VOLUME_LEVELS.soundEffects)}
                            loop={sfx.timing === "throughout"}
                        />
                    </Sequence>
                )
            ))}

            {/* Background Image with Ken Burns Effect + Breathing */}
            <AbsoluteFill style={kenBurnsTransform}>
                {hasValidImage ? (
                    <Img
                        src={scene.imageUrl!}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: isVertical ? 'cover' : 'cover',
                            objectPosition: 'center',
                        }}
                        onError={() => console.error("Image load error:", scene.imageUrl)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                )}
            </AbsoluteFill>

            {/* Film Grain - reduces AI feel, adds cinematic quality */}
            <FilmGrain opacity={0.05} />

            {/* Moving light blobs - more dynamic */}
            <AbsoluteFill
                style={{
                    opacity: 0.3,
                    filter: "blur(40px)",
                    mixBlendMode: "screen",
                }}
            >
                <AbsoluteFill
                    style={{
                        transform: `translate3d(${interpolate(frame, [0, totalFrames], [-100, 150])}px, ${interpolate(frame, [0, totalFrames], [80, -60])}px, 0)`,
                        background: "radial-gradient(closest-side, rgba(59,130,246,0.95), rgba(59,130,246,0) 70%)",
                    }}
                />
                <AbsoluteFill
                    style={{
                        transform: `translate3d(${interpolate(frame, [0, totalFrames], [200, -150])}px, ${interpolate(frame, [0, totalFrames], [-40, 100])}px, 0)`,
                        background: "radial-gradient(closest-side, rgba(236,72,153,0.85), rgba(236,72,153,0) 70%)",
                    }}
                />
                <AbsoluteFill
                    style={{
                        transform: `translate3d(${interpolate(frame, [0, totalFrames], [-30, 80])}px, ${interpolate(frame, [0, totalFrames], [150, 20])}px, 0)`,
                        background: "radial-gradient(closest-side, rgba(34,197,94,0.75), rgba(34,197,94,0) 70%)",
                    }}
                />
            </AbsoluteFill>

            {/* Overlay gradient for readability */}
            <AbsoluteFill
                style={{
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)",
                }}
            />

            {/* Vignette effect */}
            <AbsoluteFill
                style={{
                    background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%)",
                }}
            />

            {/* Assets (shapes, icons, text, lottie, svg) */}
            {scene.assets && scene.assets.length > 0 && (
                <AssetRenderer assets={scene.assets} isVertical={isVertical} />
            )}

            {/* === CENTER TEXT - Multiple Display Modes === */}
            {showSubtitle && (
            <div
                style={{
                    position: "absolute",
                    top: isVertical ? "30%" : "40%",
                    left: 0,
                    right: 0,
                    transform: "translateY(-50%)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: isVertical ? "0 30px" : "0 80px",
                }}
            >
                <div
                    style={{
                        textAlign: "center",
                        maxWidth: isVertical ? "95%" : "85%",
                    }}
                >
                    <p
                        style={{
                            fontSize: isVertical ? "3.5rem" : "5rem",
                            fontWeight: 900,
                            lineHeight: 1.3,
                            margin: 0,
                            color: "white",
                        }}
                    >
                        {/* === INSTANT MODE: 即時全文表示 === */}
                        {textDisplayMode === "instant" && (
                            <span
                                style={{
                                    display: "inline-block",
                                    opacity: 1,
                                    textShadow: "0 6px 30px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.3)",
                                }}
                            >
                                {scene.subtitle}
                            </span>
                        )}

                        {/* === SYNC-TYPEWRITER MODE: 音声同期タイプライター === */}
                        {textDisplayMode === "sync-typewriter" && chars.map((char, i) => {
                            const charStart = syncTypewriterConfig.startDelay + i * syncTypewriterConfig.framesPerChar;
                            const localFrame = frame - charStart;
                            const visible = localFrame >= 0;

                            // Smooth fade-in for each character
                            const opacity = visible
                                ? interpolate(localFrame, [0, 3], [0, 1], { extrapolateRight: "clamp" })
                                : 0;

                            // Subtle scale animation
                            const scale = visible
                                ? interpolate(localFrame, [0, 4], [0.8, 1], { extrapolateRight: "clamp" })
                                : 0.8;

                            // Cursor effect: show blinking cursor at the end of visible text
                            const isLastVisible = visible && (i === chars.length - 1 || frame < syncTypewriterConfig.startDelay + (i + 1) * syncTypewriterConfig.framesPerChar);
                            const cursorBlink = Math.sin(frame * 0.3) > 0;

                            return (
                                <span
                                    key={`char-${i}`}
                                    style={{
                                        display: "inline",
                                        opacity,
                                        transform: `scale(${scale})`,
                                        textShadow: "0 6px 30px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.3)",
                                        position: "relative",
                                    }}
                                >
                                    {char}
                                    {/* Blinking cursor at current position */}
                                    {isLastVisible && cursorBlink && (
                                        <span style={{
                                            display: "inline-block",
                                            width: "3px",
                                            height: "1em",
                                            backgroundColor: accentColor,
                                            marginLeft: "2px",
                                            verticalAlign: "middle",
                                        }} />
                                    )}
                                </span>
                            );
                        })}

                        {/* === WORD-BOUNCE MODE: 単語バウンス（デフォルト） === */}
                        {textDisplayMode === "word-bounce" && words.map((word, i) => {
                            const wordStart = centerTextEnterDelay + i * fps * 0.12; // 0.12 seconds per word
                            const localFrame = frame - wordStart;
                            const visible = localFrame >= 0;

                            // Bouncy spring animation - ビヨーン効果!
                            const bounceProgress = spring({
                                fps,
                                frame: Math.max(0, localFrame),
                                config: {
                                    damping: 8,       // Low damping = more bounce
                                    stiffness: 180,   // High stiffness = snappy
                                    mass: 0.6,        // Light mass = responsive
                                },
                            });

                            // Scale: starts tiny, overshoots to 1.3, settles to 1
                            const scaleValue = visible
                                ? interpolate(bounceProgress, [0, 0.5, 1], [0, 1.4, 1])
                                : 0;

                            // Y position: drops from above
                            const yValue = visible
                                ? interpolate(bounceProgress, [0, 1], [-60, 0])
                                : -60;

                            // Rotation for extra dynamism
                            const rotation = visible
                                ? interpolate(bounceProgress, [0, 0.5, 1], [-15, 5, 0])
                                : -15;

                            // Opacity
                            const opacity = visible
                                ? interpolate(bounceProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
                                : 0;

                            // Emphasis styling
                            const isEmphasis = isEmphasisWord(word);
                            const glowAmount = isEmphasis ? 25 : 0;
                            const textColor = isEmphasis ? "#fef08a" : "white";
                            const textShadow = isEmphasis
                                ? `0 0 ${glowAmount}px ${accentColor}, 0 0 ${glowAmount * 2}px ${accentColor}, 0 6px 30px rgba(0,0,0,0.5)`
                                : "0 6px 30px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.3)";

                            return (
                                <span
                                    key={`${word}-${i}`}
                                    style={{
                                        display: "inline-block",
                                        opacity,
                                        transform: `translateY(${yValue}px) scale(${scaleValue}) rotate(${rotation}deg)`,
                                        marginRight: "0.15em",
                                        color: textColor,
                                        textShadow,
                                        fontWeight: isEmphasis ? 900 : 800,
                                        letterSpacing: isEmphasis ? "0.05em" : "normal",
                                    }}
                                >
                                    {word}
                                </span>
                            );
                        })}
                    </p>
                </div>
            </div>
            )}

            {/* === BOTTOM SUBTITLE - Typewriter style === */}
            {showSubtitle && (
            <div
                style={{
                    position: "absolute",
                    bottom: isVertical ? 120 : 80,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                    padding: isVertical ? "0 20px" : "0 40px",
                }}
            >
                <div
                    style={{
                        background: "rgba(0, 0, 0, 0.75)",
                        backdropFilter: "blur(12px)",
                        borderRadius: 16,
                        padding: isVertical ? "16px 24px" : "20px 40px",
                        maxWidth: isVertical ? "95%" : "85%",
                        border: `2px solid ${accentColor}40`,
                        boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 20px ${accentColor}20`,
                    }}
                >
                    {/* Typewriter text - character by character */}
                    <p
                        style={{
                            fontSize: isVertical ? "1.5rem" : "2rem",
                            fontWeight: 700,
                            color: "white",
                            margin: 0,
                            lineHeight: 1.5,
                            textAlign: "center",
                        }}
                    >
                        {chars.map((char, i) => {
                            const charStart = fps * 0.2 + i * charDelay;
                            const localFrame = frame - charStart;
                            const visible = localFrame >= 0;

                            // Quick pop-in animation
                            const popProgress = spring({
                                fps,
                                frame: Math.max(0, localFrame),
                                config: {
                                    damping: 15,
                                    stiffness: 300,
                                    mass: 0.3,
                                },
                            });

                            const opacity = visible ? interpolate(popProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) : 0;
                            const scale = visible ? interpolate(popProgress, [0, 0.5, 1], [0.5, 1.2, 1]) : 0.5;
                            const y = visible ? interpolate(popProgress, [0, 1], [10, 0]) : 10;

                            // Cursor effect on last visible character
                            const isLastVisible = visible && (frame - charStart < fps * 0.5);
                            const cursorOpacity = isLastVisible ? (Math.floor(frame / 10) % 2 === 0 ? 1 : 0) : 0;

                            return (
                                <span
                                    key={`char-${i}`}
                                    style={{
                                        display: "inline-block",
                                        opacity,
                                        transform: `translateY(${y}px) scale(${scale})`,
                                        position: "relative",
                                    }}
                                >
                                    {char}
                                    {isLastVisible && i === chars.length - 1 && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                right: -4,
                                                top: 0,
                                                width: 3,
                                                height: "1.2em",
                                                backgroundColor: accentColor,
                                                opacity: cursorOpacity,
                                            }}
                                        />
                                    )}
                                </span>
                            );
                        })}
                    </p>
                </div>
            </div>
            )}

            {/* Decorative elements - animated lines */}
            <div
                style={{
                    position: "absolute",
                    top: isVertical ? "20%" : "15%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: interpolate(frame, [fps * 0.3, fps * 0.8], [0, isVertical ? 200 : 400], { extrapolateRight: "clamp" }),
                    height: 3,
                    background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                    borderRadius: 2,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: isVertical ? "35%" : "25%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: interpolate(frame, [fps * 0.4, fps * 0.9], [0, isVertical ? 200 : 400], { extrapolateRight: "clamp" }),
                    height: 3,
                    background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                    borderRadius: 2,
                }}
            />

            {/* Lip-synced video or Avatar */}
            {hasValidLipSync ? (
                /* Display lip-synced video in center using OffthreadVideo for better performance */
                <AbsoluteFill
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <OffthreadVideo
                        src={scene.lipSyncVideoUrl!}
                        muted
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                        }}
                    />
                </AbsoluteFill>
            ) : avatar?.enabled ? (
                /* Fallback to avatar component */
                <AvatarComponent
                    audioUrl={hasValidAudio ? scene.audioUrl : undefined}
                    avatarImageUrl={avatar.imageUrl}
                    emotion={scene.emotion}
                    aspectRatio={isVertical ? "9:16" : "16:9"}
                    position={avatar.position || "right"}
                    size={avatar.size || "medium"}
                />
            ) : null}
        </AbsoluteFill>
    );
};
