-- Fix locations RLS policy to use created_by instead of user_id
-- This migration updates the locations table RLS policies to work with the new role-based system

-- Drop the old locations RLS policies
DROP POLICY IF EXISTS "Users can insert locations for their family members" ON public.locations;
DROP POLICY IF EXISTS "Users can update locations for their family members" ON public.locations;
DROP POLICY IF EXISTS "Users can delete locations for their family members" ON public.locations;

-- Create new simplified RLS policies for locations that work with the current system
CREATE POLICY "Users can insert locations for their family members" ON public.locations
    FOR INSERT WITH CHECK (
        -- Users can insert locations for family members they created
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update locations for their family members" ON public.locations
    FOR UPDATE USING (
        -- Users can update locations for family members they created
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete locations for their family members" ON public.locations
    FOR DELETE USING (
        -- Users can delete locations for family members they created
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );
