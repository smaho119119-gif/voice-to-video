import { NextRequest, NextResponse } from "next/server";

// Preset sound effects (base64 would be too large, so we use URLs from free sources)
// These are royalty-free sounds from various sources
const PRESET_SOUNDS: Record<string, { url: string; duration: number; description: string }> = {
    // Transition sounds
    "whoosh": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9b87b9.mp3",
        duration: 0.5,
        description: "Quick whoosh transition"
    },
    "pop": {
        url: "https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3",
        duration: 0.3,
        description: "Pop sound"
    },
    "swipe": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749bf9a.mp3",
        duration: 0.4,
        description: "Swipe transition"
    },

    // Action sounds
    "keyboard typing": {
        url: "https://cdn.pixabay.com/audio/2022/11/17/audio_fe5e4b5c9f.mp3",
        duration: 2.0,
        description: "Keyboard typing sounds"
    },
    "mouse click": {
        url: "https://cdn.pixabay.com/audio/2022/03/10/audio_ccd23e9a9a.mp3",
        duration: 0.2,
        description: "Mouse click"
    },
    "page turn": {
        url: "https://cdn.pixabay.com/audio/2022/03/19/audio_c46e5a5b07.mp3",
        duration: 0.5,
        description: "Page turning"
    },
    "writing": {
        url: "https://cdn.pixabay.com/audio/2022/10/30/audio_1a8e4ae25f.mp3",
        duration: 1.5,
        description: "Writing with pen"
    },

    // Emotion sounds
    "success chime": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8d68898b6a.mp3",
        duration: 1.0,
        description: "Success/achievement sound"
    },
    "success": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8d68898b6a.mp3",
        duration: 1.0,
        description: "Success sound"
    },
    "fail buzzer": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8bde932b6d.mp3",
        duration: 0.8,
        description: "Failure/error buzzer"
    },
    "error": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8bde932b6d.mp3",
        duration: 0.8,
        description: "Error sound"
    },
    "notification": {
        url: "https://cdn.pixabay.com/audio/2022/03/24/audio_51c7f579f6.mp3",
        duration: 0.6,
        description: "Notification ding"
    },
    "suspense": {
        url: "https://cdn.pixabay.com/audio/2022/05/16/audio_51cd7f6bae.mp3",
        duration: 3.0,
        description: "Suspenseful tone"
    },
    "applause": {
        url: "https://cdn.pixabay.com/audio/2022/03/12/audio_b6a5e5c2f1.mp3",
        duration: 3.0,
        description: "Audience applause"
    },

    // Ambient sounds
    "office ambient": {
        url: "https://cdn.pixabay.com/audio/2022/08/04/audio_884fe79d24.mp3",
        duration: 10.0,
        description: "Office background noise"
    },
    "nature ambient": {
        url: "https://cdn.pixabay.com/audio/2022/06/07/audio_b96a5d1be7.mp3",
        duration: 10.0,
        description: "Nature/forest sounds"
    },
    "city ambient": {
        url: "https://cdn.pixabay.com/audio/2022/05/27/audio_c38f8b9b22.mp3",
        duration: 10.0,
        description: "City background"
    },
    "cafe ambient": {
        url: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fa58895.mp3",
        duration: 10.0,
        description: "Coffee shop ambiance"
    },

    // Tech sounds
    "digital": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_bf8e932b7d.mp3",
        duration: 0.5,
        description: "Digital/tech beep"
    },
    "loading": {
        url: "https://cdn.pixabay.com/audio/2022/10/09/audio_32eb7d4c3b.mp3",
        duration: 1.0,
        description: "Loading/processing"
    },
    "complete": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8d68898b6a.mp3",
        duration: 0.8,
        description: "Task complete"
    }
};

