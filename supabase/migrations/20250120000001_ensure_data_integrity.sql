-- Ensure Data Integrity and Robust Constraints
-- This migration consolidates and ensures all constraints, indexes, and triggers are properly set up
-- It's idempotent and can be run multiple times safely

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Ensure family_members foreign keys are properly set up
DO $$
BEGIN
    -- Drop and recreate created_by constraint if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_created_by_fkey;
        ALTER TABLE public.family_members 
        ADD CONSTRAINT family_members_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Ensure branch_root self-reference is properly set up (if column exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'branch_root'
    ) THEN
        ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_branch_root_fkey;
        ALTER TABLE public.family_members 
        ADD CONSTRAINT family_members_branch_root_fkey 
        FOREIGN KEY (branch_root) REFERENCES public.family_members(id) ON DELETE SET NULL;
    END IF;
    
    -- Ensure user_id constraint exists (legacy support)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_user_id_fkey;
        ALTER TABLE public.family_members 
        ADD CONSTRAINT family_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure relations foreign keys are properly set up
DO $$
BEGIN
    ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_from_member_id_fkey;
    ALTER TABLE public.relations 
    ADD CONSTRAINT relations_from_member_id_fkey 
    FOREIGN KEY (from_member_id) REFERENCES public.family_members(id) ON DELETE CASCADE;
    
    ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_to_member_id_fkey;
    ALTER TABLE public.relations 
    ADD CONSTRAINT relations_to_member_id_fkey 
    FOREIGN KEY (to_member_id) REFERENCES public.family_members(id) ON DELETE CASCADE;
END $$;

-- Ensure locations foreign key is properly set up
DO $$
BEGIN
    ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_family_member_id_fkey;
    ALTER TABLE public.locations 
    ADD CONSTRAINT locations_family_member_id_fkey 
    FOREIGN KEY (family_member_id) REFERENCES public.family_members(id) ON DELETE CASCADE;
END $$;

-- ============================================================================
-- CHECK CONSTRAINTS
-- ============================================================================

-- Ensure relation_type constraint is correct
DO $$
BEGIN
    ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_relation_type_check;
    ALTER TABLE public.relations 
    ADD CONSTRAINT relations_relation_type_check 
    CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling'));
END $$;

-- Ensure gender constraint is correct
DO $$
BEGIN
    ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_gender_check;
    ALTER TABLE public.family_members 
    ADD CONSTRAINT family_members_gender_check 
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
END $$;

-- Prevent self-referencing relations
DO $$
BEGIN
    ALTER TABLE public.relations DROP CONSTRAINT IF EXISTS relations_no_self_reference;
    ALTER TABLE public.relations 
    ADD CONSTRAINT relations_no_self_reference 
    CHECK (from_member_id != to_member_id);
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Family members indexes
DO $$
BEGIN
    -- Create created_by index if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'created_by'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_family_members_created_by ON public.family_members(created_by) WHERE created_by IS NOT NULL;
    END IF;
    
    -- Create branch_root index if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'branch_root'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_family_members_branch_root ON public.family_members(branch_root) WHERE branch_root IS NOT NULL;
    END IF;
    
    -- Create is_root_member index if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'family_members' 
        AND column_name = 'is_root_member'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_family_members_is_root ON public.family_members(is_root_member) WHERE is_root_member = TRUE;
    END IF;
END $$;

