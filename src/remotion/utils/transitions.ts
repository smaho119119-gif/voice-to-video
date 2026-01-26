import type { Scene, TransitionType } from "../MainVideo";

/**
 * Get transition type for a scene
 * Avoids consecutive same transitions for variety
 *
 * @param scene - Scene object with optional transition property
 * @param index - Scene index in sequence
 * @returns TransitionType for the scene
 */
export function getTransitionForScene(scene: Scene, index: number): TransitionType {
    // Use scene-specific transition if defined
    if (scene.transition) return scene.transition;

    // Default rotation pattern to avoid monotony
    const transitions: TransitionType[] = ["fade", "slide", "zoom", "fade"];
    return transitions[index % transitions.length];
}
