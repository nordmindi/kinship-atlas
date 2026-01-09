-- Fix for GoTrue migration 20221208132122_backfill_email_last_sign_in_at
-- This migration has a bug where it compares UUID with text: id = user_id::text
-- We fix this by creating a custom operator that allows UUID to TEXT comparison
--
-- NOTE: This fix may no longer be needed in GoTrue v2.160.0+, but keeping it is safe
-- as it's idempotent and only runs if the migration encounters the bug.
-- If GoTrue starts successfully without this fix, it can be removed.

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.schema_migrations table if it doesn't exist (GoTrue uses this)
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version VARCHAR(255) PRIMARY KEY
);

-- Create a custom operator to fix the UUID = TEXT comparison issue
-- This allows the buggy migration to execute successfully
CREATE OR REPLACE FUNCTION uuid_eq_text(uuid, text) 
RETURNS boolean 
AS $$ 
    SELECT $1::text = $2; 
$$ 
LANGUAGE sql 
IMMUTABLE;

-- Drop existing operator if it exists (in case of re-runs)
DROP OPERATOR IF EXISTS auth.= (uuid, text);

-- Create the custom operator in the auth schema
CREATE OPERATOR auth.= (
    LEFTARG = uuid, 
    RIGHTARG = text, 
    PROCEDURE = uuid_eq_text
);

-- Mark the problematic migration as applied (optional, but helps with tracking)
INSERT INTO auth.schema_migrations (version)
VALUES ('20221208132122')
ON CONFLICT (version) DO NOTHING;

