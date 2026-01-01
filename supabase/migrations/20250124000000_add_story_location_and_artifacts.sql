-- Add location support to stories and create artifacts system
-- This migration enhances stories with location data and artifact management

-- Add location fields to family_stories table
ALTER TABLE public.family_stories
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Create artifacts table for physical or digital artifacts (documents, heirlooms, etc.)
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

-- Create story_artifacts junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.story_artifacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES public.family_stories(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES public.artifacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, artifact_id)
);

-- Create artifact_media junction table for artifact photos/documents
CREATE TABLE IF NOT EXISTS public.artifact_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artifact_id UUID REFERENCES public.artifacts(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(artifact_id, media_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_stories_location ON public.family_stories(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artifacts_owner_id ON public.artifacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON public.artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_date_created ON public.artifacts(date_created);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_story_id ON public.story_artifacts(story_id);
CREATE INDEX IF NOT EXISTS idx_story_artifacts_artifact_id ON public.story_artifacts(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_artifact_id ON public.artifact_media(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_media_media_id ON public.artifact_media(media_id);

-- Enable Row Level Security
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for artifacts
CREATE POLICY "Users can view all artifacts" ON public.artifacts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own artifacts" ON public.artifacts
    FOR INSERT WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can update their own artifacts" ON public.artifacts
    FOR UPDATE USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can delete their own artifacts" ON public.artifacts
    FOR DELETE USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Create RLS policies for story_artifacts
CREATE POLICY "Users can view all story artifacts" ON public.story_artifacts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert story artifacts for their stories" ON public.story_artifacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete story artifacts for their stories" ON public.story_artifacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_stories 
            WHERE id = story_id AND author_id = auth.uid()
        )
    );

-- Create RLS policies for artifact_media
CREATE POLICY "Users can view all artifact media" ON public.artifact_media
    FOR SELECT USING (true);

CREATE POLICY "Users can insert artifact media for their artifacts" ON public.artifact_media
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.artifacts 
            WHERE id = artifact_id AND (owner_id = auth.uid() OR owner_id IS NULL)
        )
    );

CREATE POLICY "Users can delete artifact media for their artifacts" ON public.artifact_media
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.artifacts 
            WHERE id = artifact_id AND (owner_id = auth.uid() OR owner_id IS NULL)
        )
    );

-- Create updated_at trigger for artifacts
CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON public.artifacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the timeline view to include story locations
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
    s.location, 
    s.lat, 
    s.lng,
    NULL::text AS description,
    s.content
FROM family_members fm
JOIN story_members sm ON sm.family_member_id = fm.id
JOIN family_stories s ON s.id = sm.story_id;

