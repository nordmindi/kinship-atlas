-- Legacy Stories Module Schema
-- This migration adds the narrative layer to capture biographical stories, migration journeys, and historical memories

-- Create family_stories table
CREATE TABLE IF NOT EXISTS public.family_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attrs JSONB DEFAULT '{}'::jsonb -- For privacy settings, tags, etc.
);

-- story_members table already exists, add role column if it doesn't exist
ALTER TABLE public.story_members 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'participant';

-- family_events table already exists in initial schema, skip creation

-- event_participants table already exists, add role column if it doesn't exist
ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'participant';

-- media table already exists in initial schema, skip creation

-- story_media and event_media tables already exist in initial schema, skip creation

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_stories_author_id ON public.family_stories(author_id);
CREATE INDEX IF NOT EXISTS idx_family_stories_date ON public.family_stories(date);
CREATE INDEX IF NOT EXISTS idx_story_members_story_id ON public.story_members(story_id);
CREATE INDEX IF NOT EXISTS idx_story_members_family_member_id ON public.story_members(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_events_creator_id ON public.family_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_family_events_date ON public.family_events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_family_member_id ON public.event_participants(family_member_id);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_story_media_story_id ON public.story_media(story_id);
CREATE INDEX IF NOT EXISTS idx_event_media_event_id ON public.event_media(event_id);

-- Create SQL views for easier querying
CREATE OR REPLACE VIEW v_story_with_people AS
SELECT 
    s.*,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', fm.id,
                'name', fm.first_name || ' ' || fm.last_name,
                'role', sm.role
            )
        ) FILTER (WHERE fm.id IS NOT NULL),
        '[]'::json
    ) AS people
FROM family_stories s
LEFT JOIN story_members sm ON sm.story_id = s.id
LEFT JOIN family_members fm ON fm.id = sm.family_member_id
GROUP BY s.id;

CREATE OR REPLACE VIEW v_event_with_people AS
SELECT 
    e.*,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'id', fm.id,
                'name', fm.first_name || ' ' || fm.last_name,
                'role', ep.role
            )
        ) FILTER (WHERE fm.id IS NOT NULL),
        '[]'::json
    ) AS people
FROM family_events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
LEFT JOIN family_members fm ON fm.id = ep.family_member_id
GROUP BY e.id;

CREATE OR REPLACE VIEW v_member_timeline AS
SELECT 
    fm.id AS member_id, 
    'event' AS item_type, 
    e.id AS item_id,
    e.title, 
    e.event_date::date AS date, 
    e.location, 
    e.lat, 
    e.lng,
    e.description,
    NULL::text AS content
FROM family_members fm
JOIN event_participants ep ON ep.family_member_id = fm.id
JOIN family_events e ON e.id = ep.event_id

UNION ALL

SELECT 
    fm.id AS member_id, 
    'story' AS item_type, 
    s.id AS item_id,
    s.title, 
    s.date::date AS date, 
    NULL::text AS location, 
    NULL::float AS lat, 
    NULL::float AS lng,
    NULL::text AS description,
    s.content
FROM family_members fm
JOIN story_members sm ON sm.family_member_id = fm.id
JOIN family_stories s ON s.id = sm.story_id;

-- Create RLS policies
ALTER TABLE public.family_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

-- Family stories policies already exist in initial schema, skip creation

-- Story members policies already exist in initial schema, skip creation

-- Family events policies
-- Family events policies already exist in initial schema, skip creation

-- Event participants policies already exist in initial schema, skip creation

-- Media policies already exist in initial schema, skip creation

-- Story media and event media policies already exist in initial schema, skip creation

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_family_stories_updated_at BEFORE UPDATE ON public.family_stories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_events_updated_at BEFORE UPDATE ON public.family_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
