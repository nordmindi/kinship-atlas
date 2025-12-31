-- Migration: Add Relationship Consistency Triggers
-- This migration adds database-level consistency checks and triggers
-- to prevent relationship corruption and ensure data integrity

-- Create a function to check relationship consistency
CREATE OR REPLACE FUNCTION check_relationship_consistency()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INTEGER;
    reverse_relation_type TEXT;
    is_auto_created BOOLEAN := FALSE;
BEGIN
    -- Prevent self-relationships
    IF NEW.from_member_id = NEW.to_member_id THEN
        RAISE EXCEPTION 'A person cannot have a relationship with themselves';
    END IF;

    -- Check if this is an auto-created reciprocal relationship (prevent infinite recursion)
    -- We use a session variable to track auto-created relationships
    IF current_setting('relationship_manager.auto_creating', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Check for duplicate relationships
    SELECT COUNT(*) INTO existing_count
    FROM relations
    WHERE from_member_id = NEW.from_member_id
      AND to_member_id = NEW.to_member_id
      AND relation_type = NEW.relation_type
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF existing_count > 0 THEN
        RAISE EXCEPTION 'Duplicate relationship already exists';
    END IF;

    -- For parent-child relationships, ensure bidirectional consistency
    IF NEW.relation_type IN ('parent', 'child') THEN
        -- Determine the reverse relationship type
        reverse_relation_type := CASE 
            WHEN NEW.relation_type = 'parent' THEN 'child'
            WHEN NEW.relation_type = 'child' THEN 'parent'
        END;

        -- Check if the reverse relationship exists
        SELECT COUNT(*) INTO existing_count
        FROM relations
        WHERE from_member_id = NEW.to_member_id
          AND to_member_id = NEW.from_member_id
          AND relation_type = reverse_relation_type;

        -- If this is an INSERT and no reverse relationship exists, create it
        IF TG_OP = 'INSERT' AND existing_count = 0 THEN
            -- Set session variable to prevent infinite recursion
            PERFORM set_config('relationship_manager.auto_creating', 'true', true);
            
            INSERT INTO relations (from_member_id, to_member_id, relation_type, created_at)
            VALUES (NEW.to_member_id, NEW.from_member_id, reverse_relation_type, NOW());
            
            -- Reset session variable
            PERFORM set_config('relationship_manager.auto_creating', 'false', true);
        END IF;
    END IF;

    -- For spouse and sibling relationships, ensure bidirectional consistency
    IF NEW.relation_type IN ('spouse', 'sibling') THEN
        -- Check if the reverse relationship exists
        SELECT COUNT(*) INTO existing_count
        FROM relations
        WHERE from_member_id = NEW.to_member_id
          AND to_member_id = NEW.from_member_id
          AND relation_type = NEW.relation_type;

        -- If this is an INSERT and no reverse relationship exists, create it
        IF TG_OP = 'INSERT' AND existing_count = 0 THEN
            -- Set session variable to prevent infinite recursion
            PERFORM set_config('relationship_manager.auto_creating', 'true', true);
            
            INSERT INTO relations (from_member_id, to_member_id, relation_type, created_at)
            VALUES (NEW.to_member_id, NEW.from_member_id, NEW.relation_type, NOW());
            
            -- Reset session variable
            PERFORM set_config('relationship_manager.auto_creating', 'false', true);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle relationship deletion
CREATE OR REPLACE FUNCTION handle_relationship_deletion()
RETURNS TRIGGER AS $$
DECLARE
    reverse_relation_type TEXT;
BEGIN
    -- For parent-child relationships, delete the reverse relationship
    IF OLD.relation_type IN ('parent', 'child') THEN
        reverse_relation_type := CASE 
            WHEN OLD.relation_type = 'parent' THEN 'child'
            WHEN OLD.relation_type = 'child' THEN 'parent'
        END;

        DELETE FROM relations
        WHERE from_member_id = OLD.to_member_id
          AND to_member_id = OLD.from_member_id
          AND relation_type = reverse_relation_type;
    END IF;

    -- For spouse and sibling relationships, delete the reverse relationship
    IF OLD.relation_type IN ('spouse', 'sibling') THEN
        DELETE FROM relations
        WHERE from_member_id = OLD.to_member_id
          AND to_member_id = OLD.from_member_id
          AND relation_type = OLD.relation_type;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for relationship consistency
DROP TRIGGER IF EXISTS trigger_check_relationship_consistency ON relations;
CREATE TRIGGER trigger_check_relationship_consistency
    BEFORE INSERT OR UPDATE ON relations
    FOR EACH ROW
    EXECUTE FUNCTION check_relationship_consistency();

DROP TRIGGER IF EXISTS trigger_handle_relationship_deletion ON relations;
CREATE TRIGGER trigger_handle_relationship_deletion
    AFTER DELETE ON relations
    FOR EACH ROW
    EXECUTE FUNCTION handle_relationship_deletion();

-- Create a function to validate family tree integrity
CREATE OR REPLACE FUNCTION validate_family_tree_integrity()
RETURNS TABLE (
    issue_type TEXT,
    issue_description TEXT,
    member_id_1 UUID,
    member_id_2 UUID,
    relationship_id UUID
) AS $$
BEGIN
    -- Check for orphaned relationships
    RETURN QUERY
    SELECT 
        'orphaned_relationship'::TEXT as issue_type,
        'Relationship references non-existent member'::TEXT as issue_description,
        r.from_member_id as member_id_1,
        r.to_member_id as member_id_2,
        r.id as relationship_id
    FROM relations r
    LEFT JOIN family_members fm1 ON r.from_member_id = fm1.id
    LEFT JOIN family_members fm2 ON r.to_member_id = fm2.id
    WHERE fm1.id IS NULL OR fm2.id IS NULL;

    -- Check for incomplete bidirectional relationships
    RETURN QUERY
    SELECT 
        'incomplete_bidirectional'::TEXT as issue_type,
        'Missing reverse relationship'::TEXT as issue_description,
        r.from_member_id as member_id_1,
        r.to_member_id as member_id_2,
        r.id as relationship_id
    FROM relations r
    WHERE r.relation_type IN ('parent', 'child')
      AND NOT EXISTS (
          SELECT 1 FROM relations r2
          WHERE r2.from_member_id = r.to_member_id
            AND r2.to_member_id = r.from_member_id
            AND r2.relation_type = CASE 
                WHEN r.relation_type = 'parent' THEN 'child'
                WHEN r.relation_type = 'child' THEN 'parent'
            END
      );

    -- Check for duplicate relationships
    RETURN QUERY
    SELECT 
        'duplicate_relationship'::TEXT as issue_type,
        'Multiple identical relationships exist'::TEXT as issue_description,
        r1.from_member_id as member_id_1,
        r1.to_member_id as member_id_2,
        r1.id as relationship_id
    FROM relations r1
    WHERE EXISTS (
        SELECT 1 FROM relations r2
        WHERE r2.from_member_id = r1.from_member_id
          AND r2.to_member_id = r1.to_member_id
          AND r2.relation_type = r1.relation_type
          AND r2.id != r1.id
    );

    -- Check for circular relationships (simplified check)
    RETURN QUERY
    WITH RECURSIVE relationship_path AS (
        SELECT 
            from_member_id as start_member,
            to_member_id as end_member,
            relation_type,
            id,
            1 as depth,
            ARRAY[from_member_id] as path
        FROM relations
        WHERE relation_type = 'parent'
        
        UNION ALL
        
        SELECT 
            rp.start_member,
            r.to_member_id,
            r.relation_type,
            r.id,
            rp.depth + 1,
            rp.path || r.to_member_id
        FROM relationship_path rp
        JOIN relations r ON rp.end_member = r.from_member_id
        WHERE r.relation_type = 'parent'
          AND r.to_member_id != ALL(rp.path)
          AND rp.depth < 10  -- Prevent infinite recursion
    )
    SELECT 
        'circular_relationship'::TEXT as issue_type,
        'Circular parent-child relationship detected'::TEXT as issue_description,
        rp.start_member as member_id_1,
        rp.end_member as member_id_2,
        rp.id as relationship_id
    FROM relationship_path rp
    WHERE rp.start_member = rp.end_member;
END;
$$ LANGUAGE plpgsql;

-- Create a function to repair family tree integrity
CREATE OR REPLACE FUNCTION repair_family_tree_integrity()
RETURNS TABLE (
    repair_type TEXT,
    repair_description TEXT,
    relationships_created INTEGER,
    relationships_deleted INTEGER
) AS $$
DECLARE
    created_count INTEGER := 0;
    deleted_count INTEGER := 0;
BEGIN
    -- Delete orphaned relationships
    WITH orphaned AS (
        DELETE FROM relations
        WHERE id IN (
            SELECT r.id
            FROM relations r
            LEFT JOIN family_members fm1 ON r.from_member_id = fm1.id
            LEFT JOIN family_members fm2 ON r.to_member_id = fm2.id
            WHERE fm1.id IS NULL OR fm2.id IS NULL
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM orphaned;

    IF deleted_count > 0 THEN
        RETURN QUERY SELECT 
            'orphaned_cleanup'::TEXT,
            'Deleted orphaned relationships'::TEXT,
            0,
            deleted_count;
    END IF;

    -- Create missing bidirectional relationships
    WITH missing_reverse AS (
        INSERT INTO relations (from_member_id, to_member_id, relation_type, created_at)
        SELECT 
            r.to_member_id,
            r.from_member_id,
            CASE 
                WHEN r.relation_type = 'parent' THEN 'child'
                WHEN r.relation_type = 'child' THEN 'parent'
                ELSE r.relation_type
            END,
            NOW()
        FROM relations r
        WHERE r.relation_type IN ('parent', 'child')
          AND NOT EXISTS (
              SELECT 1 FROM relations r2
              WHERE r2.from_member_id = r.to_member_id
                AND r2.to_member_id = r.from_member_id
                AND r2.relation_type = CASE 
                    WHEN r.relation_type = 'parent' THEN 'child'
                    WHEN r.relation_type = 'child' THEN 'parent'
                END
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO created_count FROM missing_reverse;

    IF created_count > 0 THEN
        RETURN QUERY SELECT 
            'bidirectional_repair'::TEXT,
            'Created missing reverse relationships'::TEXT,
            created_count,
            0;
    END IF;

    -- Delete duplicate relationships (keep the oldest one)
    WITH duplicates AS (
        DELETE FROM relations
        WHERE id IN (
            SELECT r2.id
            FROM relations r1
            JOIN relations r2 ON r1.from_member_id = r2.from_member_id
                AND r1.to_member_id = r2.to_member_id
                AND r1.relation_type = r2.relation_type
                AND r1.created_at < r2.created_at
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM duplicates;

    IF deleted_count > 0 THEN
        RETURN QUERY SELECT 
            'duplicate_cleanup'::TEXT,
            'Deleted duplicate relationships'::TEXT,
            0,
            deleted_count;
    END IF;

    -- If no repairs were needed
    IF created_count = 0 AND deleted_count = 0 THEN
        RETURN QUERY SELECT 
            'no_repairs_needed'::TEXT,
            'Family tree integrity is already valid'::TEXT,
            0,
            0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_relations_from_member ON relations(from_member_id);
CREATE INDEX IF NOT EXISTS idx_relations_to_member ON relations(to_member_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_relations_bidirectional ON relations(from_member_id, to_member_id, relation_type);

-- Add comments for documentation
COMMENT ON FUNCTION check_relationship_consistency() IS 'Ensures relationship consistency and creates bidirectional relationships automatically';
COMMENT ON FUNCTION handle_relationship_deletion() IS 'Handles cascade deletion of bidirectional relationships';
COMMENT ON FUNCTION validate_family_tree_integrity() IS 'Validates family tree integrity and returns any issues found';
COMMENT ON FUNCTION repair_family_tree_integrity() IS 'Repairs common family tree integrity issues automatically';
