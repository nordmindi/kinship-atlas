-- Fix locations RLS policy to check both user_id and created_by
-- This migration updates the locations table RLS policies to work with both ownership models
-- Created: 2025-01-25

-- Drop the old locations RLS policies
DROP POLICY IF EXISTS "Users can insert locations for their family members" ON public.locations;
DROP POLICY IF EXISTS "Users can update locations for their family members" ON public.locations;
DROP POLICY IF EXISTS "Users can delete locations for their family members" ON public.locations;

-- Create new RLS policies that check both user_id and created_by
CREATE POLICY "Users can insert locations for their family members" ON public.locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

CREATE POLICY "Users can update locations for their family members" ON public.locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

CREATE POLICY "Users can delete locations for their family members" ON public.locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (user_id = auth.uid() OR created_by = auth.uid())
        )
    );

