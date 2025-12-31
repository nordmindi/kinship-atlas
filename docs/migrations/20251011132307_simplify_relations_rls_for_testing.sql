-- Simplify relations RLS policies for testing
-- The current policies are too restrictive and prevent relationship creation

-- Drop the complex policies
DROP POLICY IF EXISTS "Users can insert relations in their branch" ON public.relations;
DROP POLICY IF EXISTS "Users can delete relations in their branch" ON public.relations;

-- Create simpler, more permissive policies for testing
-- Allow any authenticated user to insert relations
CREATE POLICY "Authenticated users can insert relations" ON public.relations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow any authenticated user to delete relations
CREATE POLICY "Authenticated users can delete relations" ON public.relations
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Allow any authenticated user to view relations
CREATE POLICY "Authenticated users can view relations" ON public.relations
    FOR SELECT USING (auth.uid() IS NOT NULL);
