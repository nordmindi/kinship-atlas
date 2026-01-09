-- Complete Production Migration: Full Database Schema
-- This migration creates the complete database schema from scratch
-- Created: 2025-02-15
-- 
-- IMPORTANT: This migration is idempotent - it can be run multiple times safely
-- All changes use IF NOT EXISTS, IF EXISTS, and similar constructs to prevent errors
--
-- This migration includes:
-- 1. Extensions and base setup
-- 2. User profiles and role system (admin, editor, viewer)
-- 3. Family members, relations, locations
-- 4. Family stories, story members, story groups
-- 5. Family events and participants
-- 6. Media and media relationships
-- 7. Artifacts and artifact relationships
-- 8. Family groups and member groups
-- 9. Albums system
-- 10. User tree layouts
-- 11. Admin functions
-- 12. Complete RLS policies (including import fix)
-- 13. Indexes and triggers

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS AND BASE SETUP
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. USER PROFILES AND ROLE SYSTEM
-- ============================================================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing 'family_member' roles to 'editor' (if any exist)
UPDATE public.user_profiles 
SET role = 'editor' 
WHERE role = 'family_member';

-- Ensure any NULL roles are set to 'viewer'
UPDATE public.user_profiles 
SET role = 'viewer' 
WHERE role IS NULL;

-- Drop and recreate role constraint to ensure it's correct
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_role_check' 
        AND conrelid = 'public.user_profiles'::regclass
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_role_check 
        CHECK (role IN ('admin', 'editor', 'viewer'));
    END IF;
END $$;

-- Set default role to 'viewer' for new users
ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'viewer';

-- Create trigger function to auto-create user profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, display_name)
    VALUES (NEW.id, 'viewer', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have one
-- This handles users created before the migration ran
INSERT INTO public.user_profiles (id, role, display_name)
SELECT 
    au.id,
    'viewer'::TEXT,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email)
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Helper function to check admin status (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$;

-- Helper function to check editor status
CREATE OR REPLACE FUNCTION public.is_user_editor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND role = 'editor'
    );
END;
$$;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (public.is_user_admin(auth.uid()));

-- ============================================================================
-- 3. FAMILY MEMBERS AND RELATIONS
-- ============================================================================

-- Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE,
    death_date DATE,
    birth_place TEXT,
    bio TEXT,
    avatar_url TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    branch_root UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
    is_root_member BOOLEAN DEFAULT FALSE
);