-- Create other family member indexes (these columns should always exist)
CREATE INDEX IF NOT EXISTS idx_family_members_name ON public.family_members(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_family_members_created_at ON public.family_members(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_members_name ON public.family_members(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_family_members_created_at ON public.family_members(created_at DESC);

-- Relations indexes
CREATE INDEX IF NOT EXISTS idx_relations_from_member ON public.relations(from_member_id);
CREATE INDEX IF NOT EXISTS idx_relations_to_member ON public.relations(to_member_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON public.relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_relations_bidirectional ON public.relations(from_member_id, to_member_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_relations_created_at ON public.relations(created_at DESC);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_family_member ON public.locations(family_member_id);
CREATE INDEX IF NOT EXISTS idx_locations_current ON public.locations(current_residence) WHERE current_residence = TRUE;
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON public.locations(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_stories_updated_at ON public.family_stories;
CREATE TRIGGER update_family_stories_updated_at
    BEFORE UPDATE ON public.family_stories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_events_updated_at ON public.family_events;
CREATE TRIGGER update_family_events_updated_at
    BEFORE UPDATE ON public.family_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_profiles trigger if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- DATA VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate birth and death dates
CREATE OR REPLACE FUNCTION public.validate_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure death_date is after birth_date if both exist
    IF NEW.birth_date IS NOT NULL AND NEW.death_date IS NOT NULL THEN
        IF NEW.death_date < NEW.birth_date THEN
            RAISE EXCEPTION 'Death date cannot be before birth date';
        END IF;
    END IF;
    
    -- Ensure dates are not in the future (with some tolerance for data entry)
    IF NEW.birth_date IS NOT NULL AND NEW.birth_date > CURRENT_DATE + INTERVAL '1 year' THEN
        RAISE WARNING 'Birth date is more than 1 year in the future';
    END IF;
    
    IF NEW.death_date IS NOT NULL AND NEW.death_date > CURRENT_DATE THEN
        RAISE WARNING 'Death date is in the future';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply date validation trigger
DROP TRIGGER IF EXISTS validate_family_member_dates ON public.family_members;
CREATE TRIGGER validate_family_member_dates
    BEFORE INSERT OR UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_dates();

-- ============================================================================
-- CLEANUP ORPHANED DATA FUNCTIONS
-- ============================================================================

-- Function to find and optionally clean orphaned relations
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_relations()
RETURNS TABLE(
    orphaned_count INTEGER,
    cleaned_count INTEGER
) AS $$
DECLARE
    orphaned INTEGER;
    cleaned INTEGER;
BEGIN
    -- Count orphaned relations
    SELECT COUNT(*) INTO orphaned
    FROM public.relations r
    LEFT JOIN public.family_members fm1 ON r.from_member_id = fm1.id
    LEFT JOIN public.family_members fm2 ON r.to_member_id = fm2.id
    WHERE fm1.id IS NULL OR fm2.id IS NULL;
    
    -- Clean up orphaned relations (CASCADE should handle this, but this is a safety net)
    DELETE FROM public.relations r
    WHERE NOT EXISTS (
        SELECT 1 FROM public.family_members WHERE id = r.from_member_id
    ) OR NOT EXISTS (
        SELECT 1 FROM public.family_members WHERE id = r.to_member_id
    );
    
    GET DIAGNOSTICS cleaned = ROW_COUNT;
    
    RETURN QUERY SELECT orphaned, cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find and optionally clean orphaned locations
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_locations()
RETURNS TABLE(
    orphaned_count INTEGER,
    cleaned_count INTEGER
) AS $$
DECLARE
    orphaned INTEGER;
    cleaned INTEGER;
BEGIN
    -- Count orphaned locations
    SELECT COUNT(*) INTO orphaned
    FROM public.locations l
    LEFT JOIN public.family_members fm ON l.family_member_id = fm.id
    WHERE fm.id IS NULL;
    
    -- Clean up orphaned locations
    DELETE FROM public.locations l
    WHERE NOT EXISTS (
        SELECT 1 FROM public.family_members WHERE id = l.family_member_id
    );
    
    GET DIAGNOSTICS cleaned = ROW_COUNT;
    
    RETURN QUERY SELECT orphaned, cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.family_members IS 'Core table storing family member information with branch tracking';
COMMENT ON TABLE public.relations IS 'Stores relationships between family members with automatic bidirectional consistency';
COMMENT ON TABLE public.locations IS 'Geographic locations associated with family members';
COMMENT ON TABLE public.schema_migrations IS 'Tracks which database migrations have been applied';
COMMENT ON FUNCTION public.validate_dates() IS 'Validates that birth and death dates are logically consistent';
COMMENT ON FUNCTION public.cleanup_orphaned_relations() IS 'Finds and optionally removes relations referencing non-existent family members';
COMMENT ON FUNCTION public.cleanup_orphaned_locations() IS 'Finds and optionally removes locations referencing non-existent family members';

