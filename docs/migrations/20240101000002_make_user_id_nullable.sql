-- Make user_id fields nullable for seed data compatibility
-- This allows the seed data to be inserted without requiring existing users

-- Make user_id nullable in family_members
ALTER TABLE public.family_members ALTER COLUMN user_id DROP NOT NULL;

-- Make author_id nullable in family_stories  
ALTER TABLE public.family_stories ALTER COLUMN author_id DROP NOT NULL;

-- Make creator_id nullable in family_events
ALTER TABLE public.family_events ALTER COLUMN creator_id DROP NOT NULL;

-- Make user_id nullable in media
ALTER TABLE public.media ALTER COLUMN user_id DROP NOT NULL;