-- Create relations table
CREATE TABLE IF NOT EXISTS public.relations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    to_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    relation_type TEXT CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    current_residence BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for family members
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_name ON public.family_members(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_family_members_created_by ON public.family_members(created_by);
CREATE INDEX IF NOT EXISTS idx_family_members_branch_root ON public.family_members(branch_root);
CREATE INDEX IF NOT EXISTS idx_family_members_is_root ON public.family_members(is_root_member);
CREATE INDEX IF NOT EXISTS idx_relations_from_member ON public.relations(from_member_id);
CREATE INDEX IF NOT EXISTS idx_relations_to_member ON public.relations(to_member_id);
CREATE INDEX IF NOT EXISTS idx_locations_family_member ON public.locations(family_member_id);
CREATE INDEX IF NOT EXISTS idx_locations_current ON public.locations(current_residence);

-- Enable RLS on family tables
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_members
-- IMPORTANT: This policy allows ANY authenticated user to insert when created_by = auth.uid()
-- This fixes the import issue where users with 'viewer' role couldn't import data
DROP POLICY IF EXISTS "Users can view all family members" ON public.family_members;
CREATE POLICY "Users can view all family members" ON public.family_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert family members" ON public.family_members;
CREATE POLICY "Users can insert family members" ON public.family_members
    FOR INSERT WITH CHECK (
        -- FIRST: Any authenticated user can insert when created_by = auth.uid()
        -- This allows users with 'viewer' role or any role to create their own family members
        -- This is the simplest check and should work for all imports
        (auth.uid() IS NOT NULL AND created_by = auth.uid()) OR
        -- Admins can insert anywhere (even if created_by doesn't match)
        public.is_user_admin(auth.uid()) OR
        -- Editors can insert in their branch (when branch_root is set and matches their branch)
        (
            public.is_user_editor(auth.uid()) AND
            branch_root IS NOT NULL AND
            branch_root IN (
                SELECT id FROM public.family_members 
                WHERE created_by = auth.uid() OR is_root_member = TRUE
            )
        )
    );

DROP POLICY IF EXISTS "Admins and editors can update family members" ON public.family_members;
CREATE POLICY "Admins and editors can update family members" ON public.family_members
    FOR UPDATE USING (
        public.is_user_admin(auth.uid()) OR
        (
            public.is_user_editor(auth.uid()) AND (
                created_by = auth.uid() OR
                branch_root IN (
                    SELECT id FROM public.family_members 
                    WHERE created_by = auth.uid() OR is_root_member = TRUE
                )
            )
        )
    );

DROP POLICY IF EXISTS "Only admins can delete family members" ON public.family_members;
CREATE POLICY "Only admins can delete family members" ON public.family_members
    FOR DELETE USING (public.is_user_admin(auth.uid()));

-- RLS policies for relations
DROP POLICY IF EXISTS "Users can view all relations" ON public.relations;
CREATE POLICY "Users can view all relations" ON public.relations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and editors can insert relations" ON public.relations;
CREATE POLICY "Admins and editors can insert relations" ON public.relations
    FOR INSERT WITH CHECK (
        public.is_user_admin(auth.uid()) OR
        (
            public.is_user_editor(auth.uid()) AND (
                EXISTS (
                    SELECT 1 FROM public.family_members 
                    WHERE id = from_member_id AND (
                        created_by = auth.uid() OR
                        branch_root IN (
                            SELECT id FROM public.family_members 
                            WHERE created_by = auth.uid() OR is_root_member = TRUE
                        )
                    )
                ) OR EXISTS (
                    SELECT 1 FROM public.family_members 
                    WHERE id = to_member_id AND (
                        created_by = auth.uid() OR
                        branch_root IN (
                            SELECT id FROM public.family_members 
                            WHERE created_by = auth.uid() OR is_root_member = TRUE
                        )
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admins and editors can delete relations" ON public.relations;
CREATE POLICY "Admins and editors can delete relations" ON public.relations
    FOR DELETE USING (
        public.is_user_admin(auth.uid()) OR
        (
            public.is_user_editor(auth.uid()) AND (
                EXISTS (
                    SELECT 1 FROM public.family_members 
                    WHERE id = from_member_id AND (
                        created_by = auth.uid() OR
                        branch_root IN (
                            SELECT id FROM public.family_members 
                            WHERE created_by = auth.uid() OR is_root_member = TRUE
                        )
                    )
                )
            )
        )
    );

-- RLS policies for locations (basic - will be updated after family groups are created)
DROP POLICY IF EXISTS "Users can view locations for their family members" ON public.locations;
CREATE POLICY "Users can view locations for their family members" ON public.locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert locations for their family members" ON public.locations;
CREATE POLICY "Users can insert locations for their family members" ON public.locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update locations for their family members" ON public.locations;
CREATE POLICY "Users can update locations for their family members" ON public.locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete locations for their family members" ON public.locations;
CREATE POLICY "Users can delete locations for their family members" ON public.locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        )
    );

-- ============================================================================
-- 4. FAMILY STORIES
-- ============================================================================

-- Create family_stories table
CREATE TABLE IF NOT EXISTS public.family_stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE,
    location TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create story_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.story_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID REFERENCES public.family_stories(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for stories
CREATE INDEX IF NOT EXISTS idx_family_stories_author ON public.family_stories(author_id);
CREATE INDEX IF NOT EXISTS idx_family_stories_location ON public.family_stories(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_stories_category ON public.family_stories(category);
CREATE INDEX IF NOT EXISTS idx_story_members_story ON public.story_members(story_id);
CREATE INDEX IF NOT EXISTS idx_story_members_member ON public.story_members(family_member_id);

-- Enable RLS on story tables
ALTER TABLE public.family_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_stories
DROP POLICY IF EXISTS "Users can view all stories" ON public.family_stories;
CREATE POLICY "Users can view all stories" ON public.family_stories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
        )
    );

DROP POLICY IF EXISTS "Admins and editors can create stories" ON public.family_stories;
CREATE POLICY "Admins and editors can create stories" ON public.family_stories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

DROP POLICY IF EXISTS "Admins and editors can update stories" ON public.family_stories;
CREATE POLICY "Admins and editors can update stories" ON public.family_stories
    FOR UPDATE USING (
        public.is_user_admin(auth.uid()) OR
        (
            public.is_user_editor(auth.uid()) AND author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Only admins can delete stories" ON public.family_stories;
CREATE POLICY "Only admins can delete stories" ON public.family_stories
    FOR DELETE USING (public.is_user_admin(auth.uid()));

-- RLS policies for story_members
DROP POLICY IF EXISTS "Users can view all story members" ON public.story_members;
CREATE POLICY "Users can view all story members" ON public.story_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert story members for their stories" ON public.story_members;
CREATE POLICY "Users can insert story members for their stories" ON public.story_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete story members for their stories" ON public.story_members;
CREATE POLICY "Users can delete story members for their stories" ON public.story_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. FAMILY EVENTS
-- ============================================================================

-- Create family_events table
CREATE TABLE IF NOT EXISTS public.family_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    location TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.family_events(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_family_events_creator ON public.family_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_member ON public.event_participants(family_member_id);

-- Enable RLS on event tables
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_events
DROP POLICY IF EXISTS "Users can view all events" ON public.family_events;
CREATE POLICY "Users can view all events" ON public.family_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create events" ON public.family_events;
CREATE POLICY "Users can create events" ON public.family_events
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their events" ON public.family_events;
CREATE POLICY "Users can update their events" ON public.family_events
    FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete their events" ON public.family_events;
CREATE POLICY "Users can delete their events" ON public.family_events
    FOR DELETE USING (auth.uid() = creator_id);

-- RLS policies for event_participants
DROP POLICY IF EXISTS "Users can view all event participants" ON public.event_participants;
CREATE POLICY "Users can view all event participants" ON public.event_participants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert event participants for their events" ON public.event_participants;
CREATE POLICY "Users can insert event participants for their events" ON public.event_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete event participants for their events" ON public.event_participants;
CREATE POLICY "Users can delete event participants for their events" ON public.event_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. MEDIA
-- ============================================================================

-- Create media table
CREATE TABLE IF NOT EXISTS public.media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    url TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    media_type TEXT CHECK (media_type IN ('image', 'document', 'audio', 'video')),
    caption TEXT,
    file_name TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create story_media table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.story_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID REFERENCES public.family_stories(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_media table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.event_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.family_events(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for media
CREATE INDEX IF NOT EXISTS idx_media_user ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media(media_type);
CREATE INDEX IF NOT EXISTS idx_story_media_story ON public.story_media(story_id);
CREATE INDEX IF NOT EXISTS idx_story_media_media ON public.story_media(media_id);
CREATE INDEX IF NOT EXISTS idx_event_media_event ON public.event_media(event_id);
CREATE INDEX IF NOT EXISTS idx_event_media_media ON public.event_media(media_id);

-- Enable RLS on media tables
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for media
DROP POLICY IF EXISTS "Users can view all media" ON public.media;
CREATE POLICY "Users can view all media" ON public.media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
        )
    );

DROP POLICY IF EXISTS "Admins and editors can upload media" ON public.media;
CREATE POLICY "Admins and editors can upload media" ON public.media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

DROP POLICY IF EXISTS "Admins and editors can update media" ON public.media;
CREATE POLICY "Admins and editors can update media" ON public.media
    FOR UPDATE USING (
        public.is_user_admin(auth.uid()) OR
        (
            public.is_user_editor(auth.uid()) AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Only admins can delete media" ON public.media;
CREATE POLICY "Only admins can delete media" ON public.media
    FOR DELETE USING (public.is_user_admin(auth.uid()));

-- RLS policies for story_media
DROP POLICY IF EXISTS "Users can view all story media" ON public.story_media;
CREATE POLICY "Users can view all story media" ON public.story_media
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert story media for their stories" ON public.story_media;
CREATE POLICY "Users can insert story media for their stories" ON public.story_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete story media for their stories" ON public.story_media;
CREATE POLICY "Users can delete story media for their stories" ON public.story_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- RLS policies for event_media
DROP POLICY IF EXISTS "Users can view all event media" ON public.event_media;
CREATE POLICY "Users can view all event media" ON public.event_media
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert event media for their events" ON public.event_media;
CREATE POLICY "Users can insert event media for their events" ON public.event_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete event media for their events" ON public.event_media;
CREATE POLICY "Users can delete event media for their events" ON public.event_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

-- ============================================================================
-- 7. ARTIFACTS
-- ============================================================================

-- Create artifacts table
CREATE TABLE IF NOT EXISTS public.artifacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    artifact_type TEXT CHECK (artifact_type IN ('document', 'heirloom', 'photo', 'letter', 'certificate', 'other')),
    date_created DATE,
    date_acquired DATE,
    condition TEXT,
    location_stored TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attrs JSONB DEFAULT '{}'::jsonb
);

-- Create story_artifacts junction table
CREATE TABLE IF NOT EXISTS public.story_artifacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES public.family_stories(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES public.artifacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, artifact_id)
);

-- Create artifact_media junction table
CREATE TABLE IF NOT EXISTS public.artifact_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artifact_id UUID REFERENCES public.artifacts(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(artifact_id, media_id)
);

-- Create indexes for artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_owner_id ON public.artifacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON public.artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_date_created ON public.artifacts(date_created);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_story_id ON public.story_artifacts(story_id);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_artifact_id ON public.story_artifacts(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_artifact_id ON public.artifact_media(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_media_id ON public.artifact_media(media_id);

-- Enable RLS on artifacts tables
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for artifacts
DROP POLICY IF EXISTS "Users can view all artifacts" ON public.artifacts;
CREATE POLICY "Users can view all artifacts" ON public.artifacts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own artifacts" ON public.artifacts;
CREATE POLICY "Users can insert their own artifacts" ON public.artifacts
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own artifacts" ON public.artifacts;
CREATE POLICY "Users can update their own artifacts" ON public.artifacts
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own artifacts" ON public.artifacts;
CREATE POLICY "Users can delete their own artifacts" ON public.artifacts
    FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for story_artifacts
DROP POLICY IF EXISTS "Users can view all story artifacts" ON public.story_artifacts;
CREATE POLICY "Users can view all story artifacts" ON public.story_artifacts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert story artifacts for their stories" ON public.story_artifacts;
CREATE POLICY "Users can insert story artifacts for their stories" ON public.story_artifacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete story artifacts for their stories" ON public.story_artifacts;
CREATE POLICY "Users can delete story artifacts for their stories" ON public.story_artifacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- RLS policies for artifact_media
DROP POLICY IF EXISTS "Users can view all artifact media" ON public.artifact_media;
CREATE POLICY "Users can view all artifact media" ON public.artifact_media
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert artifact media for their artifacts" ON public.artifact_media;
CREATE POLICY "Users can insert artifact media for their artifacts" ON public.artifact_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.artifacts 
            WHERE id = artifact_id AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete artifact media for their artifacts" ON public.artifact_media;
CREATE POLICY "Users can delete artifact media for their artifacts" ON public.artifact_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.artifacts 
            WHERE id = artifact_id AND owner_id = auth.uid()
        )
    );

-- ============================================================================
-- 8. FAMILY GROUPS
-- ============================================================================

-- Create family_groups table
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_member_groups table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.family_member_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_member_id, family_group_id)
);

-- Create story_groups table
CREATE TABLE IF NOT EXISTS public.story_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES public.family_stories(id) ON DELETE CASCADE NOT NULL,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, family_group_id)
);

-- Create indexes for family groups
CREATE INDEX IF NOT EXISTS idx_family_groups_user_id ON public.family_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_family_groups_name ON public.family_groups(name);
CREATE INDEX IF NOT EXISTS idx_family_member_groups_member ON public.family_member_groups(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_member_groups_group ON public.family_member_groups(family_group_id);
CREATE INDEX IF NOT EXISTS idx_story_groups_story ON public.story_groups(story_id);
CREATE INDEX IF NOT EXISTS idx_story_groups_group ON public.story_groups(family_group_id);

-- Enable RLS on family groups tables
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_member_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_groups
DROP POLICY IF EXISTS "Users can view all family groups" ON public.family_groups;
CREATE POLICY "Users can view all family groups" ON public.family_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own family groups" ON public.family_groups;
CREATE POLICY "Users can insert their own family groups" ON public.family_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own family groups" ON public.family_groups;
CREATE POLICY "Users can update their own family groups" ON public.family_groups
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own family groups" ON public.family_groups;
CREATE POLICY "Users can delete their own family groups" ON public.family_groups
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for family_member_groups
DROP POLICY IF EXISTS "Users can view all family member groups" ON public.family_member_groups;
CREATE POLICY "Users can view all family member groups" ON public.family_member_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert family member groups for their members" ON public.family_member_groups;
CREATE POLICY "Users can insert family member groups for their members" ON public.family_member_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete family member groups for their members" ON public.family_member_groups;
CREATE POLICY "Users can delete family member groups for their members" ON public.family_member_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        )
    );

-- RLS policies for story_groups
DROP POLICY IF EXISTS "Users can view all story groups" ON public.story_groups;
CREATE POLICY "Users can view all story groups" ON public.story_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert story groups for their stories" ON public.story_groups;
CREATE POLICY "Users can insert story groups for their stories" ON public.story_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete story groups for their stories" ON public.story_groups;
CREATE POLICY "Users can delete story groups for their stories" ON public.story_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- Update locations RLS policies to include family groups support
-- (Now that family_member_groups table exists)
DROP POLICY IF EXISTS "Users can view locations for their family members" ON public.locations;
CREATE POLICY "Users can view locations for their family members" ON public.locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = locations.family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert locations for their family members" ON public.locations;
CREATE POLICY "Users can insert locations for their family members" ON public.locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = locations.family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update locations for their family members" ON public.locations;
CREATE POLICY "Users can update locations for their family members" ON public.locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = locations.family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete locations for their family members" ON public.locations;
CREATE POLICY "Users can delete locations for their family members" ON public.locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.family_member_groups fmg
                    JOIN public.family_groups fg ON fg.id = fmg.family_group_id
                    WHERE fmg.family_member_id = locations.family_member_id
                    AND fg.user_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- 9. ALBUMS SYSTEM
-- ============================================================================

-- Create story_categories table
CREATE TABLE IF NOT EXISTS public.story_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default story categories
INSERT INTO public.story_categories (name, description) VALUES
    ('Biography', 'Personal life stories and biographies'),
    ('Migration', 'Stories about family migration and journeys'),
    ('Heritage', 'Cultural heritage and traditions'),
    ('Memories', 'Personal memories and recollections'),
    ('Historical', 'Historical events and family history'),
    ('Other', 'Other types of stories')
ON CONFLICT (name) DO NOTHING;

-- Create albums table
CREATE TABLE IF NOT EXISTS public.albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create album_family_groups table
CREATE TABLE IF NOT EXISTS public.album_family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, family_group_id)
);

-- Create album_family_members table
CREATE TABLE IF NOT EXISTS public.album_family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, family_member_id)
);

