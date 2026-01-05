-- Drop All Tables and Clean Database for Fresh Migration
-- WARNING: This will DELETE ALL DATA in the database!
-- Use this migration to completely reset the database before running the production migration
-- Created: 2025-02-01
--
-- IMPORTANT: This migration is DESTRUCTIVE and will remove:
-- - All tables and their data
-- - All functions
-- - All triggers
-- - All RLS policies
-- - All indexes (will be recreated by the production migration)
--
-- After running this, run: 20250201000000_production_update_all_changes.sql

BEGIN;

-- ============================================================================
-- 1. DROP ALL RLS POLICIES
-- ============================================================================

-- Drop policies from all tables (using CASCADE to handle dependencies)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- 2. DROP ALL TRIGGERS
-- ============================================================================

-- Drop all triggers from public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
            r.trigger_name, r.event_object_table);
    END LOOP;
END $$;

-- ============================================================================
-- 3. DROP ALL FUNCTIONS
-- ============================================================================

-- Drop all functions from public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    ) LOOP
        BEGIN
            -- Try to get the function signature
            EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE', 
                'public', r.routine_name);
        EXCEPTION
            WHEN OTHERS THEN
                -- If we can't drop with just the name, try to get full signature
                NULL;
        END;
    END LOOP;
END $$;

-- Drop specific known functions with their signatures
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users() CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_user_display_name(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_user_password(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_albums_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_tree_layouts_updated_at() CASCADE;

-- ============================================================================
-- 4. DROP ALL TABLES (in reverse dependency order)
-- ============================================================================

-- Drop junction/relationship tables first (they depend on other tables)
DROP TABLE IF EXISTS public.album_media CASCADE;
DROP TABLE IF EXISTS public.album_story_categories CASCADE;
DROP TABLE IF EXISTS public.album_family_members CASCADE;
DROP TABLE IF EXISTS public.album_family_groups CASCADE;
DROP TABLE IF EXISTS public.story_groups CASCADE;
DROP TABLE IF EXISTS public.family_member_groups CASCADE;
DROP TABLE IF EXISTS public.story_artifacts CASCADE;
DROP TABLE IF EXISTS public.artifact_media CASCADE;
DROP TABLE IF EXISTS public.story_members CASCADE;
DROP TABLE IF EXISTS public.story_media CASCADE;
DROP TABLE IF EXISTS public.event_participants CASCADE;
DROP TABLE IF EXISTS public.event_media CASCADE;
DROP TABLE IF EXISTS public.relations CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;

-- Drop main content tables
DROP TABLE IF EXISTS public.albums CASCADE;
DROP TABLE IF EXISTS public.story_categories CASCADE;
DROP TABLE IF EXISTS public.artifacts CASCADE;
DROP TABLE IF EXISTS public.family_groups CASCADE;
DROP TABLE IF EXISTS public.user_tree_layouts CASCADE;
DROP TABLE IF EXISTS public.family_stories CASCADE;
DROP TABLE IF EXISTS public.family_events CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;

-- Drop user_profiles table
-- WARNING: This will delete all user profile data (roles, display names, etc.)
-- Auth users in auth.users will remain, but their profiles will be deleted
-- The production migration will recreate user_profiles and the handle_new_user trigger
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================================================
-- 5. DROP ALL TYPES (if any custom types exist)
-- ============================================================================

-- Drop any custom types if they exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT typname
        FROM pg_type
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'c'  -- composite types
    ) LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', r.typname);
    END LOOP;
END $$;

-- ============================================================================
-- 6. CLEANUP: Drop any remaining objects
-- ============================================================================

-- Drop any remaining sequences (except those owned by tables)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        AND sequence_name NOT LIKE 'pg_%'
    ) LOOP
        BEGIN
            EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', r.sequence_name);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================
-- 
-- All tables, functions, triggers, and policies have been dropped.
-- You can now run the production migration:
--   20250201000000_production_update_all_changes.sql
--
-- This will recreate everything with the latest schema.
--
-- NOTE: This does NOT drop:
-- - auth.users (Supabase auth table - managed by Supabase, users remain but profiles are deleted)
-- - Any extensions (uuid-ossp, etc. - these will remain)
--
-- After running this migration:
-- 1. All application tables are dropped
-- 2. All functions, triggers, and policies are removed
-- 3. Run 20250201000000_production_update_all_changes.sql to recreate everything
-- 4. User profiles will be recreated when users sign in (via handle_new_user trigger)

