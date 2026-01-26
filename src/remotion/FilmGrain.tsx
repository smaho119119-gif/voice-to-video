"use client";

import { AbsoluteFill, useCurrentFrame } from "remotion";

export interface FilmGrainProps {
    opacity?: number;
}

/**
 * Film Grain Effect Component
 *
 * Creates a subtle film grain texture to reduce "AI feel" and add cinematic quality.
 * Uses CSS-based noise generation without external dependencies.
 */
export const FilmGrain: React.FC<FilmGrainProps> = ({ opacity = 0.05 }) => {
    const frame = useCurrentFrame();

    // Animate grain position slightly to avoid static pattern
    const offsetX = (frame * 0.5) % 200;
    const offsetY = (frame * 0.3) % 200;

    return (
        <AbsoluteFill
            style={{
                opacity,
                mixBlendMode: 'overlay',
                pointerEvents: 'none',
                // SVG noise pattern
                background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
                backgroundPosition: `${offsetX}px ${offsetY}px`,
            }}
        />
    );
};
