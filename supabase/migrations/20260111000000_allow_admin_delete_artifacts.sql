-- Migration: Allow admins to delete artifacts
-- Description: Updates RLS policy to allow administrators to delete any artifact,
--              not just artifacts they own. Regular users can still only delete their own artifacts.
-- Date: 2026-01-11

-- Update the artifacts delete policy to allow admins
DROP POLICY IF EXISTS "Users can delete their own artifacts" ON public.artifacts;
CREATE POLICY "Users can delete their own artifacts" ON public.artifacts
    FOR DELETE USING (
        auth.uid() = owner_id OR
        public.is_user_admin(auth.uid())
    );
