-- Complete fix for role constraint issue
-- This script fixes the constraint and trigger in the correct order
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check current constraint (for debugging)
-- ============================================================================
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
AND conname LIKE '%role%';

-- ============================================================================
-- STEP 2: Update trigger function FIRST (before fixing constraint)
-- This ensures new inserts use 'viewer' role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name)
    VALUES (NEW.id, 'viewer', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Update ALL existing data to valid roles
-- ============================================================================
-- Convert 'family_member' to 'editor'
UPDATE public.user_profiles 
SET role = 'editor', updated_at = NOW()
WHERE role = 'family_member';

-- Set NULL roles to 'viewer'
UPDATE public.user_profiles 
SET role = 'viewer', updated_at = NOW()
WHERE role IS NULL;

-- Fix any other invalid roles (set to 'viewer' as safe default)
UPDATE public.user_profiles 
SET role = 'viewer', updated_at = NOW()
WHERE role NOT IN ('admin', 'editor', 'viewer');

-- ============================================================================
-- STEP 4: Verify all data is valid (should return 0 rows)
-- ============================================================================
SELECT id, role, display_name 
FROM public.user_profiles 
WHERE role NOT IN ('admin', 'editor', 'viewer') OR role IS NULL;

-- ============================================================================
-- STEP 5: Drop the old constraint completely
-- ============================================================================
-- Try to drop with CASCADE first
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check CASCADE;

-- Also try dropping any other role-related constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.user_profiles'::regclass
        AND conname LIKE '%role%'
    LOOP
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
    END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Add the new constraint
-- ============================================================================
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'editor', 'viewer'));

-- ============================================================================
-- STEP 7: Set default value
-- ============================================================================
ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'viewer';

-- ============================================================================
-- STEP 8: Verify the constraint works
-- ============================================================================
-- Test insert (should succeed)
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name) 
    VALUES (test_id, 'viewer', 'constraint_test');
    
    -- Clean up
    DELETE FROM public.user_profiles WHERE id = test_id;
    
    RAISE NOTICE 'Constraint test passed!';
END $$;

-- ============================================================================
-- STEP 9: Final verification
-- ============================================================================
SELECT 
    role,
    COUNT(*) as count
FROM public.user_profiles
GROUP BY role
ORDER BY role;

