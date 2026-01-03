-- Fix RLS policy for family_stories INSERT to allow editors to create stories
-- This ensures that both admins and editors can create stories
-- Created: 2025-01-26

-- Drop the old INSERT policy that only checks author_id
DROP POLICY IF EXISTS "Users can insert their own family stories" ON public.family_stories;
DROP POLICY IF EXISTS "Admins and editors can create stories" ON public.family_stories;

-- Create new INSERT policy that allows admins and editors to create stories
CREATE POLICY "Admins and editors can create stories" ON public.family_stories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Also update the UPDATE policy to ensure it's correct
DROP POLICY IF EXISTS "Users can update their own family stories" ON public.family_stories;
DROP POLICY IF EXISTS "Admins and editors can update stories" ON public.family_stories;

CREATE POLICY "Admins and editors can update stories" ON public.family_stories
    FOR UPDATE USING (
        -- Admins can update any story
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Editors can update their own stories
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'editor'
            ) AND author_id = auth.uid()
        )
    );

-- Update DELETE policy to ensure only admins can delete
DROP POLICY IF EXISTS "Users can delete their own family stories" ON public.family_stories;
DROP POLICY IF EXISTS "Only admins can delete stories" ON public.family_stories;

CREATE POLICY "Only admins can delete stories" ON public.family_stories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

