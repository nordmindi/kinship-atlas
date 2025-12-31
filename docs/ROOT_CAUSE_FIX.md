# Root Cause Fix: Supabase Connection to Port 54321

## Problem Summary

The application was attempting to connect to `localhost:54321` instead of `localhost:60011`, causing `ERR_CONNECTION_REFUSED` errors during token refresh operations.

## Root Cause

**Timing Issue**: The Supabase client was being created (`createClient()`) **BEFORE** cleanup code executed. During client instantiation, Supabase-js synchronously:
1. Read localStorage for existing sessions
2. Loaded the old session (created with URL `localhost:54321`) into memory
3. Started an auto-refresh timer using the URL embedded in the loaded session (54321)

When cleanup code ran afterward, it removed localStorage entries but couldn't:
- Stop the already-running refresh timer
- Clear the session data already loaded in memory
- Change the URL the refresh timer was using

## Solution Implemented

### Change: Moved Cleanup Code BEFORE Client Creation

**File**: `src/integrations/supabase/client.ts`

**Before** (Lines 48-100):
```typescript
// Client created FIRST
export const supabase = createClient<Database>(config.url, config.anonKey);

// Cleanup runs AFTER (too late!)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // ... cleanup code
}
```

**After** (Lines 45-120):
```typescript
// Cleanup runs FIRST (before client creation)
if (typeof window !== 'undefined') {
  // ... cleanup code that removes old sessions
}

// Client created AFTER cleanup is complete
export const supabase = createClient<Database>(config.url, config.anonKey);
```

### Improvements Made

1. **Timing Fix**: Cleanup now executes **BEFORE** `createClient()` is called
2. **Enhanced Detection**: More robust URL mismatch detection:
   - Checks for port 54321 references
   - Compares stored URLs with current host
   - Handles both parsed JSON and raw string values
3. **SessionStorage Cleanup**: Also clears sessionStorage for completeness
4. **Production Ready**: Removed `import.meta.env.DEV` check so cleanup works in all environments

### How It Works Now

```
TIME    ACTION                                    RESULT
─────────────────────────────────────────────────────────────────
T0      Module loads: client.ts                  Code parsed
T1      getSupabaseConfig() executes              Returns: { url: "http://localhost:60011", ... }
T2      Cleanup code executes FIRST              ✅ Removes old sessions from localStorage
        ├─> Scans localStorage for sb-* keys
        ├─> Detects URL mismatches (54321 vs 60011)
        ├─> Removes old session keys
        └─> Clears sessionStorage
T3      createClient(url, key) executes          ✅ Supabase initializes with clean state
        ├─> Reads localStorage (now empty or clean)
        ├─> No old session found
        ├─> Initializes with current URL (60011)
        └─> Starts refresh timer with CORRECT URL (60011)
T4      Refresh timer fires                      ✅ Makes request to localhost:60011
T5      Connection succeeds                      ✅ No errors!
```

## Testing

### Verification Steps

1. **Clear browser storage** (one-time manual step):
   ```javascript
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Check console output**:
   - Should see: `🧹 Cleaning up old Supabase sessions...`
   - Should see: `✅ Cleared X old session(s)`
   - Should see: `🔧 Supabase Client Configuration: URL: http://localhost:60011`

3. **Verify no errors**:
   - No `ERR_CONNECTION_REFUSED` errors
   - No requests to `localhost:54321`
   - All requests go to `localhost:60011`

### Expected Behavior

- ✅ Old sessions are cleared before Supabase initializes
- ✅ Client starts with clean state
- ✅ Refresh timer uses correct URL (60011)
- ✅ No connection errors
- ✅ Automatic cleanup on every page load (if old sessions exist)

## Files Changed

- `src/integrations/supabase/client.ts` - Moved cleanup before client creation

## Breaking Changes

None. This is a fix that improves behavior without changing the API.

## Related Documentation

- `docs/ROOT_CAUSE_ANALYSIS_REPORT.md` - Detailed root cause analysis
- `docs/SUPABASE_CONNECTION_TROUBLESHOOTING.md` - Troubleshooting guide
- `docs/CLEAR_BROWSER_STORAGE.md` - Manual cleanup instructions

