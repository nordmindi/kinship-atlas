-- Test and fix relations constraint
-- Let's check what the current constraint looks like and potentially recreate it

-- First, let's see what constraints exist
-- This is just for debugging - we'll drop and recreate the constraint

-- Drop the existing constraint
ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_relation_type_check;

-- Recreate the constraint with explicit values
ALTER TABLE public.relations 
ADD CONSTRAINT relations_relation_type_check 
CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling'));
