"use client";

import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, interpolate, Audio, Img, spring, Easing } from "remotion";
import { OpeningScene } from "./OpeningScene";
import { EndingScene } from "./EndingScene";
import { AvatarComponent } from "./AvatarComponent";

// Transition types
export type TransitionType = "fade" | "slide" | "zoom" | "wipe";

// Aspect ratio type
export type AspectRatio = "16:9" | "9:16";

export interface SoundEffect {
    type: "ambient" | "action" | "transition" | "emotion";
    keyword: string;
    timing: "start" | "middle" | "end" | "throughout";
    volume: number;
    url?: string;
}

export interface Scene {
    duration: number;
    avatar_script: string;
    subtitle: string;
    image_prompt: string;
    imageUrl?: string;
    audioUrl?: string;
    heygenVideoUrl?: string;
    sound_effects?: SoundEffect[];
    emotion?: "neutral" | "happy" | "serious" | "excited" | "thoughtful";
    transition?: TransitionType;
    emphasis_words?: string[];
}

export interface BGMConfig {
    url: string;
    volume: number;
}

export interface OpeningConfig {
    enabled: boolean;
    duration?: number; // in seconds, default 3
    subtitle?: string;
}

export interface EndingConfig {
    enabled: boolean;
    duration?: number; // in seconds, default 4
    callToAction?: string;
    channelName?: string;
}

export interface AvatarConfig {
    enabled: boolean;
    position?: "left" | "right" | "center";
    size?: "small" | "medium" | "large";
    imageUrl?: string;
}

export interface VideoProps {
    title: string;
    scenes: Scene[];
    bgm?: BGMConfig;
    aspectRatio?: AspectRatio;
    opening?: OpeningConfig;
    ending?: EndingConfig;
    avatar?: AvatarConfig;
}

// Volume levels for audio mixing
const VOLUME_LEVELS = {
    narration: 0.85,
    bgm: 0.12,
    soundEffects: 0.20,
};

// Transition configurations
const TRANSITION_CONFIGS = {
    fade: { duration: 15 },
    slide: { duration: 12 },
    zoom: { duration: 18 },
    wipe: { duration: 12 },
};

// Get transition type for scene (avoid consecutive same transitions)
const getTransitionForScene = (scene: Scene, index: number): TransitionType => {
    if (scene.transition) return scene.transition;
    const transitions: TransitionType[] = ["fade", "slide", "zoom", "fade"];
    return transitions[index % transitions.length];
};

export const MainVideo: React.FC<VideoProps> = ({ title, scenes, bgm, aspectRatio = "16:9", opening, ending, avatar }) => {
    const { fps } = useVideoConfig();
    const isVertical = aspectRatio === "9:16";

    // Calculate opening/ending durations
    const openingDuration = opening?.enabled ? (opening.duration || 3) : 0;
    const endingDuration = ending?.enabled ? (ending.duration || 4) : 0;
    const openingFrames = openingDuration * fps;
    const endingFrames = endingDuration * fps;

    // Pre-calculate start frames (offset by opening duration)
    const sceneFrames = scenes.map((scene, index) => {
        const startFrame = openingFrames + scenes.slice(0, index).reduce((acc, s) => acc + s.duration * fps, 0);
        const durationInFrames = scene.duration * fps;
        return { startFrame, durationInFrames };
    });

    // Calculate ending start frame
    const endingStartFrame = openingFrames + scenes.reduce((acc, s) => acc + s.duration * fps, 0);

    return (
        <AbsoluteFill className="bg-black">
            {/* BGM - plays throughout entire video */}
            {bgm?.url && (
                <Audio
                    src={bgm.url}
                    volume={bgm.volume || VOLUME_LEVELS.bgm}
                    loop
                />
            )}

            {/* Opening Scene */}
            {opening?.enabled && (
                <Sequence from={0} durationInFrames={openingFrames}>
                    <OpeningScene
                        title={title}
                        subtitle={opening.subtitle}
                        aspectRatio={aspectRatio}
                    />
                </Sequence>
            )}

            {/* Main Content Scenes */}
            {scenes.map((scene: Scene, index: number) => (
                <Sequence
                    key={index}
                    from={sceneFrames[index].startFrame}
                    durationInFrames={sceneFrames[index].durationInFrames}
                >
                    <SceneComponent
                        scene={scene}
                        sceneIndex={index}
                        isVertical={isVertical}
                        avatar={avatar}
                    />
                </Sequence>
            ))}

            {/* Ending Scene */}
            {ending?.enabled && (
                <Sequence from={endingStartFrame} durationInFrames={endingFrames}>
                    <EndingScene
                        title={title}
                        callToAction={ending.callToAction}
                        channelName={ending.channelName}
                        aspectRatio={aspectRatio}
                    />
                </Sequence>
            )}
        </AbsoluteFill>
    );
};

