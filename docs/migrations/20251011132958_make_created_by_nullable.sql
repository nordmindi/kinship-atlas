-- Make created_by field nullable to avoid foreign key constraint issues
-- This allows family members to be created even if the user doesn't exist in auth.users yet

-- Drop the existing foreign key constraint
ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_created_by_fkey;

-- Make the created_by field nullable
ALTER TABLE public.family_members ALTER COLUMN created_by DROP NOT NULL;

-- Re-add the foreign key constraint but allow NULL values
ALTER TABLE public.family_members 
ADD CONSTRAINT family_members_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
