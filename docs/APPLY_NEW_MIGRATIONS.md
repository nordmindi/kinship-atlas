# Applying New Security Migrations

The new security features (audit logging and soft deletes) require database migrations to be applied.

## Quick Method: Reset Database (Local Development)

The easiest way to apply all migrations, including the new ones:

```bash
npm run supabase:reset
```

This will:
1. Stop Docker containers
2. Remove volumes (deletes all data)
3. Restart containers
4. Apply all migrations automatically

⚠️ **Warning**: This will delete all existing data in your local database!

## Manual Method: Apply Migrations via SQL Editor

If you want to keep your existing data, apply the migrations manually:

### Option 1: Using Supabase Dashboard (Remote)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/20250122000000_add_audit_logging.sql`
4. Copy the entire contents
5. Paste into SQL Editor and click **Run**
6. Repeat for `supabase/migrations/20250122000001_add_soft_deletes.sql`

### Option 2: Using Docker (Local)

```bash
# Apply audit logging migration
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d postgres -f /path/to/supabase/migrations/20250122000000_add_audit_logging.sql

# Apply soft deletes migration
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d postgres -f /path/to/supabase/migrations/20250122000001_add_soft_deletes.sql
```

Or copy the SQL files into the container:

```bash
# Copy migration file into container
docker cp supabase/migrations/20250122000000_add_audit_logging.sql $(docker compose -f docker-compose.dev.yml ps -q db):/tmp/audit_logging.sql

# Execute in container
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d postgres -f /tmp/audit_logging.sql

# Repeat for soft deletes
docker cp supabase/migrations/20250122000001_add_soft_deletes.sql $(docker compose -f docker-compose.dev.yml ps -q db):/tmp/soft_deletes.sql
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d postgres -f /tmp/soft_deletes.sql
```

## Verify Migrations Applied

After applying migrations, run the health check:

```bash
npm run health:check
```

You should see:
- ✅ Table audit_log exists
- All health checks passing

## What These Migrations Add

### 1. Audit Logging (`20250122000000_add_audit_logging.sql`)
- Creates `audit_log` table
- Adds triggers to track all data changes
- Provides functions to view history and restore data

### 2. Soft Deletes (`20250122000001_add_soft_deletes.sql`)
- Adds `deleted_at` columns to all tables
- Provides soft delete and restore functions
- Prevents accidental data loss

## Troubleshooting

### Error: "relation already exists"
The migration uses `IF NOT EXISTS`, so it's safe to run again. This just means some parts already exist.

### Error: "permission denied"
Make sure you're using the correct database user. For local Docker, use `postgres` user.

### Migrations not showing in health check
After applying migrations, the health check should detect the new tables. If not, restart the Supabase containers.

