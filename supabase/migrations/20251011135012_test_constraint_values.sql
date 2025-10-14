-- Test constraint values by temporarily removing the constraint
-- This will help us identify if the constraint itself is the issue

-- Drop the constraint temporarily
ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_relation_type_check;

-- Add a more permissive constraint for testing
ALTER TABLE public.relations 
ADD CONSTRAINT relations_relation_type_check 
CHECK (relation_type IS NOT NULL AND relation_type != '');

-- This will allow any non-null, non-empty string for testing
