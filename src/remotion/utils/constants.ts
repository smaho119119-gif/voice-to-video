/**
 * Volume levels for audio mixing in videos
 */
export const VOLUME_LEVELS = {
    narration: 0.85,
    bgm: 0.12,
    soundEffects: 0.20,
} as const;

/**
 * Transition configurations with durations in frames
 */
export const TRANSITION_CONFIGS = {
    fade: { duration: 15 },
    slide: { duration: 12 },
    zoom: { duration: 18 },
    wipe: { duration: 12 },
} as const;

/**
 * Ken Burns Effect - 6 distinct movement patterns to avoid slideshow feel
 */
export const KEN_BURNS_PATTERNS = [
    { zoom: [1.0, 1.2], pan: { x: [0, -10], y: [0, -5] } },   // Pattern 1: Zoom in + pan to bottom-right
    { zoom: [1.2, 1.0], pan: { x: [-10, 0], y: [-5, 0] } },   // Pattern 2: Zoom out + pan from bottom-right
    { zoom: [1.0, 1.15], pan: { x: [0, 10], y: [0, 0] } },    // Pattern 3: Pan right (horizontal movement)
    { zoom: [1.15, 1.0], pan: { x: [10, 0], y: [0, 0] } },    // Pattern 4: Pan left (return)
    { zoom: [1.05, 1.2], pan: { x: [-5, 5], y: [-5, 5] } },   // Pattern 5: Diagonal zoom
    { zoom: [1.1, 1.1], pan: { x: [0, 0], y: [-8, 8] } },     // Pattern 6: Vertical pan (constant zoom)
] as const;

/**
 * Transition overlap in frames to avoid black gaps between scenes
 * Set to 0 to disable overlap and prevent audio from playing twice
 */
export const TRANSITION_OVERLAP = 0;