// Keyword mapping for fuzzy matching
const KEYWORD_ALIASES: Record<string, string> = {
    "typing": "keyboard typing",
    "type": "keyboard typing",
    "click": "mouse click",
    "clicking": "mouse click",
    "ding": "notification",
    "bell": "notification",
    "chime": "success chime",
    "win": "success",
    "lose": "fail buzzer",
    "failure": "fail buzzer",
    "wrong": "fail buzzer",
    "correct": "success",
    "right": "success",
    "clap": "applause",
    "clapping": "applause",
    "office": "office ambient",
    "work": "office ambient",
    "forest": "nature ambient",
    "birds": "nature ambient",
    "outdoor": "nature ambient",
    "street": "city ambient",
    "traffic": "city ambient",
    "coffee": "cafe ambient",
    "restaurant": "cafe ambient",
    "beep": "digital",
    "computer": "digital",
    "tech": "digital",
    "transition": "whoosh",
    "slide": "swipe",
    "appear": "pop",
    "show": "pop"
};

function findBestMatch(keyword: string): string | null {
    const lowerKeyword = keyword.toLowerCase();

    // Direct match
    if (PRESET_SOUNDS[lowerKeyword]) {
        return lowerKeyword;
    }

    // Alias match
    if (KEYWORD_ALIASES[lowerKeyword]) {
        return KEYWORD_ALIASES[lowerKeyword];
    }

    // Partial match in preset keys
    for (const key of Object.keys(PRESET_SOUNDS)) {
        if (key.includes(lowerKeyword) || lowerKeyword.includes(key)) {
            return key;
        }
    }

    // Partial match in aliases
    for (const [alias, target] of Object.entries(KEYWORD_ALIASES)) {
        if (alias.includes(lowerKeyword) || lowerKeyword.includes(alias)) {
            return target;
        }
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const { keyword, type } = await req.json();

        if (!keyword) {
            return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
        }

        // Try to find in presets first
        const matchedKey = findBestMatch(keyword);

        if (matchedKey && PRESET_SOUNDS[matchedKey]) {
            const sound = PRESET_SOUNDS[matchedKey];
            return NextResponse.json({
                success: true,
                source: "preset",
                keyword: keyword,
                matched: matchedKey,
                sound: {
                    url: sound.url,
                    duration: sound.duration,
                    description: sound.description
                }
            });
        }

        // If Freesound API key is available, try external search
        if (process.env.FREESOUND_API_KEY) {
            try {
                const freesoundResult = await searchFreesound(keyword);
                if (freesoundResult) {
                    return NextResponse.json({
                        success: true,
                        source: "freesound",
                        keyword: keyword,
                        sound: freesoundResult
                    });
                }
            } catch (err) {
                console.error("Freesound search failed:", err);
            }
        }

        // Fallback: return a generic transition sound based on type
        const fallbackMap: Record<string, string> = {
            "ambient": "office ambient",
            "action": "pop",
            "transition": "whoosh",
            "emotion": "notification"
        };

        const fallbackKey = fallbackMap[type] || "whoosh";
        const fallbackSound = PRESET_SOUNDS[fallbackKey];

        return NextResponse.json({
            success: true,
            source: "fallback",
            keyword: keyword,
            matched: fallbackKey,
            sound: {
                url: fallbackSound.url,
                duration: fallbackSound.duration,
                description: `Fallback: ${fallbackSound.description}`
            }
        });

    } catch (error: any) {
        console.error("Sound Effects Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch sound effect", details: error.message },
            { status: 500 }
        );
    }
}

async function searchFreesound(query: string): Promise<{ url: string; duration: number; description: string } | null> {
    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(
        `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&fields=id,name,duration,previews&page_size=1&filter=duration:[0 TO 5]`,
        {
            headers: {
                "Authorization": `Token ${apiKey}`
            }
        }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.results && data.results.length > 0) {
        const sound = data.results[0];
        return {
            url: sound.previews?.["preview-hq-mp3"] || sound.previews?.["preview-lq-mp3"],
            duration: sound.duration,
            description: sound.name
        };
    }

    return null;
}

// GET endpoint to list available preset sounds
export async function GET() {
    const categories: Record<string, string[]> = {
        transition: ["whoosh", "pop", "swipe"],
        action: ["keyboard typing", "mouse click", "page turn", "writing"],
        emotion: ["success chime", "fail buzzer", "notification", "suspense", "applause"],
        ambient: ["office ambient", "nature ambient", "city ambient", "cafe ambient"],
        tech: ["digital", "loading", "complete"]
    };

    return NextResponse.json({
        presets: PRESET_SOUNDS,
        categories,
        freesoundEnabled: !!process.env.FREESOUND_API_KEY
    });
}
