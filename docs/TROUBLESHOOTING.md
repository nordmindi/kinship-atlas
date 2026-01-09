# Troubleshooting Guide

This guide covers common issues and their solutions for Kinship Atlas.

## Table of Contents

1. [Database Connection Issues](#database-connection-issues)
2. [Migration Issues](#migration-issues)
3. [Authentication Issues](#authentication-issues)
4. [Data Import Issues](#data-import-issues)
5. [Story Creation Issues](#story-creation-issues)
6. [RLS Policy Errors](#rls-policy-errors)

---

## Database Connection Issues

### Problem: Connection to Wrong Port

**Symptoms**: `ERR_CONNECTION_REFUSED` errors, application trying to connect to `localhost:54321` instead of `localhost:60011`

**Root Cause**: Supabase client loads existing sessions from localStorage before cleanup code runs. Stored sessions contain old URL references.

**Solution**:
1. Clear browser storage: `localStorage.clear()` and `sessionStorage.clear()`
2. Restart the application
3. Verify `.env.local` has correct `VITE_SUPABASE_URL` set
4. Use `npm run supabase:local` to switch to local instance

**Prevention**: The client initialization code now handles cleanup before session loading.

---

## Migration Issues

### Problem: Missing Tables or Columns

**Symptoms**: 
- `Could not find the table 'public.user_profiles'`
- `column family_members.created_by does not exist`
- `Could not find the 'lat' column of 'family_stories'`

**Solution**:
1. **For New Deployments**: Run the complete production schema:
   ```bash
   # Using Supabase Dashboard
   # Copy and paste: supabase/migrations/20250215000000_complete_production_schema.sql
   
   # Using Supabase CLI
   supabase db push
   ```

2. **For Clean Reset** (Local Development):
   ```bash
   npm run supabase:reset
   ```

3. **For Existing Databases**: The complete production schema is idempotent and can be run safely.

**Verification**:
```bash
npm run health:check
```

---

## Authentication Issues

### Problem: User Profile Not Found

**Symptoms**: `PGRST116: The result contains 0 rows` when fetching user profile

**Root Cause**: User was created before the migration that creates user profiles.

**Solution**: The migration automatically creates profiles for existing users. If still missing:
1. The `getUserProfile` function will auto-create the profile
2. Or manually run: `SELECT public.ensure_user_profile('user-id-here')`

---

## Data Import Issues

### Problem: RLS Policy Violations During Import

**Symptoms**: `new row violates row-level security policy for table "family_members"`

**Root Cause**: User doesn't have 'admin' or 'editor' role, or RLS policy is too restrictive.

**Solution**: 
- The complete production schema includes a fix that allows any authenticated user to create family members when `created_by = auth.uid()`
- Ensure you're running the latest migration: `20250215000000_complete_production_schema.sql`
- Verify the user is authenticated: `auth.uid() IS NOT NULL`

---

## Story Creation Issues

### Problem: Missing Columns Error

**Symptoms**: `PGRST204: Could not find the 'lat' column of 'family_stories'`

**Root Cause**: Migration not applied that adds location columns to `family_stories` table.

**Solution**: Apply the complete production schema which includes all story-related columns.

---

## RLS Policy Errors

### Problem: Permission Denied Errors

**Symptoms**: `42501: new row violates row-level security policy`

**Common Causes**:
1. User doesn't have required role
2. Policy conditions not met (e.g., `created_by != auth.uid()`)
3. Missing user profile

**Solutions**:
1. Check user role: `SELECT role FROM user_profiles WHERE id = auth.uid()`
2. Verify policy conditions match your operation
3. Ensure user profile exists (see Authentication Issues above)

**For Family Members Import**: The complete production schema includes a policy that allows any authenticated user to insert when `created_by = auth.uid()`, regardless of role.

---

## General Troubleshooting Steps

1. **Check Database Health**:
   ```bash
   npm run health:check
   ```

2. **Verify Environment Variables**:
   ```bash
   node scripts/diagnose-supabase-connection.mjs
   ```

3. **Check Migration Status**:
   - Review `supabase/migrations/` folder
   - Ensure latest migration is applied

4. **Clear Browser State** (if UI issues):
   - Clear localStorage and sessionStorage
   - Hard refresh (Ctrl+Shift+R)

5. **Reset Local Database** (if persistent issues):
   ```bash
   npm run supabase:reset
   ```

---

## Getting Help

If issues persist:
1. Check the browser console for detailed error messages
2. Review server logs in Supabase Dashboard
3. Run health check: `npm run health:check`
4. Verify all migrations are applied
5. Check that you're using the latest codebase
