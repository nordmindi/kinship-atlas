-- Truncate All Data from Database Tables
-- WARNING: This will DELETE ALL DATA in the database!
-- This migration preserves the schema (tables, functions, triggers, policies)
-- Created: 2026-01-10
--
-- IMPORTANT: This migration is DESTRUCTIVE and will remove:
-- - All data from all tables
-- - But PRESERVES the table structure, functions, triggers, and policies
--
-- Use this when you need to clear all data but keep the database schema intact.

BEGIN;

-- ============================================================================
-- TRUNCATE ALL TABLES
-- ============================================================================
-- Using TRUNCATE with CASCADE to handle foreign key constraints
-- Tables are truncated in dependency order for clarity, but CASCADE handles it

-- Disable triggers temporarily to avoid issues during truncation
SET session_replication_role = replica;

-- ============================================================================
-- 1. JUNCTION/RELATIONSHIP TABLES (depend on other tables)
-- ============================================================================

TRUNCATE TABLE public.album_media CASCADE;
TRUNCATE TABLE public.album_story_categories CASCADE;
TRUNCATE TABLE public.album_family_members CASCADE;
TRUNCATE TABLE public.album_family_groups CASCADE;
TRUNCATE TABLE public.story_groups CASCADE;
TRUNCATE TABLE public.family_member_groups CASCADE;
TRUNCATE TABLE public.story_artifacts CASCADE;
TRUNCATE TABLE public.artifact_media CASCADE;
TRUNCATE TABLE public.story_members CASCADE;
TRUNCATE TABLE public.story_media CASCADE;
TRUNCATE TABLE public.event_participants CASCADE;
TRUNCATE TABLE public.event_media CASCADE;
TRUNCATE TABLE public.relations CASCADE;
TRUNCATE TABLE public.locations CASCADE;

-- ============================================================================
-- 2. MAIN CONTENT TABLES
-- ============================================================================

TRUNCATE TABLE public.albums CASCADE;
TRUNCATE TABLE public.story_categories CASCADE;
TRUNCATE TABLE public.artifacts CASCADE;
TRUNCATE TABLE public.family_groups CASCADE;
TRUNCATE TABLE public.user_tree_layouts CASCADE;
TRUNCATE TABLE public.family_stories CASCADE;
TRUNCATE TABLE public.family_events CASCADE;
TRUNCATE TABLE public.media CASCADE;
TRUNCATE TABLE public.family_members CASCADE;

-- ============================================================================
-- 3. USER PROFILES (Optional - uncomment if you want to clear user profiles too)
-- ============================================================================
-- WARNING: This will delete all user roles and display names
-- Users will need to re-authenticate to recreate their profiles
-- Uncomment the following line to also clear user profiles:

-- TRUNCATE TABLE public.user_profiles CASCADE;

-- ============================================================================
-- RE-ENABLE TRIGGERS
-- ============================================================================

SET session_replication_role = DEFAULT;

COMMIT;

-- ============================================================================
-- DATA TRUNCATION COMPLETE
-- ============================================================================
-- 
-- All data has been deleted from the following tables:
-- ✓ album_media
-- ✓ album_story_categories
-- ✓ album_family_members
-- ✓ album_family_groups
-- ✓ story_groups
-- ✓ family_member_groups
-- ✓ story_artifacts
-- ✓ artifact_media
-- ✓ story_members
-- ✓ story_media
-- ✓ event_participants
-- ✓ event_media
-- ✓ relations
-- ✓ locations
-- ✓ albums
-- ✓ story_categories
-- ✓ artifacts
-- ✓ family_groups
-- ✓ user_tree_layouts
-- ✓ family_stories
-- ✓ family_events
-- ✓ media
-- ✓ family_members
--
-- NOT deleted (by default):
-- - user_profiles (user roles and display names preserved)
-- - auth.users (Supabase auth table - not affected)
--
-- The database schema (tables, columns, indexes, functions, triggers, policies)
-- remains intact. You can immediately start adding new data.
