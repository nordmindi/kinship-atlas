-- Immediate fix for role constraint issue
-- Run this in Supabase SQL Editor to fix the constraint problem

-- Step 1: Update all existing data to valid roles
UPDATE public.user_profiles 
SET role = 'editor' 
WHERE role = 'family_member' OR role NOT IN ('admin', 'editor', 'viewer');

UPDATE public.user_profiles 
SET role = 'viewer' 
WHERE role IS NULL;

-- Step 2: Drop the problematic constraint completely
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 3: Verify no invalid roles exist
-- This query should return 0 rows
SELECT id, role FROM public.user_profiles 
WHERE role NOT IN ('admin', 'editor', 'viewer') OR role IS NULL;

-- Step 4: Add the new constraint
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'editor', 'viewer'));

-- Step 5: Verify the constraint works
-- This should succeed
INSERT INTO public.user_profiles (id, role, display_name) 
VALUES (gen_random_uuid(), 'viewer', 'test') 
ON CONFLICT (id) DO NOTHING;

-- Clean up test row
DELETE FROM public.user_profiles WHERE display_name = 'test';

-- Step 6: Update the trigger function to use 'viewer' instead of 'family_member'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name)
    VALUES (NEW.id, 'viewer', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

