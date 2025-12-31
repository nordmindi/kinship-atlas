# Production Database Fix - Summary

## Problem
Your production database is missing:
1. `user_profiles` table
2. `created_by` column in `family_members` table

## Solution

### Step 1: Apply the Migration

Run the migration file in your Supabase production database:

**File**: `supabase/migrations/20250121000000_production_schema_fix.sql`

**How to apply**:
1. Go to https://app.supabase.com
2. Select your production project
3. Navigate to **SQL Editor**
4. Copy and paste the entire contents of the migration file
5. Click **Run**

### Step 2: Code Changes Made

I've made the code more resilient to handle missing schema elements:

1. **`src/services/userService.ts`**:
   - Returns default profile if `user_profiles` table doesn't exist
   - Falls back to `user_id` if `created_by` column doesn't exist

2. **`src/services/supabaseService.ts`**:
   - Removed `created_by` from required select fields
   - Handles optional columns gracefully
   - Falls back to `user_id` when `created_by` is missing

### Step 3: Verify

After applying the migration:

1. **Check the table exists**:
   ```sql
   SELECT * FROM public.user_profiles LIMIT 1;
   ```

2. **Check the column exists**:
   ```sql
   SELECT created_by FROM public.family_members LIMIT 1;
   ```

3. **Test the app** - The errors should be resolved

## What the Migration Does

- Creates `user_profiles` table
- Adds `created_by`, `branch_root`, `is_root_member` columns to `family_members`
- Creates indexes for performance
- Sets up RLS policies
- Creates triggers for auto-creating profiles
- Migrates existing data

## Important Notes

- The migration is **idempotent** - safe to run multiple times
- Existing data is preserved
- New users will automatically get profiles
- Existing users will get profiles created automatically

## Need Help?

See `docs/PRODUCTION_DATABASE_FIX.md` for detailed troubleshooting.

