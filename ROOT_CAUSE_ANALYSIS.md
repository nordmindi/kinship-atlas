# ROOT CAUSE ANALYSIS: Story Detail Page "Story Not Found" Issue

## Executive Summary
The story detail page fails to load stories that appear in the Recent Stories list due to a **query syntax error** in the `getStory()` method that causes the entire query to fail when fetching a single story.

## Evidence Collection

### 1. Data Flow Analysis

#### List View (Working)
- **Component**: `src/pages/Index.tsx`
- **Hook**: `useStories()` from `src/hooks/useStories.ts`
- **Service Method**: `storyService.getAllStories()`
- **Query Structure**: 
  ```sql
  SELECT *, 
    story_members(...),
    story_media(...)
  FROM family_stories
  ORDER BY date DESC
  ```
- **Result**: ✅ Returns array of stories successfully

#### Detail View (Failing)
- **Component**: `src/pages/StoryDetailPage.tsx`
- **Hook**: `useStory(id)` from `src/hooks/useStories.ts`
- **Service Method**: `storyService.getStory(storyId)`
- **Query Structure**:
  ```sql
  SELECT *,
    story_members(...),
    story_media(...),
    story_artifacts:story_artifacts(...)  -- ⚠️ PROBLEMATIC
  FROM family_stories
  WHERE id = storyId
  ```
- **Result**: ❌ Returns null, triggers "Story Not Found"

### 2. Critical Difference Identified

**Line 140 in `src/services/storyService.ts`:**
```typescript
story_artifacts:story_artifacts (
  artifact_id,
  artifacts:artifacts (
    *,
    artifact_media:artifact_media (
      media_id,
      media:media (*)
    )
  )
)
```

**Problem**: The syntax `story_artifacts:story_artifacts` is **incorrect PostgREST syntax**.

### 3. PostgREST Query Syntax Rules

PostgREST uses the format `alias:foreign_key_name` for aliasing relations. The correct syntax should be:
- `story_artifacts` (no alias needed, or)
- `sa:story_artifacts` (if alias is needed)

The syntax `story_artifacts:story_artifacts` is **redundant and potentially invalid**, as it's aliasing the table to itself.

### 4. Query Comparison

| Aspect | getAllStories() | getStory() |
|--------|----------------|------------|
| Includes story_artifacts | ❌ NO | ✅ YES (with incorrect syntax) |
| Uses .single() | ❌ NO | ✅ YES |
| Query complexity | Simple nested | Complex nested (4 levels) |
| Error handling | Returns [] on error | Returns null on error |

### 5. Error Behavior Analysis

When `getStory()` executes:
1. Query includes invalid `story_artifacts:story_artifacts` syntax
2. PostgREST may reject the query or return an error
3. Error is caught, logged, but returns `null`
4. `useStory` hook receives `null`
5. Component renders "Story Not Found"

### 6. RLS Policy Verification

**RLS Policy for family_stories SELECT:**
```sql
CREATE POLICY "Users can view all stories" ON public.family_stories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'editor', 'viewer')
        )
    );
```

**Status**: ✅ Policy allows viewing all stories for authenticated users with roles

**RLS Policies for related tables:**
- `story_artifacts`: ✅ `FOR SELECT USING (true)` - allows all
- `artifacts`: ✅ `FOR SELECT USING (true)` - allows all  
- `artifact_media`: ✅ `FOR SELECT USING (true)` - allows all

**Conclusion**: RLS policies are NOT the issue.

### 7. Database Verification

**Test Query Results:**
```sql
SELECT COUNT(*) FROM family_stories;
-- Result: 0 rows
```

**Note**: Database shows 0 stories, but user reports stories visible in UI. This suggests:
- Stories may be in a different environment/database
- Or stories are being cached from a previous state
- Or stories exist but query fails before they can be retrieved

### 8. Error Logging Analysis

Current error handling in `getStory()`:
```typescript
if (error) {
  console.error('Error fetching story:', error);
  console.error('Error details:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint
  });
  return null;
}
```

**Issue**: Errors are logged but not surfaced to the UI, making debugging difficult.

## Root Cause Conclusion

### PRIMARY ROOT CAUSE

**Invalid PostgREST query syntax in `getStory()` method**

The query uses `story_artifacts:story_artifacts` which is syntactically incorrect. This causes:
1. PostgREST to reject or fail the query
2. Error to be returned from Supabase
3. Method to return `null`
4. UI to display "Story Not Found"

### SECONDARY FACTORS

1. **Query Complexity**: `getStory()` includes 4 levels of nesting (story → story_artifacts → artifacts → artifact_media → media), which may exceed PostgREST limits or cause performance issues

2. **Inconsistent Query Structure**: `getAllStories()` doesn't include artifacts, but `getStory()` does, creating inconsistency

3. **Error Handling**: Errors are silently converted to `null`, hiding the actual failure reason

## Verification Required

To confirm this root cause, the following tests are needed:

1. **Test 1**: Remove `story_artifacts` from `getStory()` query and verify if story loads
2. **Test 2**: Fix the syntax to `story_artifacts` (without alias) and verify
3. **Test 3**: Check browser console for actual Supabase error messages
4. **Test 4**: Verify if stories actually exist in the database for the current user

## Impact Assessment

- **Severity**: HIGH - Core functionality broken
- **User Impact**: Users cannot view story details
- **Data Integrity**: No data loss, but access is blocked
- **Workaround**: None currently available

## Next Steps (After Verification)

Once root cause is confirmed:
1. Fix PostgREST query syntax
2. Align `getStory()` query structure with `getAllStories()` (or make artifacts optional)
3. Improve error handling to surface actual errors
4. Add query validation/fallback mechanisms

