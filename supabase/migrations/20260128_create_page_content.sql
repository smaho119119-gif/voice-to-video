-- Create vg_page_content table for storing editable LP content
CREATE TABLE IF NOT EXISTS vg_page_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_key TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vg_page_content_section_key ON vg_page_content(section_key);

-- Insert default content for LP sections
INSERT INTO vg_page_content (section_key, content) VALUES
    ('hero', '{
        "badge": "YouTube Shorts・TikTok・Reels向け動画を自動作成",
        "title_gradient": "テキストから動画を",
        "title_white": "自動生成",
        "description": "「睡眠の質を上げる方法」などテーマを入力 → AIが台本を作成 → 画像・ナレーション・字幕を自動生成 → 完成した動画をダウンロード。",
        "description_highlight": "編集スキル不要、最短1分で完成。",
        "cta_primary": "無料で動画を作成",
        "cta_secondary": "デモを見る",
        "hero_image": "/images/hero_ui_mockup.png"
    }'::jsonb),
    ('features', '{
        "title": "4つのAIが連携して動画を自動生成",
        "subtitle": "Premiere ProやAfter Effectsは不要。テーマを入力するだけで、4つのAIが連携して高品質な縦型動画を自動で作成します。",
        "items": [
            {
                "id": "script-ai",
                "title": "① 台本AI",
                "description": "Gemini/GPT-4が視聴者を引きつける構成の台本を自動生成。フック→本題→まとめの流れで離脱を防ぎます。",
                "image": "/images/feature_text_to_video.png",
                "gradient": "from-blue-500 to-purple-600"
            },
            {
                "id": "image-ai",
                "title": "② 画像生成AI",
                "description": "各シーンの内容に合わせた画像をDALL-E/Imagen等で自動生成。アニメ風・写実風など画風も選べます。",
                "image": "/images/feature_image_generation.png",
                "gradient": "from-purple-500 to-pink-600"
            },
            {
                "id": "voice-ai",
                "title": "③ 音声合成AI",
                "description": "Google/ElevenLabs/Gemini TTSで自然な日本語ナレーション。男女8種類以上の声から選択可能。",
                "image": "/images/feature_ai_narration.png",
                "gradient": "from-green-500 to-teal-600"
            },
            {
                "id": "video-composition",
                "title": "④ 動画合成",
                "description": "Remotionエンジンで画像・音声・字幕を合成。Ken Burns効果やトランジションで動きのある動画に。",
                "image": "/images/step_result_mobile.png",
                "gradient": "from-orange-500 to-red-600"
            }
        ]
    }'::jsonb),
    ('steps', '{
        "title": "3ステップで完成",
        "subtitle": "動画編集ソフトは一切不要。テーマを入力して待つだけ。",
        "items": [
            {
                "number": 1,
                "title": "テーマを入力",
                "description": "「ダイエット豆知識」「仕事効率化」など、テーマを入力。ブログURLを貼り付けて自動要約も可能。",
                "image": "/images/step_input_ui.png"
            },
            {
                "number": 2,
                "title": "AIが自動生成",
                "description": "Geminiが台本を書き、画像AIがシーンを描き、音声AIがナレーションを読み上げ。Remotionが全てを合成。",
                "image": "/images/step_processing_visual.png"
            },
            {
                "number": 3,
                "title": "MP4をダウンロード",
                "description": "1080×1920の縦型動画（MP4）をダウンロード。そのままYouTube Shorts・TikTok・Reelsに投稿可能。",
                "image": "/images/step_result_mobile.png"
            }
        ]
    }'::jsonb),
    ('stats', '{
        "items": [
            { "value": "1分〜", "label": "動画生成時間" },
            { "value": "1080p", "label": "縦型HD画質" },
            { "value": "8+", "label": "AI音声バリエーション" },
            { "value": "無制限", "label": "ローカル生成" }
        ]
    }'::jsonb),
    ('use_cases', '{
        "title": "こんな方におすすめ",
        "items": [
            {
                "title": "YouTuber / TikToker",
                "description": "短尺動画を大量に投稿したい方。毎日の投稿も楽々。",
                "features": ["ショート動画に最適", "一括生成可能", "トレンドに素早く対応"]
            },
            {
                "title": "マーケター",
                "description": "商品紹介や広告動画を素早く作成したい方。",
                "features": ["A/Bテスト用に量産", "多言語対応可能", "ブランドに合わせた編集"]
            },
            {
                "title": "教育者 / コンテンツクリエイター",
                "description": "解説動画や教材を効率的に作成したい方。",
                "features": ["わかりやすい構成", "字幕自動生成", "編集知識不要"]
            }
        ]
    }'::jsonb),
    ('cta', '{
        "title": "今すぐ動画を作ろう",
        "description": "テーマを入力 → 台本・画像・音声・字幕を自動生成 → MP4ダウンロード。編集スキル不要で、ショート動画の量産体制が整います。",
        "button_text": "無料で始める"
    }'::jsonb)
ON CONFLICT (section_key) DO NOTHING;

-- Enable RLS
ALTER TABLE vg_page_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access (LP is public)
CREATE POLICY "Public can read page content"
    ON vg_page_content FOR SELECT
    TO public
    USING (true);

-- Allow authenticated users with admin role to update
-- For now, allow any authenticated user to update (can restrict later)
CREATE POLICY "Authenticated users can update page content"
    ON vg_page_content FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can insert page content"
    ON vg_page_content FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION vg_update_page_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS vg_page_content_updated_at ON vg_page_content;
CREATE TRIGGER vg_page_content_updated_at
    BEFORE UPDATE ON vg_page_content
    FOR EACH ROW
    EXECUTE FUNCTION vg_update_page_content_timestamp();
