-- Video Generator Project Sync Tables
-- Prefix: vg_ (video generator)

-- Create vg_projects table (動画プロジェクト同期用)
CREATE TABLE IF NOT EXISTS vg_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '新規プロジェクト',
    description TEXT,
    theme_text TEXT,
    url_input TEXT,
    aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
    generation_step TEXT DEFAULT 'idle' CHECK (generation_step IN ('idle', 'script', 'images', 'audio', 'preview', 'completed')),
    current_scene_index INTEGER DEFAULT 0,
    scenes JSONB, -- Full scenes data with images/audio URLs
    settings JSONB, -- TTS provider, image model, etc.
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vg_theme_history table (テーマ履歴)
CREATE TABLE IF NOT EXISTS vg_theme_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_text TEXT NOT NULL,
    input_mode TEXT DEFAULT 'theme' CHECK (input_mode IN ('theme', 'url', 'voice')),
    project_id UUID REFERENCES vg_projects(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vg_projects_user_id ON vg_projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vg_projects_is_current ON vg_projects(user_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_vg_theme_history_user_id ON vg_theme_history(user_id, used_at DESC);

-- Enable RLS
ALTER TABLE vg_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vg_theme_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vg_projects
DROP POLICY IF EXISTS "Users can view their own vg_projects" ON vg_projects;
CREATE POLICY "Users can view their own vg_projects"
    ON vg_projects FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own vg_projects" ON vg_projects;
CREATE POLICY "Users can insert their own vg_projects"
    ON vg_projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vg_projects" ON vg_projects;
CREATE POLICY "Users can update their own vg_projects"
    ON vg_projects FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vg_projects" ON vg_projects;
CREATE POLICY "Users can delete their own vg_projects"
    ON vg_projects FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for vg_theme_history
DROP POLICY IF EXISTS "Users can view their own vg_theme_history" ON vg_theme_history;
CREATE POLICY "Users can view their own vg_theme_history"
    ON vg_theme_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own vg_theme_history" ON vg_theme_history;
CREATE POLICY "Users can insert their own vg_theme_history"
    ON vg_theme_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vg_theme_history" ON vg_theme_history;
CREATE POLICY "Users can delete their own vg_theme_history"
    ON vg_theme_history FOR DELETE
    USING (auth.uid() = user_id);

-- Function to set only one project as current per user
CREATE OR REPLACE FUNCTION vg_set_current_project()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE vg_projects
        SET is_current = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one current project
DROP TRIGGER IF EXISTS trigger_vg_set_current_project ON vg_projects;
CREATE TRIGGER trigger_vg_set_current_project
    BEFORE INSERT OR UPDATE ON vg_projects
    FOR EACH ROW
    WHEN (NEW.is_current = true)
    EXECUTE FUNCTION vg_set_current_project();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION vg_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_vg_projects_updated_at ON vg_projects;
CREATE TRIGGER trigger_vg_projects_updated_at
    BEFORE UPDATE ON vg_projects
    FOR EACH ROW
    EXECUTE FUNCTION vg_update_updated_at_column();
