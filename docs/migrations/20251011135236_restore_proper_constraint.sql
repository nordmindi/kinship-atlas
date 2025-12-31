-- Restore the proper constraint now that the application code is fixed
-- The application now properly maps plural forms to singular forms

-- Drop the temporary permissive constraint
ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_relation_type_check;

-- Restore the proper constraint with singular forms only
ALTER TABLE public.relations 
ADD CONSTRAINT relations_relation_type_check 
CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling'));
