-- Add user roles and branch tracking for family tree management
-- This migration implements a role-based access control system

-- Create user_profiles table to extend auth.users with role information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'family_member' CHECK (role IN ('admin', 'family_member')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add branch tracking to family_members
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_root UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_root_member BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_family_members_created_by ON public.family_members(created_by);
CREATE INDEX IF NOT EXISTS idx_family_members_branch_root ON public.family_members(branch_root);
CREATE INDEX IF NOT EXISTS idx_family_members_is_root ON public.family_members(is_root_member);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view all user profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update family_members RLS policies for role-based access
DROP POLICY IF EXISTS "Users can insert their own family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can update their own family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can delete their own family members" ON public.family_members;

-- New role-based policies for family_members
CREATE POLICY "Users can insert family members in their branch" ON public.family_members
    FOR INSERT WITH CHECK (
        -- Admins can insert anywhere
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Family members can insert in their own branch
        created_by = auth.uid() OR
        -- Family members can insert if they're adding to their own branch
        branch_root IN (
            SELECT id FROM public.family_members 
            WHERE created_by = auth.uid() OR is_root_member = TRUE
        )
    );

CREATE POLICY "Users can update family members in their branch" ON public.family_members
    FOR UPDATE USING (
        -- Admins can update anything
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Users can update members they created
        created_by = auth.uid() OR
        -- Users can update members in their branch
        branch_root IN (
            SELECT id FROM public.family_members 
            WHERE created_by = auth.uid() OR is_root_member = TRUE
        )
    );

CREATE POLICY "Users can delete family members in their branch" ON public.family_members
    FOR DELETE USING (
        -- Only admins can delete
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update relations RLS policies for role-based access
DROP POLICY IF EXISTS "Users can insert relations involving their family members" ON public.relations;
DROP POLICY IF EXISTS "Users can delete relations involving their family members" ON public.relations;

CREATE POLICY "Users can insert relations in their branch" ON public.relations
    FOR INSERT WITH CHECK (
        -- Admins can insert anywhere
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Users can insert relations involving their branch members
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
    );

CREATE POLICY "Users can delete relations in their branch" ON public.relations
    FOR DELETE USING (
        -- Admins can delete anywhere
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) OR
        -- Users can delete relations involving their branch members
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
    );

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name)
    VALUES (NEW.id, 'family_member', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to set branch root for new family members
CREATE OR REPLACE FUNCTION public.set_branch_root()
RETURNS TRIGGER AS $$
BEGIN
    -- If no branch_root is specified, set it to the member's own ID (making them a root)
    IF NEW.branch_root IS NULL THEN
        NEW.branch_root = NEW.id;
        NEW.is_root_member = TRUE;
    END IF;
    
    -- If no created_by is specified, set it to the current user
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set branch root
DROP TRIGGER IF EXISTS on_family_member_created ON public.family_members;
CREATE TRIGGER on_family_member_created
    BEFORE INSERT ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.set_branch_root();
