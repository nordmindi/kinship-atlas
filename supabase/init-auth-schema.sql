-- Initialize Supabase Auth Schema
-- This script ensures the auth schema exists before GoTrue migrations run
-- The Supabase postgres image (supabase/postgres:15.1.1.78) should already include 
-- the auth schema, but this ensures it's created if missing.
--
-- This is a safety net for local Docker Compose development.
-- For production Supabase Cloud, the auth schema is managed automatically.

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Note: The Supabase postgres image (supabase/postgres:15.1.1.78) should already
-- include the full auth schema initialization. If this script runs, it means
-- we're doing a fresh initialization. The auth schema and all required types
-- should be created by the postgres image's initialization scripts.

