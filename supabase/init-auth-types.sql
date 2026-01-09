-- Initialize Auth Types and Tables for GoTrue
-- This ensures all required auth schema components exist before GoTrue migrations run
--
-- These types and tables are required for GoTrue v2.160.0+ MFA (Multi-Factor Authentication) support.
-- The Supabase postgres image may include these, but this script ensures they exist.
--
-- This is a safety net for local Docker Compose development.
-- For production Supabase Cloud, these are managed automatically.

-- Create auth.factor_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'factor_type' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    ) THEN
        CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn');
        RAISE NOTICE 'Created auth.factor_type enum';
    ELSE
        RAISE NOTICE 'auth.factor_type enum already exists';
    END IF;
END $$;

-- Create auth.factor_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'factor_status' 
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    ) THEN
        CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
        RAISE NOTICE 'Created auth.factor_status enum';
    ELSE
        RAISE NOTICE 'auth.factor_status enum already exists';
    END IF;
END $$;

-- Create auth.mfa_factors table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    friendly_name TEXT,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    secret TEXT
);

-- Create auth.mfa_challenges table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    ip_address INET NOT NULL
);

-- Note: Foreign key constraints and indexes will be added by GoTrue migrations
-- This script just ensures the base types and tables exist

