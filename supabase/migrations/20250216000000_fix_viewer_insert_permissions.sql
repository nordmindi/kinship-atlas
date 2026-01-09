-- Fix security issue: Prevent viewers from inserting family members
-- Created: 2025-02-16
-- 
-- ISSUE: The previous RLS policy allowed ANY authenticated user (including viewers)
-- to insert family members when created_by = auth.uid(). This violates the intended
-- permission model where viewers should be read-only.
--
-- FIX: Restrict INSERT to only admins and editors, matching the application-level
-- permissions defined in src/lib/permissions.ts

BEGIN;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can insert family members" ON public.family_members;

-- Create a new policy that only allows admins and editors to insert
CREATE POLICY "Admins and editors can insert family members" ON public.family_members
    FOR INSERT WITH CHECK (
        -- Admins can insert anywhere (even if created_by doesn't match)
        public.is_user_admin(auth.uid()) OR
        -- Editors can insert when created_by = auth.uid() or in their branch
        (
            public.is_user_editor(auth.uid()) AND (
                created_by = auth.uid() OR
                branch_root IN (
                    SELECT id FROM public.family_members 
                    WHERE created_by = auth.uid() OR is_root_member = TRUE
                )
            )
        )
    );

COMMIT;
