-- Add onboarding fields to user_profiles table
-- Created: 2026-01-12

BEGIN;

-- Add onboarding_completed field (default false for new users, true for existing users)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add onboarding_enabled field (default true - users can disable it in settings)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_enabled BOOLEAN DEFAULT true;

-- Set existing users as having completed onboarding (they've been using the app)
UPDATE public.user_profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL;

-- Ensure onboarding_enabled is true for existing users
UPDATE public.user_profiles 
SET onboarding_enabled = true 
WHERE onboarding_enabled IS NULL;

COMMIT;