function splitWordsJa(text: string): string[] {
    const trimmed = (text || "").trim();
    if (!trimmed) return [];
    if (trimmed.includes(" ")) {
        return trimmed.split(/\s+/g).filter(Boolean);
    }
    const tokens: string[] = [];
    for (const ch of trimmed) {
        if (ch === "\n") continue;
        tokens.push(ch);
    }
    return tokens;
}

// Add humanized timing variation (±10%)
const humanizeDelay = (baseDelay: number, seed: number): number => {
    const rand = Math.sin(seed * 12.9898) * 43758.5453;
    const variation = (rand - Math.floor(rand) - 0.5) * 0.2;
    return baseDelay * (1 + variation);
};

interface SceneComponentProps {
    scene: Scene;
    sceneIndex: number;
    isVertical: boolean;
    avatar?: AvatarConfig;
}

const SceneComponent: React.FC<SceneComponentProps> = ({ scene, sceneIndex, isVertical, avatar }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const totalFrames = scene.duration * fps;

    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    const transition = getTransitionForScene(scene, sceneIndex);
    const transitionDuration = TRANSITION_CONFIGS[transition].duration;

    // === TRANSITION EFFECTS ===
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

    // Slide transition
    if (transition === "slide") {
        const slideInX = interpolate(frame, [0, transitionDuration], [isVertical ? 0 : 100, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
        });
        const slideInY = interpolate(frame, [0, transitionDuration], [isVertical ? 100 : 0, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
        });
        transitionInStyle = { transform: `translate3d(${slideInX}%, ${slideInY}%, 0)` };
    }

    // Zoom transition
    if (transition === "zoom") {
        const zoomIn = interpolate(frame, [0, transitionDuration], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
        });
        const zoomOut = interpolate(frame, [totalFrames - transitionDuration, totalFrames], [1, 1.2], {
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

    const sceneOpacity = Math.min(fadeIn, fadeOut);

    // === BACKGROUND PAN & ZOOM ===
    const seedSource = `${scene.subtitle}|${scene.image_prompt}`;
    let seed = 0;
    for (let i = 0; i < seedSource.length; i++) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
    const rand01 = (n: number) => {
        const x = Math.sin(n) * 10000;
        return x - Math.floor(x);
    };
    const panX = (rand01(seed + 1) - 0.5) * 60;
    const panY = (rand01(seed + 2) - 0.5) * 40;

    const kf = spring({
        fps,
        frame,
        config: { damping: 18, stiffness: 60, mass: 0.8 },
    });

    const scale = interpolate(kf, [0, 1], [1.02, 1.12]);
    const translateX = interpolate(kf, [0, 1], [-panX, panX]);
    const translateY = interpolate(kf, [0, 1], [panY, -panY]);

    // === BREATHING EFFECT (anti-slideshow) ===
    const breathingScale = interpolate(
        Math.sin(frame * 0.02),
        [-1, 1],
        [1, 1.015]
    );

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

    // === SUBTITLE ANIMATION ===
    const subtitleEnter = spring({
        fps,
        frame: Math.max(0, frame - Math.round(fps * 0.15)),
        config: { damping: 14, stiffness: 150, mass: 0.5 },
    });

    const subtitleOpacity = interpolate(frame, [Math.round(fps * 0.1), Math.round(fps * 0.35)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: ease,
    });

    const subtitleY = interpolate(subtitleEnter, [0, 1], [40, 0]);
    const subtitleScale = interpolate(subtitleEnter, [0, 1], [0.9, 1]);

    // Subtle rotation for dynamic feel
    const subtitleRotate = interpolate(subtitleEnter, [0, 1], [-2, 0]);

    const words = splitWordsJa(scene.subtitle);
    const maxWords = 50;
    const cappedWords = words.slice(0, maxWords);
    const baseStart = Math.round(fps * 0.25);
    const wordStagger = Math.max(2, Math.round(fps * 0.05));
    const wordPopFrames = Math.max(10, Math.round(fps * 0.2));
    const showPunctWithoutPop = (w: string) => /[、。！？!?,.]/.test(w);

    // Check if word should be emphasized
    const isEmphasisWord = (word: string): boolean => {
        if (!scene.emphasis_words) return false;
        return scene.emphasis_words.some(ew => word.includes(ew) || ew.includes(word));
    };

    // Responsive layout based on aspect ratio
    const subtitleContainerClass = isVertical
        ? "absolute bottom-32 left-0 right-0 flex justify-center px-6"
        : "absolute bottom-20 left-0 right-0 flex justify-center px-20";

    const subtitleTextClass = isVertical
        ? "text-white text-3xl font-black text-center tracking-tight leading-relaxed"
        : "text-white text-4xl font-black text-center tracking-tight leading-snug";

    return (
        <AbsoluteFill
            style={{
                opacity: sceneOpacity,
                clipPath: transition === "wipe" ? clipPath : "none",
                ...transitionInStyle,
                ...(frame > totalFrames - transitionDuration ? transitionOutStyle : {}),
            }}
        >
            {/* Narration Audio - with validation */}
            {scene.audioUrl && scene.audioUrl.length > 0 && (
                <Audio
                    src={scene.audioUrl}
                    volume={VOLUME_LEVELS.narration}
                    onError={(e) => console.error("Audio load error:", e)}
                />
            )}

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

            {/* Background Image with Pan & Zoom + Breathing */}
            <AbsoluteFill
                style={{
                    transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale * breathingScale})`
                }}
            >
                {scene.imageUrl && scene.imageUrl.length > 0 ? (
                    <Img
                        src={scene.imageUrl}
                        className="w-full h-full object-cover"
                        onError={() => console.error("Image load error:", scene.imageUrl)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                )}
            </AbsoluteFill>

            {/* Moving light blobs */}
            <AbsoluteFill
                style={{
                    opacity: 0.22,
                    filter: "blur(30px)",
                    mixBlendMode: "screen",
                }}
            >
                <AbsoluteFill
                    style={{
                        transform: `translate3d(${interpolate(frame, [0, totalFrames], [-60, 80])}px, ${interpolate(frame, [0, totalFrames], [40, -30])}px, 0)`,
                        background: "radial-gradient(closest-side, rgba(59,130,246,0.9), rgba(59,130,246,0) 70%)",
                    }}
                />
                <AbsoluteFill
                    style={{
                        transform: `translate3d(${interpolate(frame, [0, totalFrames], [120, -90])}px, ${interpolate(frame, [0, totalFrames], [-20, 60])}px, 0)`,
                        background: "radial-gradient(closest-side, rgba(236,72,153,0.75), rgba(236,72,153,0) 70%)",
                    }}
                />
                <AbsoluteFill
                    style={{
                        transform: `translate3d(${interpolate(frame, [0, totalFrames], [-10, 40])}px, ${interpolate(frame, [0, totalFrames], [90, 10])}px, 0)`,
                        background: "radial-gradient(closest-side, rgba(34,197,94,0.65), rgba(34,197,94,0) 70%)",
                    }}
                />
            </AbsoluteFill>

            {/* Overlay for readability */}
            <AbsoluteFill className="bg-black/25" />

            <AbsoluteFill
                style={{
                    background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.55) 100%)",
                    mixBlendMode: "multiply",
                    opacity: 0.85,
                }}
            />

            {/* Noise texture */}
            <AbsoluteFill
                style={{
                    opacity: 0.08,
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "repeat",
                    mixBlendMode: "overlay",
                }}
            />

            {/* Subtitles with enhanced animation */}
            <div className={subtitleContainerClass}>
                <div
                    className="bg-black/60 backdrop-blur-md border border-white/20 px-8 py-4 rounded-2xl shadow-2xl"
                    style={{
                        opacity: subtitleOpacity,
                        transform: `translate3d(0, ${subtitleY}px, 0) scale(${subtitleScale}) rotate(${subtitleRotate}deg)`,
                        maxWidth: isVertical ? "90%" : "85%",
                    }}
                >
                    <p className={subtitleTextClass}>
                        {cappedWords.map((w, i) => {
                            const humanizedStart = baseStart + humanizeDelay(i * wordStagger, seed + i);
                            const start = Math.round(humanizedStart);
                            const local = frame - start;
                            const visible = local >= 0;

                            // Enhanced pop animation
                            const pop = spring({
                                fps,
                                frame: Math.max(0, local),
                                config: {
                                    damping: 12,
                                    stiffness: 250,
                                    mass: 0.4,
                                },
                                durationInFrames: wordPopFrames,
                            });

                            const isEmphasis = isEmphasisWord(w);
                            const opacity = visible
                                ? showPunctWithoutPop(w)
                                    ? 1
                                    : interpolate(pop, [0, 1], [0, 1])
                                : 0;

                            // Bigger scale change for dynamic feel
                            const baseScale = showPunctWithoutPop(w) ? 1 : interpolate(pop, [0, 1], [0.3, 1]);
                            const emphasisScale = isEmphasis ? 1.1 : 1;
                            const s = baseScale * emphasisScale;

                            const y = showPunctWithoutPop(w) ? 0 : interpolate(pop, [0, 1], [15, 0]);

                            // Subtle rotation per word
                            const rotation = showPunctWithoutPop(w) ? 0 : interpolate(pop, [0, 1], [-5, 0]);

                            // Glow effect for emphasis words
                            const glowIntensity = isEmphasis ? interpolate(pop, [0, 1], [0, 20]) : 0;
                            const textShadow = isEmphasis
                                ? `0 0 ${glowIntensity}px rgba(255,255,100,0.8), 0 8px 24px rgba(0,0,0,0.35)`
                                : "0 8px 24px rgba(0,0,0,0.35)";

                            return (
                                <span
                                    key={`${w}-${i}`}
                                    style={{
                                        display: "inline-block",
                                        opacity,
                                        transform: `translate3d(0, ${y}px, 0) scale(${s}) rotate(${rotation}deg)`,
                                        marginRight: w.match(/[A-Za-z0-9]/) ? 8 : 0,
                                        textShadow,
                                        color: isEmphasis ? "#fef08a" : "white",
                                        fontWeight: isEmphasis ? 900 : "inherit",
                                    }}
                                >
                                    {w}
                                </span>
                            );
                        })}
                    </p>
                </div>
            </div>

            {/* Avatar with lip sync */}
            {avatar?.enabled && (
                <AvatarComponent
                    audioUrl={scene.audioUrl}
                    avatarImageUrl={avatar.imageUrl}
                    emotion={scene.emotion}
                    aspectRatio={isVertical ? "9:16" : "16:9"}
                    position={avatar.position || "right"}
                    size={avatar.size || "medium"}
                />
            )}
        </AbsoluteFill>
    );
};
