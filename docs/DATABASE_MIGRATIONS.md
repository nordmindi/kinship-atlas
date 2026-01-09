# Database Migrations Guide

This guide explains how database migrations work in Kinship Atlas and how to manage them for both local and remote Supabase instances.

## Overview

Kinship Atlas uses a migration tracking system to ensure database schema changes are applied consistently across environments. Migrations are stored in `supabase/migrations/` and are tracked in the `schema_migrations` table.

## Migration System

### Migration Tracking

The migration system uses a `schema_migrations` table to track which migrations have been applied:

- **Version**: Unique identifier for the migration (timestamp-based)
- **Name**: Human-readable name of the migration
- **Applied At**: When the migration was applied
- **Checksum**: Optional checksum for verification
- **Execution Time**: How long the migration took to run

### Migration Files

Migrations are stored in `supabase/migrations/` with the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20250120000000_create_migration_tracking.sql`

## Running Migrations

### Local Development (Docker)

For local development, migrations are automatically applied when the database is initialized:

1. **First Time Setup**:
   ```bash
   # Start Docker Compose (migrations run automatically on first init)
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Reset Database** (applies all migrations):
   ```bash
   # Stop containers
   docker-compose -f docker-compose.dev.yml down -v
   
   # Start fresh (migrations will run)
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Manual Migration** (if needed):
   ```bash
   # Connect to database
   docker exec -it kinship-atlas-db psql -U postgres -d postgres
   
   # Run migration file
   \i /path/to/migration.sql
   ```

### Remote Supabase (Cloud)

For remote Supabase, use the Supabase CLI:

1. **Push Migrations**:
   ```bash
   # Link to your project (first time only)
   supabase link --project-ref your-project-ref
   
   # Push all migrations
   supabase db push
   ```

2. **Check Migration Status**:
   ```bash
   # View applied migrations
   supabase migration list
   ```

3. **Create New Migration**:
   ```bash
   # Create a new migration file
   supabase migration new your_migration_name
   ```

## Migration Workflow

### Creating a New Migration

1. **Create Migration File**:
   ```bash
   # Using Supabase CLI (recommended)
   supabase migration new add_new_feature
   
   # Or manually create file in supabase/migrations/
   # Format: YYYYMMDDHHMMSS_description.sql
   ```

2. **Write Migration SQL**:
   ```sql
   -- Migration: Add New Feature
   -- Description: Adds a new table for feature X
   
   CREATE TABLE IF NOT EXISTS public.new_table (
       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       name TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_new_table_name ON public.new_table(name);
   
   -- Enable RLS
   ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
   
   -- Add RLS policies
   CREATE POLICY "Users can view all" ON public.new_table
       FOR SELECT USING (true);
   ```

3. **Test Locally**:
   ```bash
   # Reset local database
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Apply to Remote**:
   ```bash
   supabase db push
   ```

### Best Practices

1. **Idempotent Migrations**: Always use `IF NOT EXISTS` and `DROP IF EXISTS` to make migrations safe to run multiple times.

2. **Backward Compatible**: When possible, make changes backward compatible. Add new columns as nullable first, then populate data, then make required.

3. **Test Thoroughly**: Test migrations on local database before applying to remote.

4. **Small, Focused Changes**: Keep migrations focused on a single change or feature.

5. **Document Changes**: Include comments explaining what the migration does and why.

6. **Transaction Safety**: Wrap migrations in transactions when possible (PostgreSQL does this automatically for DDL in some cases).

## Migration Status

### Check Migration Status from App

The app includes utilities to check migration status:

```typescript
import { checkDatabaseHealth, getAppliedMigrations } from '@/utils/migrationRunner';
import { performDatabaseHealthCheck } from '@/utils/databaseHealth';

// Check overall health
const health = await performDatabaseHealthCheck();

// Get applied migrations
const migrations = await getAppliedMigrations();
```

### Check Migration Status from CLI

```bash
# Local (via Docker)
docker exec -it kinship-atlas-db psql -U postgres -d postgres -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"

# Remote (via Supabase CLI)
supabase migration list
```

## Troubleshooting

### Migration Failed

If a migration fails:

1. **Check Error Logs**:
   ```bash
   # Docker logs
   docker logs kinship-atlas-db
   ```

2. **Manual Fix**:
   - Connect to database
   - Fix the issue manually
   - Mark migration as applied (if safe):
     ```sql
     INSERT INTO schema_migrations (version, name)
     VALUES ('20250120000000', 'failed_migration_name')
     ON CONFLICT (version) DO NOTHING;
     ```

3. **Rollback** (if needed):
   - Create a new migration that reverses the changes
   - Apply the rollback migration

### Migration Already Applied

If a migration shows as already applied but changes aren't present:

1. **Verify Migration Content**: Check if the migration actually made the changes
2. **Check Migration Table**: Verify the migration is recorded
3. **Re-run if Safe**: If the migration is idempotent, you can re-run it

### Orphaned Data

The database includes functions to check for orphaned data:

```sql
-- Check for orphaned relations
SELECT * FROM cleanup_orphaned_relations();

-- Check for orphaned locations
SELECT * FROM cleanup_orphaned_locations();
```

## Current Migrations

📖 **For troubleshooting migration issues, see [Troubleshooting Guide](./TROUBLESHOOTING.md)**

### Migration Categories

#### Core Schema
- **20240101000000_initial_schema.sql**: Initial database schema with core tables and RLS policies

#### Stories System
- **20250113000000_add_legacy_stories_schema.sql**: Family stories system
- **20250124000000_add_story_location_and_artifacts.sql**: Story locations and artifacts
- **20250124000001_add_story_artifacts.sql**: Additional artifact features
- **20250127000000_prevent_events_on_story_update.sql**: Prevent duplicate timeline events

#### User Management & Security
- **20250123000000_update_roles_to_admin_editor_viewer.sql**: Role-based access control
- **20250126000000_fix_story_rls_for_creators.sql**: Story creator permissions
- **20250126000001_fix_story_insert_policy_for_editors.sql**: Editor story permissions

#### Family Organization
- **20250125000000_add_family_groups.sql**: Family groups system
- **20250125000001_fix_locations_rls_for_family_groups.sql**: Location access for groups
- **20250125000002_fix_family_member_groups_rls.sql**: Member-group RLS fixes
- **20250125000003_fix_locations_rls_for_family_groups_access.sql**: Additional location fixes
- **20250125000004_add_story_groups.sql**: Story grouping by family groups

#### Media & Albums
- **20250128000000_add_albums_system.sql**: Albums system for media organization

### Migration Files Location

All migration files are stored in:
- **Primary location**: `supabase/migrations/`
- **Note**: All migrations have been consolidated into the complete production schema

### Migration Tracking

The system uses a `schema_migrations` table to track applied migrations:
- Version tracking
- Execution logging
- Checksum verification (optional)

## Environment-Specific Notes

### Local Development
- Migrations run automatically on first database initialization
- Use Docker volumes to persist data between restarts
- Reset with `docker-compose down -v` to re-run all migrations

### Remote Supabase
- Use Supabase CLI to manage migrations
- Migrations are applied via `supabase db push`
- Check migration status in Supabase Dashboard → Database → Migrations

## Additional Resources

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl-alter.html)

