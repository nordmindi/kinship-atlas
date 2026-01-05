-- Update user roles to support admin, editor, and viewer
-- This migration extends the role-based access control system

-- IMPORTANT: Update existing data FIRST before changing the constraint
-- Update existing 'family_member' roles to 'editor' (as they had edit capabilities)
UPDATE public.user_profiles 
SET role = 'editor' 
WHERE role = 'family_member';

-- Also ensure any NULL roles are set to 'viewer' (safety check)
UPDATE public.user_profiles 
SET role = 'viewer' 
WHERE role IS NULL;

-- Now drop the old constraint (using CASCADE to ensure it's fully removed)
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check CASCADE;

-- Add new constraint with three roles
-- Using a more explicit constraint name to avoid conflicts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_role_check' 
        AND conrelid = 'public.user_profiles'::regclass
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_role_check 
        CHECK (role IN ('admin', 'editor', 'viewer'));
    END IF;
END $$;

-- Set default role to 'viewer' for new users
ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'viewer';

-- Update the trigger function to create new users with 'viewer' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name)
    VALUES (NEW.id, 'viewer', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include editor and viewer roles
-- Admins can manage all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update family_members RLS policies for new roles
DROP POLICY IF EXISTS "Users can insert family members in their branch" ON public.family_members;
DROP POLICY IF EXISTS "Users can update family members in their branch" ON public.family_members;
DROP POLICY IF EXISTS "Users can delete family members in their branch" ON public.family_members;

-- Admins and editors can insert family members
CREATE POLICY "Admins and editors can insert family members" ON public.family_members
    FOR INSERT WITH CHECK (
        -- Admins can insert anywhere
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Editors can insert in their own branch
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'editor'
            ) AND (
                created_by = auth.uid() OR
                branch_root IN (
                    SELECT id FROM public.family_members 
                    WHERE created_by = auth.uid() OR is_root_member = TRUE
                )
            )
        )
    );

-- Admins and editors can update family members
CREATE POLICY "Admins and editors can update family members" ON public.family_members
    FOR UPDATE USING (
        -- Admins can update anything
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Editors can update members they created or in their branch
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'editor'
            ) AND (
                created_by = auth.uid() OR
                branch_root IN (
                    SELECT id FROM public.family_members 
                    WHERE created_by = auth.uid() OR is_root_member = TRUE
                )
            )
        )
    );

-- Only admins can delete family members
CREATE POLICY "Only admins can delete family members" ON public.family_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update relations RLS policies for new roles
DROP POLICY IF EXISTS "Users can insert relations in their branch" ON public.relations;
DROP POLICY IF EXISTS "Users can delete relations in their branch" ON public.relations;

-- Admins and editors can insert relations
CREATE POLICY "Admins and editors can insert relations" ON public.relations
    FOR INSERT WITH CHECK (
        -- Admins can insert anywhere
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Editors can insert relations involving their branch members
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'editor'
            ) AND (
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

-- Admins and editors can delete relations
CREATE POLICY "Admins and editors can delete relations" ON public.relations
    FOR DELETE USING (
        -- Admins can delete anywhere
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Editors can delete relations involving their branch members
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'editor'
            ) AND (
                EXISTS (
                    SELECT 1 FROM public.family_members 
                    WHERE id = from_member_id AND (
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

-- Update family_stories RLS policies for new roles
-- Viewers, editors, and admins can view stories
DROP POLICY IF EXISTS "Users can view all stories" ON public.family_stories;
CREATE POLICY "Users can view all stories" ON public.family_stories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
        )
    );

-- Only admins and editors can create stories
DROP POLICY IF EXISTS "Users can create stories" ON public.family_stories;
CREATE POLICY "Admins and editors can create stories" ON public.family_stories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Only admins and editors can update stories (editors can only update their own)
DROP POLICY IF EXISTS "Users can update their own stories" ON public.family_stories;
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

-- Only admins can delete stories
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.family_stories;
CREATE POLICY "Only admins can delete stories" ON public.family_stories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update media RLS policies for new roles
-- Viewers, editors, and admins can view media
DROP POLICY IF EXISTS "Users can view their own media" ON public.media;
CREATE POLICY "Users can view all media" ON public.media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
        )
    );

-- Only admins and editors can upload media
DROP POLICY IF EXISTS "Users can upload their own media" ON public.media;
CREATE POLICY "Admins and editors can upload media" ON public.media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Only admins and editors can update media (editors can only update their own)
DROP POLICY IF EXISTS "Users can update their own media" ON public.media;
CREATE POLICY "Admins and editors can update media" ON public.media
    FOR UPDATE USING (
        -- Admins can update any media
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Editors can update their own media
        (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'editor'
            ) AND user_id = auth.uid()
        )
    );

-- Only admins can delete media
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media;
CREATE POLICY "Only admins can delete media" ON public.media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update the update_user_role function to support new roles
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to update roles
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user roles';
    END IF;
    
    -- Validate the new role
    IF new_role NOT IN ('admin', 'editor', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be one of: admin, editor, viewer', new_role;
    END IF;
    
    -- Update the user's role
    UPDATE public.user_profiles
    SET role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;
END;
$$;

-- Function to get all users (admin only)
-- Includes email from auth.users for better display
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    role TEXT,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT up.role INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();
    
    -- Only allow admins to get all users
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can view all users';
    END IF;
    
    -- Return all users with email from auth.users
    RETURN QUERY
    SELECT 
        up.id,
        up.role,
        up.display_name,
        COALESCE(au.email::TEXT, '') as email,
        up.created_at,
        up.updated_at
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

