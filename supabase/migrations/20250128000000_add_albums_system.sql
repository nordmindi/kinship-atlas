-- Albums System Migration
-- This migration creates the albums system for organizing media around families, family members, and story categories
-- Created: 2025-01-28

-- Add category field to family_stories table for story categorization
ALTER TABLE public.family_stories
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create story_categories table for predefined story categories
CREATE TABLE IF NOT EXISTS public.story_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default story categories
INSERT INTO public.story_categories (name, description) VALUES
    ('Biography', 'Personal life stories and biographies'),
    ('Migration', 'Stories about family migration and journeys'),
    ('Heritage', 'Cultural heritage and traditions'),
    ('Memories', 'Personal memories and recollections'),
    ('Historical', 'Historical events and family history'),
    ('Other', 'Other types of stories')
ON CONFLICT (name) DO NOTHING;

-- Create albums table
CREATE TABLE IF NOT EXISTS public.albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create album_family_groups table (albums organized by family/family group)
CREATE TABLE IF NOT EXISTS public.album_family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, family_group_id)
);

-- Create album_family_members table (albums organized by family member)
CREATE TABLE IF NOT EXISTS public.album_family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, family_member_id)
);

-- Create album_story_categories table (albums organized by story category)
CREATE TABLE IF NOT EXISTS public.album_story_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    story_category_id UUID REFERENCES public.story_categories(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, story_category_id)
);

-- Create album_media table (many-to-many relationship between albums and media)
CREATE TABLE IF NOT EXISTS public.album_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, media_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_name ON public.albums(name);
CREATE INDEX IF NOT EXISTS idx_album_family_groups_album ON public.album_family_groups(album_id);
CREATE INDEX IF NOT EXISTS idx_album_family_groups_group ON public.album_family_groups(family_group_id);
CREATE INDEX IF NOT EXISTS idx_album_family_members_album ON public.album_family_members(album_id);
CREATE INDEX IF NOT EXISTS idx_album_family_members_member ON public.album_family_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_album_story_categories_album ON public.album_story_categories(album_id);
CREATE INDEX IF NOT EXISTS idx_album_story_categories_category ON public.album_story_categories(story_category_id);
CREATE INDEX IF NOT EXISTS idx_album_media_album ON public.album_media(album_id);
CREATE INDEX IF NOT EXISTS idx_album_media_media ON public.album_media(media_id);
CREATE INDEX IF NOT EXISTS idx_album_media_order ON public.album_media(album_id, display_order);
CREATE INDEX IF NOT EXISTS idx_family_stories_category ON public.family_stories(category);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.story_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_story_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for story_categories (read-only for all users)
CREATE POLICY "Users can view all story categories" ON public.story_categories
    FOR SELECT USING (true);

-- Create RLS policies for albums
CREATE POLICY "Users can view all albums" ON public.albums
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own albums" ON public.albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums" ON public.albums
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums" ON public.albums
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for album_family_groups
CREATE POLICY "Users can view all album family groups" ON public.album_family_groups
    FOR SELECT USING (true);

CREATE POLICY "Users can insert album family groups for their albums" ON public.album_family_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete album family groups for their albums" ON public.album_family_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for album_family_members
CREATE POLICY "Users can view all album family members" ON public.album_family_members
    FOR SELECT USING (true);

CREATE POLICY "Users can insert album family members for their albums" ON public.album_family_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete album family members for their albums" ON public.album_family_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for album_story_categories
CREATE POLICY "Users can view all album story categories" ON public.album_story_categories
    FOR SELECT USING (true);

CREATE POLICY "Users can insert album story categories for their albums" ON public.album_story_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete album story categories for their albums" ON public.album_story_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for album_media
CREATE POLICY "Users can view all album media" ON public.album_media
    FOR SELECT USING (true);

CREATE POLICY "Users can insert album media for their albums" ON public.album_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.media 
            WHERE id = media_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update album media for their albums" ON public.album_media
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete album media for their albums" ON public.album_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_albums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_albums_updated_at
    BEFORE UPDATE ON public.albums
    FOR EACH ROW
    EXECUTE FUNCTION update_albums_updated_at();

