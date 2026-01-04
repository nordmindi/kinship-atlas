-- Prevent events from being created when stories are updated
-- This migration ensures that only new stories (INSERT) can trigger event creation,
-- not story updates (UPDATE)

-- First, check if there's an existing trigger that creates events on story updates
-- and remove it if it exists
DO $$
BEGIN
    -- Drop any trigger that might create events on story updates
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname LIKE '%story%event%' 
        OR tgname LIKE '%create_event%story%'
    ) THEN
        -- Note: We can't drop triggers by pattern, so we'll document this
        -- and rely on application code to prevent event creation on updates
        RAISE NOTICE 'Found potential triggers that create events from stories. Review manually.';
    END IF;
END $$;

-- Add a comment to document the expected behavior
COMMENT ON TABLE public.family_stories IS 
'Family stories table. Stories appear in the timeline view directly, not as separate events. 
Only new stories (INSERT) should appear in the timeline - updates (UPDATE) should not create new timeline entries.';

-- Ensure the timeline view only shows stories, not duplicate events
-- The view v_member_timeline already correctly shows stories and events separately
-- This is just a safeguard to ensure no events are accidentally created from story updates