-- Create album_story_categories table
CREATE TABLE IF NOT EXISTS public.album_story_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    story_category_id UUID REFERENCES public.story_categories(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, story_category_id)
);

-- Create album_media table
CREATE TABLE IF NOT EXISTS public.album_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(album_id, media_id)
);

-- Create indexes for albums
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_name ON public.albums(name);
CREATE INDEX IF NOT EXISTS idx_album_family_groups_album ON public.album_family_groups(album_id);
CREATE INDEX IF NOT EXISTS idx_album_family_groups_group ON public.album_family_groups(family_group_id);
CREATE INDEX IF NOT EXISTS idx_album_family_members_album ON public.album_family_members(album_id);
CREATE INDEX IF NOT EXISTS idx_album_family_members_member ON public.album_family_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_album_story_categories_album ON public.album_story_categories(album_id);
CREATE INDEX IF NOT EXISTS idx_album_story_categories_category ON public.album_story_categories(story_category_id);
CREATE INDEX IF NOT EXISTS idx_album_media_album ON public.album_media(album_id);
CREATE INDEX IF NOT EXISTS idx_album_media_media ON public.album_media(media_id);
CREATE INDEX IF NOT EXISTS idx_album_media_order ON public.album_media(album_id, display_order);

-- Enable RLS on albums tables
ALTER TABLE public.story_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_story_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_categories
DROP POLICY IF EXISTS "Users can view all story categories" ON public.story_categories;
CREATE POLICY "Users can view all story categories" ON public.story_categories
    FOR SELECT USING (true);

