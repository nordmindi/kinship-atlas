-- Fix RLS policy for family_stories to allow creators to see their own stories
-- This fixes the issue where story creation succeeds but the creator can't see the story immediately
-- Created: 2025-01-26

-- Update the SELECT policy to allow:
-- 1. Users with admin/editor/viewer roles (existing behavior)
-- 2. Users who are the author of the story (new - allows creators to see their own stories)
DROP POLICY IF EXISTS "Users can view all stories" ON public.family_stories;
CREATE POLICY "Users can view all stories" ON public.family_stories
    FOR SELECT USING (
        -- Users with proper roles can view all stories
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
        ) OR
        -- Users can always view stories they created (author_id)
        author_id = auth.uid()
    );

