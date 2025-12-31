-- Add soft delete support to critical tables
-- This prevents accidental data loss and enables data recovery

-- ============================================================================
-- ADD DELETED_AT COLUMNS
-- ============================================================================

-- Family members
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Relations
ALTER TABLE public.relations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Stories
ALTER TABLE public.family_stories 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Media
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Locations
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- CREATE INDEXES FOR SOFT DELETE QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_family_members_deleted_at ON public.family_members(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_relations_deleted_at ON public.relations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_family_stories_deleted_at ON public.family_stories(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_deleted_at ON public.media(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON public.locations(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- SOFT DELETE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_record(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Build dynamic SQL based on table name
    v_sql := format(
        'UPDATE %I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        p_table_name
    );
    
    EXECUTE v_sql USING p_record_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RESTORE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_deleted_record(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Build dynamic SQL to restore
    v_sql := format(
        'UPDATE %I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
        p_table_name
    );
    
    EXECUTE v_sql USING p_record_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERMANENT DELETE FUNCTION (Admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.permanent_delete_record(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_sql TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only administrators can permanently delete records';
    END IF;
    
    -- Build dynamic SQL for permanent delete
    v_sql := format('DELETE FROM %I WHERE id = $1', p_table_name);
    
    EXECUTE v_sql USING p_record_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE RLS POLICIES TO EXCLUDE DELETED RECORDS
-- ============================================================================

-- Note: RLS policies should automatically exclude deleted records
-- when using WHERE deleted_at IS NULL in queries
-- This is handled at the application level for flexibility

-- ============================================================================
-- VIEWS FOR ACTIVE RECORDS ONLY
-- ============================================================================

-- Family members view (active only)
CREATE OR REPLACE VIEW public.family_members_active AS
SELECT * FROM public.family_members
WHERE deleted_at IS NULL;

-- Relations view (active only)
CREATE OR REPLACE VIEW public.relations_active AS
SELECT * FROM public.relations
WHERE deleted_at IS NULL;

-- Stories view (active only)
CREATE OR REPLACE VIEW public.family_stories_active AS
SELECT * FROM public.family_stories
WHERE deleted_at IS NULL;

-- Media view (active only)
CREATE OR REPLACE VIEW public.media_active AS
SELECT * FROM public.media
WHERE deleted_at IS NULL;

-- Locations view (active only)
CREATE OR REPLACE VIEW public.locations_active AS
SELECT * FROM public.locations
WHERE deleted_at IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.family_members.deleted_at IS 'Soft delete timestamp. NULL means record is active.';
COMMENT ON COLUMN public.relations.deleted_at IS 'Soft delete timestamp. NULL means record is active.';
COMMENT ON COLUMN public.family_stories.deleted_at IS 'Soft delete timestamp. NULL means record is active.';
COMMENT ON COLUMN public.media.deleted_at IS 'Soft delete timestamp. NULL means record is active.';
COMMENT ON COLUMN public.locations.deleted_at IS 'Soft delete timestamp. NULL means record is active.';
COMMENT ON FUNCTION public.soft_delete_record(TEXT, UUID) IS 'Soft delete a record by setting deleted_at timestamp';
COMMENT ON FUNCTION public.restore_deleted_record(TEXT, UUID) IS 'Restore a soft-deleted record';
COMMENT ON FUNCTION public.permanent_delete_record(TEXT, UUID) IS 'Permanently delete a record (admin only)';

