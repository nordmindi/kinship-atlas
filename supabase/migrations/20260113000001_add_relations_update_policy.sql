-- Add UPDATE policy for relations table
-- This allows admins and editors to update relationships (e.g., sibling_type)
-- Created: 2026-01-13

BEGIN;

-- Ensure helper functions exist (they should already exist from main schema, but create them if not)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_editor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND role = 'editor'
    );
END;
$$;

DROP POLICY IF EXISTS "Admins and editors can update relations" ON public.relations;
CREATE POLICY "Admins and editors can update relations" ON public.relations
    FOR UPDATE USING (
        public.is_user_admin(auth.uid()) OR
        (
            public.is_user_editor(auth.uid()) AND (
                EXISTS (
                    SELECT 1 FROM public.family_members 
                    WHERE id = from_member_id AND (
                        created_by = auth.uid() OR
                        branch_root IN (
                            SELECT id FROM public.family_members 
                            WHERE created_by = auth.uid() OR is_root_member = TRUE
                        )
                    )
                ) OR EXISTS (
                    SELECT 1 FROM public.family_members 
                    WHERE id = to_member_id AND (
                        created_by = auth.uid() OR
                        branch_root IN (
                            SELECT id FROM public.family_members 
                            WHERE created_by = auth.uid() OR is_root_member = TRUE
                        )
                    )
                )
            )
        )
    );

COMMIT;
