-- Story Groups Migration
-- This migration adds the ability to assign family groups to stories
-- Created: 2025-01-25

-- Create story_groups table (many-to-many relationship between stories and family groups)
CREATE TABLE IF NOT EXISTS public.story_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES public.family_stories(id) ON DELETE CASCADE NOT NULL,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, family_group_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_story_groups_story ON public.story_groups(story_id);
CREATE INDEX IF NOT EXISTS idx_story_groups_group ON public.story_groups(family_group_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.story_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for story_groups
CREATE POLICY "Users can view all story groups" ON public.story_groups
    FOR SELECT USING (true);

CREATE POLICY "Users can insert story groups for their stories" ON public.story_groups
    FOR INSERT WITH CHECK (
        -- User must own the group
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        ) AND
        -- User must own the story (author_id)
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete story groups for their stories" ON public.story_groups
    FOR DELETE USING (
        -- User must own the story (author_id)
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

