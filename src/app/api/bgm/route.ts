import { NextRequest, NextResponse } from "next/server";

// Preset BGM tracks from royalty-free sources (Pixabay)
const PRESET_BGM: Record<string, { url: string; duration: number; mood: string; description: string }> = {
    // Upbeat / Energetic
    "upbeat-corporate": {
        url: "https://cdn.pixabay.com/audio/2022/10/25/audio_5d4a23e8f8.mp3",
        duration: 120,
        mood: "upbeat",
        description: "明るいコーポレート系BGM"
    },
    "happy-positive": {
        url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
        duration: 150,
        mood: "happy",
        description: "ポジティブで楽しい雰囲気"
    },
    "energetic-tech": {
        url: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3",
        duration: 180,
        mood: "energetic",
        description: "テック系・スタートアップ向け"
    },

    // Calm / Relaxing
    "calm-ambient": {
        url: "https://cdn.pixabay.com/audio/2022/03/10/audio_8a84ee46a4.mp3",
        duration: 200,
        mood: "calm",
        description: "落ち着いたアンビエント"
    },
    "peaceful-piano": {
        url: "https://cdn.pixabay.com/audio/2022/08/31/audio_419263eb12.mp3",
        duration: 180,
        mood: "peaceful",
        description: "穏やかなピアノ曲"
    },
    "soft-inspirational": {
        url: "https://cdn.pixabay.com/audio/2022/05/16/audio_3dbb1c9a5f.mp3",
        duration: 160,
        mood: "inspirational",
        description: "柔らかいインスピレーション系"
    },

    // Professional / Corporate
    "corporate-success": {
        url: "https://cdn.pixabay.com/audio/2022/11/22/audio_a1bd950e7f.mp3",
        duration: 140,
        mood: "professional",
        description: "プロフェッショナル・ビジネス向け"
    },
    "modern-business": {
        url: "https://cdn.pixabay.com/audio/2022/09/07/audio_3bd44be9c5.mp3",
        duration: 150,
        mood: "modern",
        description: "モダンなビジネス向けBGM"
    },

    // Educational / Tutorial
    "tutorial-friendly": {
        url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8bac26898d.mp3",
        duration: 180,
        mood: "friendly",
        description: "教育・チュートリアル向け"
    },
    "learning-focus": {
        url: "https://cdn.pixabay.com/audio/2023/01/19/audio_d7f4d0f0a1.mp3",
        duration: 200,
        mood: "focus",
        description: "集中・学習向けBGM"
    },

    // News / Information
    "news-broadcast": {
        url: "https://cdn.pixabay.com/audio/2022/10/18/audio_ea5e2d1b9a.mp3",
        duration: 120,
        mood: "news",
        description: "ニュース・情報番組風"
    },

    // Cinematic
    "cinematic-inspiring": {
        url: "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3",
        duration: 180,
        mood: "cinematic",
        description: "シネマティック・感動系"
    },
    "epic-adventure": {
        url: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fa58895.mp3",
        duration: 200,
        mood: "epic",
        description: "壮大なアドベンチャー風"
    }
};

// Mood to BGM mapping based on content style
const STYLE_TO_MOOD: Record<string, string[]> = {
    "educational": ["tutorial-friendly", "learning-focus", "calm-ambient"],
    "entertainment": ["upbeat-corporate", "happy-positive", "energetic-tech"],
    "news": ["news-broadcast", "corporate-success", "modern-business"],
    "summary": ["soft-inspirational", "peaceful-piano", "calm-ambient"],
    "storytelling": ["cinematic-inspiring", "epic-adventure", "soft-inspirational"],
    "tutorial": ["tutorial-friendly", "learning-focus", "peaceful-piano"],
    "corporate": ["corporate-success", "modern-business", "upbeat-corporate"],
    "tech": ["energetic-tech", "modern-business", "upbeat-corporate"],
    "relaxing": ["calm-ambient", "peaceful-piano", "soft-inspirational"]
};

function selectBGMForStyle(style: string): string {
    const moods = STYLE_TO_MOOD[style] || STYLE_TO_MOOD["educational"];
    // Randomly select from appropriate moods
    const selectedMood = moods[Math.floor(Math.random() * moods.length)];
    return selectedMood;
}

export async function POST(req: NextRequest) {
    try {
        const { style = "educational", mood, videoDuration = 60 } = await req.json();

        // If specific mood requested, try to match it
        let selectedBGM: string;

        if (mood && PRESET_BGM[mood]) {
            selectedBGM = mood;
        } else {
            // Auto-select based on style
            selectedBGM = selectBGMForStyle(style);
        }

        const bgm = PRESET_BGM[selectedBGM];

        if (!bgm) {
            // Fallback to default
            const fallback = PRESET_BGM["tutorial-friendly"];
            return NextResponse.json({
                success: true,
                bgm: {
                    key: "tutorial-friendly",
                    url: fallback.url,
                    duration: fallback.duration,
                    mood: fallback.mood,
                    description: fallback.description,
                    recommendedVolume: 0.15
                }
            });
        }

        // Recommend volume based on whether it's primary or background
        // Lower volume for narration-heavy videos
        const recommendedVolume = 0.15; // 15% volume for background

        return NextResponse.json({
            success: true,
            bgm: {
                key: selectedBGM,
                url: bgm.url,
                duration: bgm.duration,
                mood: bgm.mood,
                description: bgm.description,
                recommendedVolume
            }
        });

    } catch (error: any) {
        console.error("BGM Selection Error:", error);
        return NextResponse.json(
            { error: "Failed to select BGM", details: error.message },
            { status: 500 }
        );
    }
}

// GET endpoint to list available BGM
export async function GET() {
    const categories: Record<string, string[]> = {
        upbeat: ["upbeat-corporate", "happy-positive", "energetic-tech"],
        calm: ["calm-ambient", "peaceful-piano", "soft-inspirational"],
        professional: ["corporate-success", "modern-business", "news-broadcast"],
        educational: ["tutorial-friendly", "learning-focus"],
        cinematic: ["cinematic-inspiring", "epic-adventure"]
    };

    return NextResponse.json({
        presets: PRESET_BGM,
        categories,
        styleMapping: STYLE_TO_MOOD
    });
}
