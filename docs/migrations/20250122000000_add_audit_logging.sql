-- Add comprehensive audit logging system
-- This migration creates tables and functions for tracking all data changes

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- GENERIC AUDIT LOG FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[];
    old_json JSONB;
    new_json JSONB;
BEGIN
    -- Determine changed fields
    IF TG_OP = 'UPDATE' THEN
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);
        
        -- Find changed fields
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM (
            SELECT key
            FROM jsonb_each(old_json)
            WHERE value IS DISTINCT FROM new_json->key
        ) AS changed;
        
        -- Only log if something actually changed
        IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
            INSERT INTO public.audit_log (
                table_name,
                record_id,
                action,
                user_id,
                old_data,
                new_data,
                changed_fields
            ) VALUES (
                TG_TABLE_NAME,
                COALESCE(NEW.id, OLD.id),
                TG_OP,
                auth.uid(),
                old_json,
                new_json,
                changed_fields
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        new_json := to_jsonb(NEW);
        
        INSERT INTO public.audit_log (
            table_name,
            record_id,
            action,
            user_id,
            old_data,
            new_data
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            auth.uid(),
            NULL,
            new_json
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        old_json := to_jsonb(OLD);
        
        INSERT INTO public.audit_log (
            table_name,
            record_id,
            action,
            user_id,
            old_data,
            new_data
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            auth.uid(),
            old_json,
            NULL
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE AUDIT TRIGGERS FOR CRITICAL TABLES
-- ============================================================================

-- Family members audit
DROP TRIGGER IF EXISTS audit_family_members ON public.family_members;
CREATE TRIGGER audit_family_members
    AFTER INSERT OR UPDATE OR DELETE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Relations audit
DROP TRIGGER IF EXISTS audit_relations ON public.relations;
CREATE TRIGGER audit_relations
    AFTER INSERT OR UPDATE OR DELETE ON public.relations
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Stories audit
DROP TRIGGER IF EXISTS audit_family_stories ON public.family_stories;
CREATE TRIGGER audit_family_stories
    AFTER INSERT OR UPDATE OR DELETE ON public.family_stories
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Media audit
DROP TRIGGER IF EXISTS audit_media ON public.media;
CREATE TRIGGER audit_media
    AFTER INSERT OR UPDATE OR DELETE ON public.media
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Locations audit
DROP TRIGGER IF EXISTS audit_locations ON public.locations;
CREATE TRIGGER audit_locations
    AFTER INSERT OR UPDATE OR DELETE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================================================
-- FUNCTION TO GET AUDIT HISTORY FOR A RECORD
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_history(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS TABLE (
    id UUID,
    action TEXT,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.user_id,
        al.old_data,
        al.new_data,
        al.changed_fields,
        al.created_at
    FROM public.audit_log al
    WHERE al.table_name = p_table_name
      AND al.record_id = p_record_id
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION TO RESTORE RECORD FROM AUDIT LOG
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_from_audit(
    p_audit_log_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_audit_record RECORD;
    v_table_name TEXT;
    v_record_id UUID;
    v_restore_data JSONB;
BEGIN
    -- Get audit record
    SELECT * INTO v_audit_record
    FROM public.audit_log
    WHERE id = p_audit_log_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit log record not found';
    END IF;
    
    v_table_name := v_audit_record.table_name;
    v_record_id := v_audit_record.record_id;
    
    -- Determine restore data (use old_data for DELETE, new_data for UPDATE)
    IF v_audit_record.action = 'DELETE' THEN
        v_restore_data := v_audit_record.old_data;
    ELSIF v_audit_record.action = 'UPDATE' THEN
        v_restore_data := v_audit_record.old_data;
    ELSE
        RAISE EXCEPTION 'Cannot restore from INSERT action';
    END IF;
    
    -- Restore based on table name
    IF v_table_name = 'family_members' THEN
        INSERT INTO public.family_members
        SELECT * FROM jsonb_populate_record(NULL::public.family_members, v_restore_data)
        ON CONFLICT (id) DO UPDATE
        SET 
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            birth_date = EXCLUDED.birth_date,
            death_date = EXCLUDED.death_date,
            birth_place = EXCLUDED.birth_place,
            bio = EXCLUDED.bio,
            gender = EXCLUDED.gender,
            updated_at = NOW();
            
    ELSIF v_table_name = 'family_stories' THEN
        INSERT INTO public.family_stories
        SELECT * FROM jsonb_populate_record(NULL::public.family_stories, v_restore_data)
        ON CONFLICT (id) DO UPDATE
        SET 
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            date = EXCLUDED.date,
            updated_at = NOW();
            
    -- Add more table restores as needed
    ELSE
        RAISE EXCEPTION 'Table % not supported for restore', v_table_name;
    END IF;
    
    -- Log the restore action
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        user_id,
        old_data,
        new_data
    ) VALUES (
        v_table_name,
        v_record_id,
        'RESTORE',
        auth.uid(),
        NULL,
        v_restore_data
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.audit_log IS 'Comprehensive audit log for all data changes';
COMMENT ON FUNCTION public.audit_trigger_function() IS 'Generic trigger function for audit logging';
COMMENT ON FUNCTION public.get_audit_history(TEXT, UUID) IS 'Get audit history for a specific record';
COMMENT ON FUNCTION public.restore_from_audit(UUID) IS 'Restore a record from audit log';

