-- Fix infinite recursion in user_profiles RLS policies
-- The issue is that the admin policy tries to query user_profiles table
-- which creates a circular dependency

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;

-- Create simpler, non-recursive policies
-- Allow users to view all profiles (needed for role checking)
CREATE POLICY "Allow all users to view profiles" ON public.user_profiles
    FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- For admin operations, we'll use service role key or handle it differently
-- This avoids the recursion issue
