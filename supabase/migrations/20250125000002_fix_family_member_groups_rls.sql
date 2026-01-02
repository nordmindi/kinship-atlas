-- Fix family_member_groups RLS policy to handle members with null user_id/created_by
-- This migration updates the RLS policies to allow assigning orphaned members to groups
-- Created: 2025-01-25

-- Drop the old RLS policies
DROP POLICY IF EXISTS "Users can insert family member groups for their members" ON public.family_member_groups;
DROP POLICY IF EXISTS "Users can delete family member groups for their members" ON public.family_member_groups;

-- Create updated RLS policies that handle both user_id and created_by, and allow orphaned members
CREATE POLICY "Users can insert family member groups for their members" ON public.family_member_groups
    FOR INSERT WITH CHECK (
        -- User must own the group
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        ) AND
        -- Member must either belong to user OR have no owner (null user_id and created_by)
        -- This allows assigning orphaned members to groups
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (
                user_id = auth.uid() 
                OR created_by = auth.uid()
                OR (user_id IS NULL AND created_by IS NULL)
            )
        )
    );

CREATE POLICY "Users can delete family member groups for their members" ON public.family_member_groups
    FOR DELETE USING (
        -- User must own the group (this is sufficient for deletion)
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        )
    );

