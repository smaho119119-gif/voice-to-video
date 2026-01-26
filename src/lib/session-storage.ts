// Session Storage for Video Generation State
// Uses LocalStorage for persistence across page reloads

const STORAGE_KEY = "video_generation_session";
const STORAGE_VERSION = 1;

// Types matching page.tsx
export interface SavedScene {
    duration: number;
    avatar_script: string;
    subtitle: string;
    image_prompt: string;
    imageUrl?: string;
    audioUrl?: string;
    lipSyncVideoUrl?: string;
    sound_effects?: any[];
    emotion?: string;
    transition?: string;
    emphasis_words?: string[];
}

export interface SavedVideoConfig {
    title: string;
    scenes: SavedScene[];
    bgm?: { url: string; volume: number };
    aspectRatio: "16:9" | "9:16";
    opening?: { enabled: boolean; duration?: number; subtitle?: string };
    ending?: { enabled: boolean; duration?: number; callToAction?: string; channelName?: string };
    avatar?: { enabled: boolean; position?: string; size?: string; imageUrl?: string };
    textOnly?: boolean;
}

export interface SessionState {
    version: number;
    savedAt: string;
    // Generation progress
    generationStep: "idle" | "script" | "images" | "audio" | "preview";
    currentSceneIndex: number;
    // Video config
    videoConfig: SavedVideoConfig | null;
    // Input data
    inputMode: "voice" | "theme" | "url";
    themeText: string;
    urlInput: string;
    transcribedText: string;
    // Settings
    ttsProvider: "google" | "elevenlabs" | "gemini";
    selectedVoiceId: string;
    imageModel: "flash" | "pro";
    aspectRatio: "16:9" | "9:16";
    generationMode: "auto" | "step";
    // Avatar settings
    enableAvatar: boolean;
    avatarPosition: string;
    selectedAvatarId: string | null;
}

// Check if we're in browser
const isBrowser = typeof window !== "undefined";

// Save session state to LocalStorage
export function saveSession(state: Partial<SessionState>): void {
    if (!isBrowser) return;

    try {
        const existing = loadSession();
        const newState: SessionState = {
            ...getDefaultState(),
            ...existing,
            ...state,
            version: STORAGE_VERSION,
            savedAt: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        console.log("[Session] Saved:", newState.generationStep, "scenes:", newState.videoConfig?.scenes?.length || 0);
    } catch (error) {
        console.error("[Session] Failed to save:", error);
    }
}

// Load session state from LocalStorage
export function loadSession(): SessionState | null {
    if (!isBrowser) return null;

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;

        const state = JSON.parse(data) as SessionState;

        // Version check - clear if outdated
        if (state.version !== STORAGE_VERSION) {
            console.log("[Session] Version mismatch, clearing old data");
            clearSession();
            return null;
        }

        console.log("[Session] Loaded:", state.generationStep, "scenes:", state.videoConfig?.scenes?.length || 0);
        return state;
    } catch (error) {
        console.error("[Session] Failed to load:", error);
        return null;
    }
}

// Clear session data
export function clearSession(): void {
    if (!isBrowser) return;

    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log("[Session] Cleared");
    } catch (error) {
        console.error("[Session] Failed to clear:", error);
    }
}

// Check if there's a resumable session
export function hasResumableSession(): boolean {
    const session = loadSession();
    if (!session) return false;

    // Has actual content to resume
    const hasScenes = session.videoConfig?.scenes && session.videoConfig.scenes.length > 0;
    const hasProgress = session.generationStep !== "idle";
    const hasInput = session.themeText || session.urlInput || session.transcribedText;

    return hasScenes || hasProgress || !!hasInput;
}

// Get session summary for display
export function getSessionSummary(): {
    hasSession: boolean;
    savedAt: string | null;
    sceneCount: number;
    completedImages: number;
    completedAudio: number;
    step: string;
    title: string;
} {
    const session = loadSession();
    if (!session) {
        return {
            hasSession: false,
            savedAt: null,
            sceneCount: 0,
            completedImages: 0,
            completedAudio: 0,
            step: "idle",
            title: "",
        };
    }

    const scenes = session.videoConfig?.scenes || [];
    const completedImages = scenes.filter(s => s.imageUrl).length;
    const completedAudio = scenes.filter(s => s.audioUrl).length;

    return {
        hasSession: true,
        savedAt: session.savedAt,
        sceneCount: scenes.length,
        completedImages,
        completedAudio,
        step: session.generationStep,
        title: session.videoConfig?.title || "",
    };
}

// Default state
function getDefaultState(): SessionState {
    return {
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        generationStep: "idle",
        currentSceneIndex: 0,
        videoConfig: null,
        inputMode: "theme",
        themeText: "",
        urlInput: "",
        transcribedText: "",
        ttsProvider: "google",
        selectedVoiceId: "ja-JP-Neural2-C",
        imageModel: "flash",
        aspectRatio: "16:9",
        generationMode: "auto",
        enableAvatar: false,
        avatarPosition: "left",
        selectedAvatarId: null,
    };
}

// Auto-save helper - call this after each significant change
export function autoSaveVideoConfig(videoConfig: SavedVideoConfig, step: string, sceneIndex: number = 0): void {
    saveSession({
        videoConfig,
        generationStep: step as SessionState["generationStep"],
        currentSceneIndex: sceneIndex,
    });
}

// Save settings only
export function saveSettings(settings: {
    ttsProvider?: SessionState["ttsProvider"];
    selectedVoiceId?: string;
    imageModel?: SessionState["imageModel"];
    aspectRatio?: SessionState["aspectRatio"];
    generationMode?: SessionState["generationMode"];
    enableAvatar?: boolean;
    avatarPosition?: string;
    selectedAvatarId?: string | null;
}): void {
    saveSession(settings);
}

// Save input data only
export function saveInputData(input: {
    inputMode?: SessionState["inputMode"];
    themeText?: string;
    urlInput?: string;
    transcribedText?: string;
}): void {
    saveSession(input);
}
