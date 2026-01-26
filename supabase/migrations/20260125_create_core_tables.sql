-- Create ai_costs table (コスト追跡)
CREATE TABLE IF NOT EXISTS ai_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID, -- Optional reference to video
    service TEXT NOT NULL, -- 'gemini_script', 'gemini_image', 'google_tts', 'elevenlabs_tts', etc.
    model TEXT, -- Model name (e.g., 'gemini-2.0-flash')
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    characters INTEGER DEFAULT 0,
    images INTEGER DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    metadata JSONB, -- 追加情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to ai_costs if table exists (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_costs' AND column_name = 'video_id') THEN
        ALTER TABLE ai_costs ADD COLUMN video_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_costs' AND column_name = 'model') THEN
        ALTER TABLE ai_costs ADD COLUMN model TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_costs' AND column_name = 'input_tokens') THEN
        ALTER TABLE ai_costs ADD COLUMN input_tokens INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_costs' AND column_name = 'output_tokens') THEN
        ALTER TABLE ai_costs ADD COLUMN output_tokens INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_costs' AND column_name = 'characters') THEN
        ALTER TABLE ai_costs ADD COLUMN characters INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_costs' AND column_name = 'images') THEN
        ALTER TABLE ai_costs ADD COLUMN images INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create url_history table (URL履歴)
CREATE TABLE IF NOT EXISTS url_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table (管理者ユーザー)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create videos table (動画履歴) - if not exists
CREATE TABLE IF NOT EXISTS videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_data JSONB NOT NULL, -- VideoConfig全体
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create active_sessions table (アクティブユーザー追跡)
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for anonymous users
    ip_address TEXT UNIQUE, -- Used for upsert
    page_views INTEGER DEFAULT 1,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to active_sessions if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'ip_address') THEN
        ALTER TABLE active_sessions ADD COLUMN ip_address TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'active_sessions' AND column_name = 'page_views') THEN
        ALTER TABLE active_sessions ADD COLUMN page_views INTEGER DEFAULT 1;
    END IF;
    -- Make user_id nullable
    ALTER TABLE active_sessions ALTER COLUMN user_id DROP NOT NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_costs_user_id ON ai_costs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_url_history_user_id ON url_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON active_sessions(last_activity DESC);

-- Enable RLS
ALTER TABLE ai_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_costs
DROP POLICY IF EXISTS "Users can view their own costs" ON ai_costs;
CREATE POLICY "Users can view their own costs"
    ON ai_costs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own costs" ON ai_costs;
CREATE POLICY "Users can insert their own costs"
    ON ai_costs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for url_history
DROP POLICY IF EXISTS "Users can view their own url history" ON url_history;
CREATE POLICY "Users can view their own url history"
    ON url_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own url history" ON url_history;
CREATE POLICY "Users can insert their own url history"
    ON url_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own url history" ON url_history;
CREATE POLICY "Users can delete their own url history"
    ON url_history FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for admin_users
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;
CREATE POLICY "Users can view their own admin status"
    ON admin_users FOR SELECT
    USING (auth.uid() = id);

-- Note: Removed "Admins can view all admin users" policy to avoid circular dependency
-- Admin functionality can be implemented through a service role or database function if needed

-- RLS Policies for videos
DROP POLICY IF EXISTS "Users can view their own videos" ON videos;
CREATE POLICY "Users can view their own videos"
    ON videos FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own videos" ON videos;
CREATE POLICY "Users can insert their own videos"
    ON videos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own videos" ON videos;
CREATE POLICY "Users can update their own videos"
    ON videos FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own videos" ON videos;
CREATE POLICY "Users can delete their own videos"
    ON videos FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for active_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON active_sessions;
CREATE POLICY "Users can view their own sessions"
    ON active_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON active_sessions;
CREATE POLICY "Users can insert their own sessions"
    ON active_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON active_sessions;
CREATE POLICY "Users can update their own sessions"
    ON active_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON active_sessions;
CREATE POLICY "Users can delete their own sessions"
    ON active_sessions FOR DELETE
    USING (auth.uid() = user_id);