-- RLS policies for albums
DROP POLICY IF EXISTS "Users can view all albums" ON public.albums;
CREATE POLICY "Users can view all albums" ON public.albums
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own albums" ON public.albums;
CREATE POLICY "Users can insert their own albums" ON public.albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own albums" ON public.albums;
CREATE POLICY "Users can update their own albums" ON public.albums
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own albums" ON public.albums;
CREATE POLICY "Users can delete their own albums" ON public.albums
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for album_family_groups
DROP POLICY IF EXISTS "Users can view all album family groups" ON public.album_family_groups;
CREATE POLICY "Users can view all album family groups" ON public.album_family_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert album family groups for their albums" ON public.album_family_groups;
CREATE POLICY "Users can insert album family groups for their albums" ON public.album_family_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete album family groups for their albums" ON public.album_family_groups;
CREATE POLICY "Users can delete album family groups for their albums" ON public.album_family_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- RLS policies for album_family_members
DROP POLICY IF EXISTS "Users can view all album family members" ON public.album_family_members;
CREATE POLICY "Users can view all album family members" ON public.album_family_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert album family members for their albums" ON public.album_family_members;
CREATE POLICY "Users can insert album family members for their albums" ON public.album_family_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete album family members for their albums" ON public.album_family_members;
CREATE POLICY "Users can delete album family members for their albums" ON public.album_family_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- RLS policies for album_story_categories
DROP POLICY IF EXISTS "Users can view all album story categories" ON public.album_story_categories;
CREATE POLICY "Users can view all album story categories" ON public.album_story_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert album story categories for their albums" ON public.album_story_categories;
CREATE POLICY "Users can insert album story categories for their albums" ON public.album_story_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete album story categories for their albums" ON public.album_story_categories;
CREATE POLICY "Users can delete album story categories for their albums" ON public.album_story_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- RLS policies for album_media
DROP POLICY IF EXISTS "Users can view all album media" ON public.album_media;
CREATE POLICY "Users can view all album media" ON public.album_media
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert album media for their albums" ON public.album_media;
CREATE POLICY "Users can insert album media for their albums" ON public.album_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.media 
            WHERE id = media_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update album media for their albums" ON public.album_media;
