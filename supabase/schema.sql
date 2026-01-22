-- Users table (Demo friendly)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- Removed strict auth.users reference for demo/test users
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
  input_mode TEXT DEFAULT 'voice', -- voice, theme, url
  theme_text TEXT,
  source_url TEXT, -- URL for url-based generation
  transcribed_text TEXT,
  heygen_video_id TEXT,
  final_video_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  bgm_url TEXT, -- Background music URL
  bgm_volume REAL DEFAULT 0.15, -- BGM volume (0-1)
  voice_id TEXT DEFAULT 'ja-JP-Neural2-C', -- TTS voice ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add new columns if table exists (for migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'source_url') THEN
    ALTER TABLE public.videos ADD COLUMN source_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'bgm_url') THEN
    ALTER TABLE public.videos ADD COLUMN bgm_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'bgm_volume') THEN
    ALTER TABLE public.videos ADD COLUMN bgm_volume REAL DEFAULT 0.15;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'voice_id') THEN
    ALTER TABLE public.videos ADD COLUMN voice_id TEXT DEFAULT 'ja-JP-Neural2-C';
  END IF;
END $$;

-- Create test user for demo (using a fixed UUID)
INSERT INTO public.profiles (id, username, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'test_user', 'テストユーザー')
ON CONFLICT (id) DO NOTHING;

-- Scenes table (JSON metadata for each scene)
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  scene_index INTEGER NOT NULL,
  avatar_script TEXT,
  subtitle TEXT,
  image_prompt TEXT,
  image_url TEXT,
  audio_url TEXT,
  heygen_video_url TEXT,
  duration INTEGER DEFAULT 5,
  emotion TEXT DEFAULT 'neutral', -- neutral, happy, serious, excited, thoughtful
  sound_effects JSONB DEFAULT '[]'::jsonb, -- Array of {type, keyword, timing, volume, url}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
