# Fix for GoTrue Migration Error

## Problem

The GoTrue (Supabase Auth) container is failing with this error:

```
ERROR: operator does not exist: uuid = text (SQLSTATE 42883)
```

This occurs in the migration `20221208132122_backfill_email_last_sign_in_at.up.sql` which tries to compare a UUID column with a text value without proper casting.

## Solution

The fix marks the problematic migration as already applied, preventing GoTrue from attempting to run it.

### For New Databases

The fix is automatically applied when the database is initialized. The script `supabase/fix-gotrue-migration.sql` runs automatically when the database container starts for the first time.

### For Existing Databases

If your database already exists, you have two options:

#### Option 1: Run the Fix Script (Recommended)

```bash
./scripts/fix-gotrue-migration.sh
```

Then restart the GoTrue container:

```bash
docker restart kinship-atlas-api
```

#### Option 2: Manual SQL Fix

Connect to the database and run:

```sql
-- Create auth schema if needed
CREATE SCHEMA IF NOT EXISTS auth;

-- Create migration tracking table if needed
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version VARCHAR(255) PRIMARY KEY
);

-- Mark the problematic migration as applied
INSERT INTO auth.schema_migrations (version)
VALUES ('20221208132122')
ON CONFLICT (version) DO NOTHING;
```

Then restart the GoTrue container:

```bash
docker restart kinship-atlas-api
```

#### Option 3: Reset Database (Nuclear Option)

If you don't mind losing data:

```bash
# Stop containers and remove volumes
docker-compose -f docker-compose.dev.yml down -v

# Start fresh (fix will be applied automatically)
docker-compose -f docker-compose.dev.yml up -d
```

## What Changed

1. **Added fix script**: `supabase/fix-gotrue-migration.sql` - Automatically marks the problematic migration as applied
2. **Updated GoTrue version**: Changed from `v2.158.1` to `v2.159.0` (newer version may have fixes)
3. **Added manual fix script**: `scripts/fix-gotrue-migration.sh` - For existing databases

## Verification

After applying the fix, check that the GoTrue container is healthy:

```bash
docker ps | grep kinship-atlas-api
```

The container should show as "healthy" instead of "unhealthy".

You can also check the logs:

```bash
docker logs kinship-atlas-api
```

The error should no longer appear, and you should see GoTrue starting successfully.

