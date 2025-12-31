# Root Cause Analysis: Supabase Connection to Port 54321

## Executive Summary

**Problem**: Application attempts to connect to `localhost:54321` instead of `localhost:60011`, causing `ERR_CONNECTION_REFUSED` errors.

**Root Cause**: Supabase-js client loads and attempts to refresh an existing session from localStorage **BEFORE** our cleanup code runs. The stored session contains the old URL (54321) embedded within it, and Supabase uses that URL for token refresh operations.

## Detailed Analysis

### 1. Code Execution Flow

#### Step 1: Module Initialization (`src/integrations/supabase/client.ts`)
```typescript
// Line 48: Client is created IMMEDIATELY
export const supabase = createClient<Database>(config.url, config.anonKey);

// Lines 50-100: Cleanup code runs AFTER client creation
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // ... cleanup logic
}
```

**Critical Finding**: The Supabase client is instantiated **BEFORE** any cleanup code executes. When `createClient()` is called, Supabase-js immediately:
1. Reads localStorage for existing sessions
2. Initializes internal auth state
3. Starts auto-refresh timers
4. Attempts to refresh tokens using URLs embedded in stored sessions

#### Step 2: Supabase-js Internal Behavior

When `createClient(url, key)` is called, the Supabase-js library:
1. **Immediately** checks localStorage for keys matching pattern: `sb-<project-ref>-auth-token`
2. The `<project-ref>` is derived from the URL hash/identifier
3. If a session exists, it loads it and extracts the stored URL
4. Starts background refresh timers that use the **stored URL**, not the current client URL
5. This happens synchronously during client creation

**Evidence**: The error stack trace shows:
```
_refreshAccessToken @ @supabase_supabase-js.js?v=d9050464:6273:20
_callRefreshToken @ @supabase_supabase-js.js?v=d9050464:6368:42
__loadSession @ @supabase_supabase-js.js?v=d9050464:5772:22
```

This indicates `__loadSession` is called during initialization, which loads the old session with the old URL.

### 2. Environment Configuration Analysis

**Finding**: No `.env.local` file exists in the project root.

**Impact**: 
- The app falls back to hardcoded defaults: `http://localhost:60011`
- However, if a `.env.local` file previously existed with `VITE_SUPABASE_URL=http://localhost:54321`, Vite may have cached that value
- OR: The browser has cached the old environment variables from a previous build

### 3. localStorage Session Storage Format

Supabase-js stores sessions in localStorage with this structure:

**Key Format**: `sb-<project-ref>-auth-token`

Where `<project-ref>` is a hash/identifier derived from the Supabase URL. For example:
- URL: `http://localhost:54321` → project-ref: `xyz123`
- URL: `http://localhost:60011` → project-ref: `abc456`

**Value Format**: JSON containing:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  "expires_in": 3600,
  "token_type": "bearer",
  "user": { ... }
}
```

**Critical Issue**: The session object itself doesn't explicitly store the URL, but Supabase-js associates the session with the URL that was used when it was created. When the client initializes, it:
1. Finds the localStorage key for the old project-ref
2. Loads the session
3. Uses the URL associated with that project-ref (54321) for refresh operations

### 4. Timing Issue: Cleanup vs. Client Initialization

**Current Code Flow**:
```
1. getSupabaseConfig() → returns { url: "http://localhost:60011", ... }
2. createClient(url, key) → Supabase loads old session from localStorage
   └─> Supabase starts refresh timer with OLD URL (54321)
3. Cleanup code runs → tries to remove old sessions
   └─> TOO LATE: Supabase already initialized with old session
```

**Why Cleanup Fails**:
- The cleanup code checks for string "54321" in localStorage values
- But Supabase-js has already loaded the session into memory
- Removing localStorage doesn't stop the active refresh timer
- The refresh timer continues using the old URL from the loaded session

### 5. Evidence from Error Messages

**Error Pattern**:
```
POST http://localhost:54321/auth/v1/token?grant_type=refresh_token 
net::ERR_CONNECTION_REFUSED
```

**Analysis**:
- The request is going to port **54321**, not 60011
- This happens during token refresh (`grant_type=refresh_token`)
- The refresh is triggered by `_refreshAccessToken` → `_callRefreshToken`
- This is called from `__loadSession` during client initialization
- The URL (54321) comes from the stored session, not the current client config

### 6. Verification Tests Needed

To confirm this analysis, we need to check:

1. **localStorage Contents**:
   ```javascript
   // Run in browser console
   Object.keys(localStorage).filter(k => k.startsWith('sb-'))
   // Should show keys like: sb-<old-project-ref>-auth-token
   ```

2. **Client Configuration at Runtime**:
   ```javascript
   // Check what URL the client thinks it's using
   console.log(supabase.supabaseUrl)
   // Should be: http://localhost:60011
   ```

3. **Active Session State**:
   ```javascript
   // Check if Supabase has loaded an old session
   supabase.auth.getSession().then(({data}) => {
     console.log('Session:', data.session)
     // If session exists, it may have old URL embedded
   })
   ```

4. **Environment Variables at Build Time**:
   ```bash
   # Check what Vite sees
   npm run dev -- --debug
   # Look for VITE_SUPABASE_URL in output
   ```

## Root Cause Conclusion

**Primary Root Cause**: 
Supabase-js client initialization loads existing sessions from localStorage **synchronously during module load**, before any cleanup code can execute. The loaded session contains references to the old URL (54321), and Supabase's internal refresh mechanism uses that stored URL instead of the current client configuration.

**Contributing Factors**:
1. No `.env.local` file exists, but browser may have cached old environment variables
2. Cleanup code runs AFTER client creation (timing issue)
3. Supabase-js doesn't validate that stored session URLs match current client URL
4. The refresh timer starts immediately and cannot be stopped by removing localStorage

## Required Evidence

Before proposing solutions, we need to verify:

1. ✅ **Code flow analysis** - COMPLETE
2. ⏳ **Runtime localStorage inspection** - NEEDS USER VERIFICATION
3. ⏳ **Client URL at runtime** - NEEDS USER VERIFICATION  
4. ⏳ **Session state inspection** - NEEDS USER VERIFICATION
5. ⏳ **Vite environment variable resolution** - NEEDS VERIFICATION

## Next Steps

1. User must run diagnostic script in browser console to inspect:
   - localStorage keys and values
   - Supabase client configuration
   - Active session state
   
2. Verify Vite environment variable resolution:
   - Check if `.env.local` exists (we found it doesn't)
   - Check if Vite cached old values
   - Verify build-time environment

3. Once evidence is collected, determine exact solution:
   - Option A: Cleanup BEFORE client creation (requires code restructuring)
   - Option B: Force session invalidation on URL mismatch (requires Supabase API usage)
   - Option C: Clear localStorage before module loads (requires build-time script)

