-- Production Schema Fix Migration
-- This migration ensures the production database has all required tables and columns
-- Run this migration if you're seeing errors about missing user_profiles table or created_by column

-- ============================================================================
-- 1. CREATE user_profiles TABLE (if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'family_member' CHECK (role IN ('admin', 'family_member')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO family_members (if they don't exist)
-- ============================================================================
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_root UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_root_member BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 3. CREATE INDEXES (if they don't exist)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_family_members_created_by ON public.family_members(created_by);
CREATE INDEX IF NOT EXISTS idx_family_members_branch_root ON public.family_members(branch_root);
CREATE INDEX IF NOT EXISTS idx_family_members_is_root ON public.family_members(is_root_member);

-- ============================================================================
-- 4. ENABLE RLS ON user_profiles (if not already enabled)
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES FOR user_profiles (drop and recreate to avoid conflicts)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all users to view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Allow all users to view profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 6. CREATE FUNCTION TO AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name)
    VALUES (NEW.id, 'family_member', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. CREATE TRIGGER FOR AUTO-CREATING USER PROFILES
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. CREATE FUNCTION TO SET BRANCH ROOT FOR NEW FAMILY MEMBERS
-- ============================================================================
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

-- ============================================================================
-- 9. CREATE TRIGGER FOR AUTO-SETTING BRANCH ROOT
-- ============================================================================
DROP TRIGGER IF EXISTS on_family_member_created ON public.family_members;
CREATE TRIGGER on_family_member_created
    BEFORE INSERT ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.set_branch_root();

-- ============================================================================
-- 10. CREATE USER PROFILES FOR EXISTING USERS (if any exist without profiles)
-- ============================================================================
INSERT INTO public.user_profiles (id, role, display_name)
SELECT 
    u.id,
    'family_member'::TEXT,
    COALESCE(u.raw_user_meta_data->>'display_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. SET created_by FOR EXISTING FAMILY MEMBERS (if null and user_id exists)
-- ============================================================================
UPDATE public.family_members
SET created_by = user_id
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- ============================================================================
-- 12. SET branch_root FOR EXISTING FAMILY MEMBERS (if null)
-- ============================================================================
UPDATE public.family_members
SET branch_root = id, is_root_member = TRUE
WHERE branch_root IS NULL;

