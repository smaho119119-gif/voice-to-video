-- Create storage buckets for video images and audio
-- Run this in Supabase SQL Editor

-- Create video-images bucket (public - images need to be accessible for video rendering)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'video-images',
    'video-images',
    true,
    52428800,  -- 50MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create video-audio bucket (public - audio needs to be accessible for video rendering)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'video-audio',
    'video-audio',
    true,
    104857600,  -- 100MB limit
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create avatars bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    52428800,  -- 50MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video-images bucket
DROP POLICY IF EXISTS "Anyone can view video images" ON storage.objects;
CREATE POLICY "Anyone can view video images"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-images');

DROP POLICY IF EXISTS "Authenticated users can upload video images" ON storage.objects;
CREATE POLICY "Authenticated users can upload video images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'video-images'
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

DROP POLICY IF EXISTS "Users can delete their own video images" ON storage.objects;
CREATE POLICY "Users can delete their own video images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'video-images'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
);

-- Storage policies for video-audio bucket
DROP POLICY IF EXISTS "Anyone can view video audio" ON storage.objects;
CREATE POLICY "Anyone can view video audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-audio');

DROP POLICY IF EXISTS "Authenticated users can upload video audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload video audio"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'video-audio'
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

DROP POLICY IF EXISTS "Users can delete their own video audio" ON storage.objects;
CREATE POLICY "Users can delete their own video audio"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'video-audio'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
);

-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Add URL history table if not exists
CREATE TABLE IF NOT EXISTS url_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, url)
);

-- Enable RLS on url_history
ALTER TABLE url_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for url_history
DROP POLICY IF EXISTS "Users can view their own URL history" ON url_history;
CREATE POLICY "Users can view their own URL history"
ON url_history FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own URL history" ON url_history;
CREATE POLICY "Users can insert their own URL history"
ON url_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own URL history" ON url_history;
CREATE POLICY "Users can update their own URL history"
ON url_history FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own URL history" ON url_history;
CREATE POLICY "Users can delete their own URL history"
ON url_history FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_url_history_user_id ON url_history(user_id, created_at DESC);
