-- Fix locations RLS policy to allow access through family groups
-- This migration updates the locations table RLS policies to allow users to add locations
-- for family members that are in their family groups, not just members they own
-- Created: 2025-01-25

-- Drop the old locations RLS policies
DROP POLICY IF EXISTS "Users can insert locations for their family members" ON public.locations;
DROP POLICY IF EXISTS "Users can update locations for their family members" ON public.locations;
DROP POLICY IF EXISTS "Users can delete locations for their family members" ON public.locations;

-- Create new RLS policies that check ownership OR family group membership
CREATE POLICY "Users can insert locations for their family members" ON public.locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (
                -- User owns the member (either through user_id or created_by)
                user_id = auth.uid() 
                OR created_by = auth.uid()
                -- OR member is in a group owned by the user
                OR EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    INNER JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can update locations for their family members" ON public.locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (
                -- User owns the member (either through user_id or created_by)
                user_id = auth.uid() 
                OR created_by = auth.uid()
                -- OR member is in a group owned by the user
                OR EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    INNER JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can delete locations for their family members" ON public.locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (
                -- User owns the member (either through user_id or created_by)
                user_id = auth.uid() 
                OR created_by = auth.uid()
                -- OR member is in a group owned by the user
                OR EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    INNER JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

