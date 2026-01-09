# Security Fix: Viewer Role CRUD Permissions

## Issue Summary

**Date:** 2025-02-16  
**Severity:** Medium  
**Status:** Fixed

### Problem

The `viewer` role was able to perform CRUD operations (create, update, delete) on family members and relationships, despite the application-level permissions defining viewers as read-only.

### Root Cause

The database Row Level Security (RLS) policy for `family_members` INSERT operations was too permissive. It allowed **any authenticated user** (including viewers) to insert family members when `created_by = auth.uid()`. This violated the intended permission model where:

- **Admin**: Full access to all features
- **Editor**: Can manage families, add/edit/update members, add stories and media
- **Viewer**: Read-only access - can view families, family members, media, and stories

### Affected Components

1. **Database RLS Policy** (`supabase/migrations/20250215000000_complete_production_schema.sql`)
   - Policy: `"Users can insert family members"` on `family_members` table
   - Line 225-242: Allowed any authenticated user to insert

2. **Application Permissions** (`src/lib/permissions.ts`)
   - Correctly defined viewer as read-only (lines 68-73)
   - No create, edit, or delete permissions for viewers

3. **UI Components**
   - Most UI components correctly check `canWrite` which returns `false` for viewers
   - However, direct API calls or bypassing the UI could still allow viewers to create data

### Fix

**Migration:** `supabase/migrations/20250216000000_fix_viewer_insert_permissions.sql`

The RLS policy was updated to restrict INSERT operations to only admins and editors:

```sql
CREATE POLICY "Admins and editors can insert family members" ON public.family_members
    FOR INSERT WITH CHECK (
        -- Admins can insert anywhere (even if created_by doesn't match)
        public.is_user_admin(auth.uid()) OR
        -- Editors can insert when created_by = auth.uid() or in their branch
        (
            public.is_user_editor(auth.uid()) AND (
                created_by = auth.uid() OR
                branch_root IN (
                    SELECT id FROM public.family_members 
                    WHERE created_by = auth.uid() OR is_root_member = TRUE
                )
            )
        )
    );
```

### Verification

To verify the fix:

1. **Database Level**: Run the migration and confirm viewers cannot insert family members
2. **Application Level**: Test with a viewer account - all create/edit buttons should be hidden
3. **API Level**: Attempt direct API calls as a viewer - should be rejected by RLS

### Related Policies

Other RLS policies were checked and found to be correct:
- ✅ `relations` INSERT: Already restricted to admins and editors
- ✅ `family_stories` INSERT: Already restricted to admins and editors
- ✅ `story_members`, `story_media`, etc.: Check story ownership (only editors/admins can create stories)

### Testing Recommendations

1. Create a test user with `viewer` role
2. Attempt to:
   - Add a family member (should fail)
   - Edit a family member (should fail)
   - Delete a family member (should fail)
   - Add a relationship (should fail)
   - View family members (should succeed)
   - View stories (should succeed)

### Notes

- The original permissive policy was likely added to support imports, but this was handled at the page level (ImportFamilyDataPage checks `isAdmin`)
- The fix maintains the same functionality for admins and editors while properly restricting viewers
