-- Initial database schema for Kinship Atlas
-- This migration creates all the necessary tables for the genealogy platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
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

-- Create family_stories table
CREATE TABLE IF NOT EXISTS public.family_stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_name ON public.family_members(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_relations_from_member ON public.relations(from_member_id);
CREATE INDEX IF NOT EXISTS idx_relations_to_member ON public.relations(to_member_id);
CREATE INDEX IF NOT EXISTS idx_locations_family_member ON public.locations(family_member_id);
CREATE INDEX IF NOT EXISTS idx_locations_current ON public.locations(current_residence);
CREATE INDEX IF NOT EXISTS idx_story_members_story ON public.story_members(story_id);
CREATE INDEX IF NOT EXISTS idx_story_members_member ON public.story_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_member ON public.event_participants(family_member_id);
CREATE INDEX IF NOT EXISTS idx_media_user ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media(media_type);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_members
CREATE POLICY "Users can view all family members" ON public.family_members
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own family members" ON public.family_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family members" ON public.family_members
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family members" ON public.family_members
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for relations
CREATE POLICY "Users can view all relations" ON public.relations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert relations for their family members" ON public.relations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = from_member_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete relations for their family members" ON public.relations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = from_member_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for locations
CREATE POLICY "Users can view all locations" ON public.locations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert locations for their family members" ON public.locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update locations for their family members" ON public.locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete locations for their family members" ON public.locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for family_stories
CREATE POLICY "Users can view all family stories" ON public.family_stories
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own family stories" ON public.family_stories
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own family stories" ON public.family_stories
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own family stories" ON public.family_stories
    FOR DELETE USING (auth.uid() = author_id);

-- Create RLS policies for story_members
CREATE POLICY "Users can view all story members" ON public.story_members
    FOR SELECT USING (true);

CREATE POLICY "Users can insert story members for their stories" ON public.story_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete story members for their stories" ON public.story_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- Create RLS policies for family_events
CREATE POLICY "Users can view all family events" ON public.family_events
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own family events" ON public.family_events
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own family events" ON public.family_events
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own family events" ON public.family_events
    FOR DELETE USING (auth.uid() = creator_id);

-- Create RLS policies for event_participants
CREATE POLICY "Users can view all event participants" ON public.event_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can insert event participants for their events" ON public.event_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete event participants for their events" ON public.event_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

-- Create RLS policies for media
CREATE POLICY "Users can view all media" ON public.media
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own media" ON public.media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media" ON public.media
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media" ON public.media
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for story_media
CREATE POLICY "Users can view all story media" ON public.story_media
    FOR SELECT USING (true);

CREATE POLICY "Users can insert story media for their stories" ON public.story_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete story media for their stories" ON public.story_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- Create RLS policies for event_media
CREATE POLICY "Users can view all event media" ON public.event_media
    FOR SELECT USING (true);

CREATE POLICY "Users can insert event media for their events" ON public.event_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete event media for their events" ON public.event_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_events 
            WHERE id = event_id AND creator_id = auth.uid()
        )
    );