CREATE POLICY "Users can update album media for their albums" ON public.album_media
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete album media for their albums" ON public.album_media;
CREATE POLICY "Users can delete album media for their albums" ON public.album_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums 
            WHERE id = album_id AND user_id = auth.uid()
        )
    );

-- Function to update albums updated_at timestamp
CREATE OR REPLACE FUNCTION update_albums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for albums updated_at
DROP TRIGGER IF EXISTS update_albums_updated_at ON public.albums;
CREATE TRIGGER update_albums_updated_at
    BEFORE UPDATE ON public.albums
    FOR EACH ROW
    EXECUTE FUNCTION update_albums_updated_at();

-- ============================================================================
-- 10. USER TREE LAYOUTS
-- ============================================================================

-- Create user_tree_layouts table
CREATE TABLE IF NOT EXISTS public.user_tree_layouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    node_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
    viewport_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for user_tree_layouts
CREATE INDEX IF NOT EXISTS idx_user_tree_layouts_user_id ON public.user_tree_layouts(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_user_tree_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_tree_layouts updated_at
DROP TRIGGER IF EXISTS update_user_tree_layouts_updated_at ON public.user_tree_layouts;
CREATE TRIGGER update_user_tree_layouts_updated_at
    BEFORE UPDATE ON public.user_tree_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tree_layouts_updated_at();

-- Enable RLS on user_tree_layouts
ALTER TABLE public.user_tree_layouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_tree_layouts
DROP POLICY IF EXISTS "Users can view their own tree layout" ON public.user_tree_layouts;
CREATE POLICY "Users can view their own tree layout" ON public.user_tree_layouts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tree layout" ON public.user_tree_layouts;
CREATE POLICY "Users can insert their own tree layout" ON public.user_tree_layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tree layout" ON public.user_tree_layouts;
CREATE POLICY "Users can update their own tree layout" ON public.user_tree_layouts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tree layout" ON public.user_tree_layouts;
CREATE POLICY "Users can delete their own tree layout" ON public.user_tree_layouts
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all tree layouts" ON public.user_tree_layouts;
CREATE POLICY "Admins can view all tree layouts" ON public.user_tree_layouts
    FOR SELECT USING (public.is_user_admin(auth.uid()));

-- ============================================================================
-- 11. ADMIN FUNCTIONS
-- ============================================================================

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to update roles
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user roles';
    END IF;
    
    -- Validate the new role
    IF new_role NOT IN ('admin', 'editor', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be one of: admin, editor, viewer', new_role;
    END IF;
    
    -- Update the user's role
    UPDATE public.user_profiles
    SET role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;
END;
$$;

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    role TEXT,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT up.role INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();
    
    -- Only allow admins to get all users
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can view all users';
    END IF;
    
    -- Return all users with email from auth.users
    RETURN QUERY
    SELECT 
        up.id,
        up.role,
        up.display_name,
        COALESCE(au.email::TEXT, '') as email,
        up.created_at,
        up.updated_at
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    ORDER BY up.created_at DESC;
END;
$$;

-- Function to update user display name (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_display_name(
    p_user_id UUID,
    p_display_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO v_current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to update display names
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user display names';
    END IF;
    
    -- Update the display name
    UPDATE public.user_profiles
    SET display_name = p_display_name,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
END;
$$;

-- Function to ensure user profile exists (creates if missing)
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if profile exists
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = user_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Create profile for the user
    INSERT INTO public.user_profiles (id, role, display_name)
    SELECT 
        au.id,
        'viewer'::TEXT,
        COALESCE(au.raw_user_meta_data->>'display_name', au.email)
    FROM auth.users au
    WHERE au.id = user_id
    ON CONFLICT (id) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- If we can't access auth.users, try creating with minimal info
        INSERT INTO public.user_profiles (id, role, display_name)
        VALUES (user_id, 'viewer', NULL)
        ON CONFLICT (id) DO NOTHING;
        RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_display_name(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- This migration creates the complete database schema including:
-- ✓ User profiles and role system (admin, editor, viewer)
-- ✓ Family members, relations, locations
-- ✓ Family stories, story members, story groups
-- ✓ Family events and participants
-- ✓ Media and media relationships
-- ✓ Artifacts and artifact relationships
-- ✓ Family groups and member groups
-- ✓ Albums system
-- ✓ User tree layouts
-- ✓ Admin functions
-- ✓ Complete RLS policies (including import fix for family_members)
-- ✓ All indexes and triggers
--
-- The migration is idempotent and can be safely run multiple times.
-- All changes use IF NOT EXISTS, IF EXISTS, and DROP ... IF EXISTS to prevent errors.
--
-- IMPORTANT: The family_members INSERT policy allows ANY authenticated user
-- to create family members when created_by = auth.uid(), which fixes the
-- import issue where users with 'viewer' role couldn't import data.
