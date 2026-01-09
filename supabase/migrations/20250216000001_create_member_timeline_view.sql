-- Create v_member_timeline view
-- This view combines stories and events for timeline display
-- Created: 2025-02-16

BEGIN;

-- Drop the view if it exists
DROP VIEW IF EXISTS public.v_member_timeline;

-- Create the view that unions stories and events
CREATE VIEW public.v_member_timeline AS
-- Stories with their associated members
SELECT 
    sm.family_member_id AS member_id,
    'story'::TEXT AS item_type,
    s.id::TEXT AS item_id,
    s.title,
    s.date,
    s.content,
    NULL::TEXT AS description,
    s.location,
    s.lat,
    s.lng
FROM public.family_stories s
INNER JOIN public.story_members sm ON sm.story_id = s.id
WHERE s.date IS NOT NULL

UNION ALL

-- Events with their associated members
SELECT 
    ep.family_member_id AS member_id,
    'event'::TEXT AS item_type,
    e.id::TEXT AS item_id,
    e.title,
    e.event_date AS date,
    NULL::TEXT AS content,
    e.description,
    e.location,
    e.lat,
    e.lng
FROM public.family_events e
INNER JOIN public.event_participants ep ON ep.event_id = e.id
WHERE e.event_date IS NOT NULL;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.v_member_timeline TO authenticated;

-- Add comment
COMMENT ON VIEW public.v_member_timeline IS 
'Unified timeline view combining stories and events for family members. Each row represents a timeline item (story or event) associated with a family member.';

COMMIT;
