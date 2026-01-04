# Database Migration Summary

This document provides a comprehensive overview of all database migrations in the Kinship Atlas system.

## Migration List

### Core Schema (2024-01-01)

#### `20240101000000_initial_schema.sql`
**Purpose**: Initial database schema setup
- Creates core tables: `family_members`, `relations`, `locations`, `media`
- Sets up Row Level Security (RLS) policies
- Creates indexes for performance
- Establishes foreign key relationships

### Stories System (2025-01-13)

#### `20250113000000_add_legacy_stories_schema.sql`
**Purpose**: Family stories system
- Creates `family_stories` table
- Sets up story-media relationships
- Implements story RLS policies
- Enables story creation and management

### User Management (2025-01-23)

#### `20250123000000_update_roles_to_admin_editor_viewer.sql`
**Purpose**: User role system
- Adds role-based access control (Admin, Editor, Viewer)
- Updates user profiles with role information
- Implements role-based permissions
- Enhances security with role checks

### Story Enhancements (2025-01-24)

#### `20250124000000_add_story_location_and_artifacts.sql`
**Purpose**: Story location and artifacts system
- Adds location fields to stories (lat, lng, description)
- Creates `artifacts` table for physical/digital artifacts
- Creates `story_artifacts` junction table
- Implements artifact RLS policies
- Supports artifact types: document, heirloom, photo, letter, certificate, other

#### `20250124000001_add_story_artifacts.sql`
**Purpose**: Additional artifact features
- Enhances artifact metadata
- Creates artifact-media relationships
- Adds artifact indexing

### Story Behavior (2025-01-27)

#### `20250127000000_prevent_events_on_story_update.sql`
**Purpose**: Prevent duplicate timeline events
- Ensures only new stories (INSERT) create timeline events
- Prevents duplicate events on story updates (UPDATE)
- Documents expected timeline behavior

### Family Organization (2025-01-25)

#### `20250125000000_add_family_groups.sql`
**Purpose**: Family groups system
- Creates `family_groups` table
- Creates `family_member_groups` junction table
- Implements group RLS policies
- Enables organizing family members into groups (e.g., "Mother's Side", "Father's Side")

#### `20250125000001_fix_locations_rls_for_family_groups.sql`
**Purpose**: Location access for family groups
- Updates location RLS policies to support family groups
- Ensures group members can access group-related locations

#### `20250125000002_fix_family_member_groups_rls.sql`
**Purpose**: Fix family member-group RLS
- Corrects RLS policies for family member groups
- Ensures proper access control

#### `20250125000003_fix_locations_rls_for_family_groups_access.sql`
**Purpose**: Additional location RLS fixes
- Further refines location RLS for family groups
- Improves access control

#### `20250125000004_add_story_groups.sql`
**Purpose**: Story grouping
- Creates `story_groups` junction table
- Enables organizing stories by family groups
- Implements story-group RLS policies

### Story Permissions (2025-01-26)

#### `20250126000000_fix_story_rls_for_creators.sql`
**Purpose**: Story creator access
- Ensures story creators can manage their stories
- Fixes RLS policies for story creators
- Enables proper story editing permissions

#### `20250126000001_fix_story_insert_policy_for_editors.sql`
**Purpose**: Editor story permissions
- Allows editors to create stories
- Updates RLS policies for editor role
- Ensures proper permissions for story creation

### Albums System (2025-01-28)

#### `20250128000000_add_albums_system.sql`
**Purpose**: Albums system for media organization
- Creates `albums` table
- Creates `story_categories` table with default categories:
  - Biography
  - Migration
  - Heritage
  - Memories
  - Historical
  - Other
- Creates junction tables:
  - `album_family_groups` - Albums organized by family group
  - `album_family_members` - Albums organized by family member
  - `album_story_categories` - Albums organized by story category
  - `album_media` - Album-media relationships
- Adds `category` field to `family_stories` table
- Implements comprehensive RLS policies for all album tables
- Creates indexes for performance

## Migration Categories

### Core Infrastructure
- Initial schema
- RLS policies
- Indexes and constraints

### Content Management
- Stories system
- Story enhancements (location, artifacts)
- Albums system
- Media organization

### User & Access Control
- Role-based access control
- User permissions
- Story permissions

### Organization
- Family groups
- Story categories
- Album organization

## Migration Best Practices

1. **Idempotent Migrations**: All migrations use `IF NOT EXISTS` and `DROP IF EXISTS` to be safe to run multiple times
2. **RLS Policies**: All tables have Row Level Security enabled with appropriate policies
3. **Indexes**: Performance indexes are created for frequently queried columns
4. **Foreign Keys**: Proper foreign key relationships maintain data integrity
5. **Comments**: Migrations include comments explaining their purpose

## Applying Migrations

### Local Development
Migrations are automatically applied when the database is initialized:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Remote Supabase
Use the Supabase CLI to push migrations:
```bash
supabase db push
```

## Migration Status

All migrations listed above are:
- ✅ Tested locally
- ✅ Documented
- ✅ Idempotent
- ✅ Backward compatible (where possible)

## Related Documentation

- [Database Migrations Guide](./DATABASE_MIGRATIONS.md) - Detailed migration workflow
- [Local Development Guide](./LOCAL_DEVELOPMENT.md) - Setting up local environment
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Production migration process

