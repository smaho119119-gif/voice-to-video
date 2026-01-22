import { supabase } from "./supabase";

// AI Service cost rates (as of 2024)
export const COST_RATES = {
    // Gemini 2.0 Flash
    gemini_script: {
        name: "Gemini (台本生成)",
        inputPer1k: 0.000075, // $0.075 per 1M input tokens
        outputPer1k: 0.0003, // $0.30 per 1M output tokens
    },
    // Gemini 3 Pro Image (estimated)
    gemini_image: {
        name: "Gemini (画像生成)",
        perImage: 0.02, // $0.02 per image (estimated)
    },
    // Google Cloud TTS
    google_tts: {
        name: "Google TTS",
        perMillion: 4.0, // $4 per 1M characters (Neural2)
    },
    // ElevenLabs
    elevenlabs_tts: {
        name: "ElevenLabs TTS",
        perThousand: 0.30, // $0.30 per 1K characters
    },
    // Gemini TTS (via Gemini 2.0 Flash)
    gemini_tts: {
        name: "Gemini TTS",
        inputPer1k: 0.000075,
        outputPer1k: 0.0003,
    },
};

export interface CostEntry {
    service: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    characters?: number;
    images?: number;
    costUsd: number;
}

// Calculate cost for a specific service
export function calculateCost(entry: Omit<CostEntry, "costUsd">): number {
    let cost = 0;

    switch (entry.service) {
        case "gemini_script":
            cost =
                ((entry.inputTokens || 0) / 1000) * COST_RATES.gemini_script.inputPer1k +
                ((entry.outputTokens || 0) / 1000) * COST_RATES.gemini_script.outputPer1k;
            break;
        case "gemini_image":
            cost = (entry.images || 1) * COST_RATES.gemini_image.perImage;
            break;
        case "google_tts":
            cost = ((entry.characters || 0) / 1000000) * COST_RATES.google_tts.perMillion;
            break;
        case "elevenlabs_tts":
            cost = ((entry.characters || 0) / 1000) * COST_RATES.elevenlabs_tts.perThousand;
            break;
        case "gemini_tts":
            cost =
                ((entry.inputTokens || 0) / 1000) * COST_RATES.gemini_tts.inputPer1k +
                ((entry.outputTokens || 0) / 1000) * COST_RATES.gemini_tts.outputPer1k;
            break;
    }

    return Math.round(cost * 1000000) / 1000000; // Round to 6 decimal places
}

// Save cost entry to database
export async function saveCost(
    userId: string,
    videoId: string | null,
    entry: Omit<CostEntry, "costUsd">
): Promise<void> {
    const costUsd = calculateCost(entry);

    try {
        await supabase.from("ai_costs").insert({
            user_id: userId,
            video_id: videoId,
            service: entry.service,
            model: entry.model,
            input_tokens: entry.inputTokens || 0,
            output_tokens: entry.outputTokens || 0,
            characters: entry.characters || 0,
            images: entry.images || 0,
            cost_usd: costUsd,
        });
    } catch (error) {
        console.error("Failed to save cost:", error);
    }
}

// Get total costs for a user
export async function getUserTotalCosts(userId: string): Promise<{
    totalUsd: number;
    byService: Record<string, number>;
    thisMonth: number;
}> {
    try {
        const { data, error } = await supabase
            .from("ai_costs")
            .select("service, cost_usd, created_at")
            .eq("user_id", userId);

        if (error || !data) {
            return { totalUsd: 0, byService: {}, thisMonth: 0 };
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let totalUsd = 0;
        let thisMonth = 0;
        const byService: Record<string, number> = {};

        for (const entry of data) {
            const cost = Number(entry.cost_usd) || 0;
            totalUsd += cost;

            byService[entry.service] = (byService[entry.service] || 0) + cost;

            if (new Date(entry.created_at) >= startOfMonth) {
                thisMonth += cost;
            }
        }

        return {
            totalUsd: Math.round(totalUsd * 100) / 100,
            byService,
            thisMonth: Math.round(thisMonth * 100) / 100,
        };
    } catch (error) {
        console.error("Failed to get costs:", error);
        return { totalUsd: 0, byService: {}, thisMonth: 0 };
    }
}

// Get costs for a specific video
export async function getVideoCosts(videoId: string): Promise<CostEntry[]> {
    try {
        const { data, error } = await supabase
            .from("ai_costs")
            .select("*")
            .eq("video_id", videoId);

        if (error || !data) {
            return [];
        }

        return data.map((entry) => ({
            service: entry.service,
            model: entry.model,
            inputTokens: entry.input_tokens,
            outputTokens: entry.output_tokens,
            characters: entry.characters,
            images: entry.images,
            costUsd: Number(entry.cost_usd),
        }));
    } catch (error) {
        console.error("Failed to get video costs:", error);
        return [];
    }
}

// Format cost as Japanese Yen (approximate)
export function formatCostJPY(usd: number): string {
    const jpy = usd * 150; // Approximate USD to JPY rate
    if (jpy < 1) {
        return `約${Math.round(jpy * 100)}銭`;
    }
    return `約¥${Math.round(jpy).toLocaleString()}`;
}

// Format cost as USD
export function formatCostUSD(usd: number): string {
    if (usd < 0.01) {
        return `$${usd.toFixed(4)}`;
    }
    return `$${usd.toFixed(2)}`;
}
