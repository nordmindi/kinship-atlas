-- Fix existing data and restore proper constraint
-- First, update any existing plural forms to singular forms

-- Update existing data to use singular forms
UPDATE public.relations 
SET relation_type = 'parent' 
WHERE relation_type = 'parents';

UPDATE public.relations 
SET relation_type = 'child' 
WHERE relation_type = 'children';

UPDATE public.relations 
SET relation_type = 'spouse' 
WHERE relation_type = 'spouses';

UPDATE public.relations 
SET relation_type = 'sibling' 
WHERE relation_type = 'siblings';

-- Now drop the temporary constraint
ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_relation_type_check;

-- Restore the proper constraint with singular forms only
ALTER TABLE public.relations 
ADD CONSTRAINT relations_relation_type_check 
CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling'));
