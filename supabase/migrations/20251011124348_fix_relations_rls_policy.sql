-- Fix RLS policy for relations table to allow bidirectional relationships
-- The current policy only allows inserting relations where from_member_id belongs to current user
-- This prevents creating reverse relationships (e.g., child->parent when parent->child is created)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert relations for their family members" ON public.relations;

-- Create a new policy that allows inserting relations if EITHER member belongs to the current user
-- This allows bidirectional relationships to be created properly
CREATE POLICY "Users can insert relations involving their family members" ON public.relations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = from_member_id AND user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = to_member_id AND user_id = auth.uid()
        )
    );

-- Also update the delete policy to be consistent
DROP POLICY IF EXISTS "Users can delete relations for their family members" ON public.relations;

CREATE POLICY "Users can delete relations involving their family members" ON public.relations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = from_member_id AND user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = to_member_id AND user_id = auth.uid()
        )
    );
