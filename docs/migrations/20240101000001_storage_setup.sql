-- Storage setup for Kinship Atlas
-- This migration creates the storage bucket and policies for media uploads

-- Create family-media storage bucket for uploads
-- Note: Check if public column exists, if not use public column name that matches Supabase version
DO $$
BEGIN
    -- Try to insert with public column (older Supabase versions)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'storage' 
        AND table_name = 'buckets' 
        AND column_name = 'public'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('family-media', 'family-media', true)
        ON CONFLICT (id) DO NOTHING;
    -- Try with public_access column (newer Supabase versions)
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'storage' 
        AND table_name = 'buckets' 
        AND column_name = 'public_access'
    ) THEN
        INSERT INTO storage.buckets (id, name, public_access)
        VALUES ('family-media', 'family-media', 'public')
        ON CONFLICT (id) DO NOTHING;
    -- Fallback: just use id and name
    ELSE
        INSERT INTO storage.buckets (id, name)
        VALUES ('family-media', 'family-media')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Enable RLS on storage.objects if not already enabled
-- Note: This may fail if RLS is already enabled, which is fine
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN
        -- RLS might already be enabled, ignore the error
        NULL;
END $$;

-- Policy to allow authenticated users to upload files to family-media bucket
CREATE POLICY "Allow authenticated users to upload to family-media bucket" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'family-media');

-- Policy to allow public access to view family-media files
CREATE POLICY "Allow public access to view family-media files"
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'family-media');

-- Policy to allow authenticated users to update family-media files
CREATE POLICY "Allow authenticated users to update family-media files"
ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'family-media');

-- Policy to allow authenticated users to delete family-media files
CREATE POLICY "Allow authenticated users to delete family-media files"
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'family-media');
