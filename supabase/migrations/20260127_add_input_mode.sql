-- Add missing columns to videos table
DO $$
BEGIN
  -- input_mode
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'input_mode') THEN
    ALTER TABLE public.videos ADD COLUMN input_mode TEXT DEFAULT 'voice';
  END IF;
  -- tags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'tags') THEN
    ALTER TABLE public.videos ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
  END IF;
  -- theme_text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'theme_text') THEN
    ALTER TABLE public.videos ADD COLUMN theme_text TEXT;
  END IF;
  -- source_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'source_url') THEN
    ALTER TABLE public.videos ADD COLUMN source_url TEXT;
  END IF;
  -- transcribed_text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcribed_text') THEN
    ALTER TABLE public.videos ADD COLUMN transcribed_text TEXT;
  END IF;
  -- bgm_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'bgm_url') THEN
    ALTER TABLE public.videos ADD COLUMN bgm_url TEXT;
  END IF;
  -- bgm_volume
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'bgm_volume') THEN
    ALTER TABLE public.videos ADD COLUMN bgm_volume REAL DEFAULT 0.15;
  END IF;
END $$;
