# Production Database Fix Guide

If you're seeing errors like:
- `Could not find the table 'public.user_profiles'`
- `column family_members.created_by does not exist`

This means your production database is missing required schema elements. Follow these steps to fix it.

## Quick Fix: Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250121000000_production_schema_fix.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# Make sure you're connected to your production project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### Option 3: Manual SQL Execution

If you have direct database access, you can run the migration SQL file directly.

## What This Migration Does

1. **Creates `user_profiles` table** - Stores user role information
2. **Adds missing columns to `family_members`**:
   - `created_by` - Tracks which user created each family member
   - `branch_root` - Tracks family tree branches
   - `is_root_member` - Marks root members of branches
3. **Creates indexes** - For better query performance
4. **Sets up RLS policies** - For proper security
5. **Creates triggers** - Auto-creates user profiles on signup
6. **Migrates existing data** - Sets default values for existing records

## Verification

After applying the migration, verify it worked:

1. **Check user_profiles table exists**:
   ```sql
   SELECT * FROM public.user_profiles LIMIT 1;
   ```

2. **Check created_by column exists**:
   ```sql
   SELECT created_by FROM public.family_members LIMIT 1;
   ```

3. **Test the application** - The errors should be gone

## Troubleshooting

### Error: "relation already exists"
This means some parts of the migration already exist. The migration uses `IF NOT EXISTS` clauses, so it should be safe to run again. If you get this error, it's likely a different issue.

### Error: "permission denied"
Make sure you're using a user with sufficient permissions (typically the service role or database owner).

### Error: "column already exists"
This is fine - the migration uses `ADD COLUMN IF NOT EXISTS`, so it won't fail if the column already exists.

## After Migration

Once the migration is applied:

1. **Restart your application** - If it's running, restart it to pick up the schema changes
2. **Test user signup** - New users should automatically get a profile
3. **Test family member creation** - Should work without errors
4. **Check existing users** - Existing users should have profiles created automatically

## Need Help?

If you continue to see errors after applying the migration:

1. Check the Supabase Dashboard → **Database** → **Tables** to verify tables exist
2. Check **SQL Editor** → **History** to see if the migration ran successfully
3. Review error messages in the browser console for specific issues
4. Check that RLS policies are enabled and correct

