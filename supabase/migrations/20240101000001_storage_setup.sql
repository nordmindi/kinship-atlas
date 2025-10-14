-- Storage setup for Kinship Atlas
-- This migration creates the storage bucket and policies for media uploads

-- Create family-media storage bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-media', 'family-media', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
