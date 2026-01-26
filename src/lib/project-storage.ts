// Project Storage - API-based cross-device sync
// Uses /api/vg-projects route with service role key to bypass RLS issues

// Types
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

export interface ProjectSettings {
    ttsProvider: "google" | "elevenlabs" | "gemini";
    selectedVoiceId: string;
    imageModel: "flash" | "pro";
    aspectRatio: "16:9" | "9:16";
    generationMode: "auto" | "step";
    enableAvatar: boolean;
    avatarPosition: string;
    selectedAvatarId: string | null;
}

export interface Project {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    theme_text?: string;
    url_input?: string;
    aspect_ratio: "16:9" | "9:16";
    status: "draft" | "generating" | "completed" | "failed";
    generation_step: "idle" | "script" | "images" | "audio" | "preview" | "completed";
    current_scene_index: number;
    scenes?: SavedScene[];
    settings?: ProjectSettings;
    is_current: boolean;
    created_at: string;
    updated_at: string;
}

export interface ThemeHistoryItem {
    id: string;
    user_id: string;
    theme_text: string;
    input_mode: "theme" | "url" | "voice";
    project_id?: string;
    used_at: string;
    created_at: string;
}

// ============================================
// Project CRUD Operations - Uses /api/vg-projects
// ============================================

// Get or create current project for user
export async function getCurrentProject(userId: string): Promise<Project | null> {
    try {
        const response = await fetch(`/api/vg-projects?userId=${userId}&current=true`);
        if (!response.ok) {
            const error = await response.json();
            console.error("[Project] Error fetching current project:", error);
            return null;
        }
        const { project } = await response.json();
        return project as Project | null;
    } catch (error) {
        console.error("[Project] Failed to get current project:", error);
        return null;
    }
}

// Create a new project
export async function createProject(
    userId: string,
    data: {
        title?: string;
        theme_text?: string;
        url_input?: string;
        settings?: ProjectSettings;
    }
): Promise<Project | null> {
    try {
        const response = await fetch("/api/vg-projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                title: data.title,
                theme_text: data.theme_text,
                url_input: data.url_input,
                settings: data.settings,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("[Project] Error creating project:", error);
            return null;
        }

        const { project } = await response.json();
        console.log("[Project] Created new project:", project.id);
        return project as Project;
    } catch (error) {
        console.error("[Project] Failed to create project:", error);
        return null;
    }
}

// Update project (auto-save)
export async function updateProject(
    projectId: string,
    updates: Partial<Pick<Project, "title" | "theme_text" | "url_input" | "scenes" | "settings" | "generation_step" | "current_scene_index" | "status">>
): Promise<boolean> {
    try {
        const response = await fetch("/api/vg-projects", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, updates }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("[Project] Error updating project:", error);
            return false;
        }

        console.log("[Project] Updated:", projectId, Object.keys(updates));
        return true;
    } catch (error) {
        console.error("[Project] Failed to update project:", error);
        return false;
    }
}

// Save scenes to project (called after each scene generation)
export async function saveScenesToProject(
    projectId: string,
    scenes: SavedScene[],
    step: string,
    sceneIndex: number = 0
): Promise<boolean> {
    return updateProject(projectId, {
        scenes,
        generation_step: step as Project["generation_step"],
        current_scene_index: sceneIndex,
    });
}

// Get user's projects list
export async function getUserProjects(userId: string, limit: number = 20): Promise<Project[]> {
    try {
        const response = await fetch(`/api/vg-projects?userId=${userId}&limit=${limit}`);
        if (!response.ok) {
            const error = await response.json();
            console.error("[Project] Error fetching projects:", error);
            return [];
        }
        const { projects } = await response.json();
        return (projects || []) as Project[];
    } catch (error) {
        console.error("[Project] Failed to get projects:", error);
        return [];
    }
}

// Set project as current
export async function setCurrentProject(projectId: string, userId: string): Promise<boolean> {
    try {
        const response = await fetch("/api/vg-projects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, userId }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("[Project] Error setting current project:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("[Project] Failed to set current project:", error);
        return false;
    }
}

// Delete project
export async function deleteProject(projectId: string, userId: string): Promise<boolean> {
    try {
        const response = await fetch(`/api/vg-projects?projectId=${projectId}&userId=${userId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("[Project] Error deleting project:", error);
            return false;
        }

        return true;
    } catch (error) {
        console.error("[Project] Failed to delete project:", error);
        return false;
    }
}

// ============================================
// Theme History Operations (disabled until table is created)
// ============================================

export async function addThemeToHistory(
    userId: string,
    themeText: string,
    inputMode: "theme" | "url" | "voice" = "theme",
    projectId?: string
): Promise<boolean> {
    // Disabled - theme history requires vg_theme_history table
    return false;
}

export async function getThemeHistory(userId: string, limit: number = 50): Promise<ThemeHistoryItem[]> {
    // Disabled - theme history requires vg_theme_history table
    return [];
}

export async function deleteThemeFromHistory(themeId: string, userId: string): Promise<boolean> {
    return false;
}

export async function clearThemeHistory(userId: string): Promise<boolean> {
    return false;
}

// ============================================
// Auto-save Debounce Utility
// ============================================

let saveTimeout: NodeJS.Timeout | null = null;

export function debouncedSave(
    callback: () => Promise<void>,
    delayMs: number = 2000
): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
        try {
            await callback();
        } catch (error) {
            console.error("[AutoSave] Failed:", error);
        }
    }, delayMs);
}

export function flushPendingSave(): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
}
