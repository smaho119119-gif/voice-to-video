-- Users table (Demo friendly)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- Removed strict auth.users reference for demo/test users
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

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
INSERT INTO public.profiles (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Update test user with optional fields if columns exist
UPDATE public.profiles
SET username = 'test_user', full_name = 'テストユーザー'
WHERE id = '00000000-0000-0000-0000-000000000001' AND username IS NULL;

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

-- URL History table (instead of localStorage)
CREATE TABLE IF NOT EXISTS public.url_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AI Cost tracking table
CREATE TABLE IF NOT EXISTS public.ai_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  service TEXT NOT NULL, -- 'gemini_script', 'gemini_image', 'google_tts', 'elevenlabs_tts', 'gemini_tts'
  model TEXT, -- specific model used
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  characters INTEGER DEFAULT 0, -- for TTS
  images INTEGER DEFAULT 0, -- for image generation
  cost_usd DECIMAL(10, 6) DEFAULT 0, -- cost in USD
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin', -- admin, super_admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Active sessions table (track by IP)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_duration_seconds INTEGER DEFAULT 0, -- Total time spent
  page_views INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User usage statistics table
CREATE TABLE IF NOT EXISTS public.user_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  total_duration_seconds INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
CREATE POLICY "Users can insert own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own scenes" ON public.scenes;
CREATE POLICY "Users can view own scenes" ON public.scenes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.videos WHERE videos.id = scenes.video_id AND videos.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own scenes" ON public.scenes;
CREATE POLICY "Users can insert own scenes" ON public.scenes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.videos WHERE videos.id = scenes.video_id AND videos.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own url_history" ON public.url_history;
CREATE POLICY "Users can view own url_history" ON public.url_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own url_history" ON public.url_history;
CREATE POLICY "Users can insert own url_history" ON public.url_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own url_history" ON public.url_history;
CREATE POLICY "Users can delete own url_history" ON public.url_history
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own costs" ON public.ai_costs;
CREATE POLICY "Users can view own costs" ON public.ai_costs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own costs" ON public.ai_costs;
CREATE POLICY "Users can insert own costs" ON public.ai_costs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup (create profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets setup (run in Supabase Dashboard SQL Editor)
-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('video-images', 'video-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('video-audio', 'video-audio', true);

-- Storage policies
-- DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
-- CREATE POLICY "Users can upload images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'video-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
-- CREATE POLICY "Public can view images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'video-images');

-- DROP POLICY IF EXISTS "Users can upload audio" ON storage.objects;
-- CREATE POLICY "Users can upload audio" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'video-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DROP POLICY IF EXISTS "Public can view audio" ON storage.objects;
-- CREATE POLICY "Public can view audio" ON storage.objects
--   FOR SELECT USING (bucket_id = 'video-audio');
