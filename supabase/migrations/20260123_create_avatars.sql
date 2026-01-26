-- Create avatars table
CREATE TABLE IF NOT EXISTS avatars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    original_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('uploaded', 'ai_generated')),
    ai_provider TEXT CHECK (ai_provider IN ('nanobanapro', 'dalle', 'stable_diffusion')),
    prompt TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_avatars_created_at ON avatars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avatars_favorite ON avatars(user_id, is_favorite DESC);

-- Enable RLS
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own avatars"
    ON avatars FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatars"
    ON avatars FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatars"
    ON avatars FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatars"
    ON avatars FOR DELETE
    USING (auth.uid() = user_id);

-- Create avatars storage bucket (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars bucket
-- CREATE POLICY "Users can upload their own avatars"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Avatars are publicly accessible"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'avatars');

-- CREATE POLICY "Users can delete their own avatars"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
