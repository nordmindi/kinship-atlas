# Fix: "Failed to fetch" Error During Sign In

## Problem

After fixing the port 54321 issue, sign-in attempts now fail with:
```
AuthRetryableFetchError: Failed to fetch
```

## Diagnosis

### ✅ What's Working
- Supabase containers are running and healthy
- Auth API health endpoint responds: `http://localhost:60011/auth/v1/health`
- CORS headers are properly configured
- Direct API test works (returns "invalid credentials" as expected)

### 🔍 Root Cause Analysis

The "Failed to fetch" error typically indicates:
1. **Network connectivity issue** - Browser can't reach the server
2. **CORS preflight failure** - OPTIONS request fails
3. **Wrong URL** - Client still using incorrect endpoint
4. **Service not ready** - Container started but not fully initialized

## Verification Steps

### 1. Check Browser Console Network Tab

Open DevTools → Network tab and look for:
- Request URL: Should be `http://localhost:60011/auth/v1/token?grant_type=password`
- Request Method: POST
- Status: Should be 200 (success) or 400 (invalid credentials), NOT "Failed"

### 2. Check for CORS Errors

Look for errors like:
- `Access to fetch at 'http://localhost:60011/...' from origin 'http://localhost:5173' has been blocked by CORS policy`
- `CORS preflight request failed`

### 3. Verify Client Configuration

In browser console, check:
```javascript
// Should show: http://localhost:60011
console.log('Config URL:', import.meta.env.VITE_SUPABASE_URL_LOCAL || 'http://localhost:60011');
```

### 4. Test Direct API Call

```bash
# Should return error about invalid credentials (not connection error)
curl -X POST http://localhost:60011/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

## Solutions

### Solution 1: Clear Browser Cache and Storage

The old session cleanup might not have run. Clear everything:

```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Solution 2: Restart Dev Server

The environment variables might not be loaded correctly:

```bash
# Stop dev server (Ctrl+C)
# Then restart
npm run dev
```

### Solution 3: Verify Supabase Containers

```bash
# Check all containers are healthy
docker ps --filter "name=kinship-atlas"

# Restart if needed
docker compose -f docker-compose.dev.yml restart
```

### Solution 4: Check Network Tab

1. Open DevTools → Network tab
2. Try to sign in
3. Look for the failed request
4. Check:
   - **Request URL**: Should be `http://localhost:60011/auth/v1/token?grant_type=password`
   - **Status**: What error code?
   - **Response**: Any error message?

### Solution 5: Check Proxy Configuration

The nginx proxy might not be routing correctly. Check:

```bash
# Test proxy directly
curl -v http://localhost:60011/auth/v1/health

# Should return GoTrue health check
```

## Expected Behavior After Fix

1. ✅ No "Failed to fetch" errors
2. ✅ Network tab shows POST to `http://localhost:60011/auth/v1/token`
3. ✅ Response is either:
   - 200 OK (successful login)
   - 400 Bad Request (invalid credentials - expected if user doesn't exist)
4. ✅ Console shows: `🔧 Supabase Client Configuration: URL: http://localhost:60011`

## Next Steps

If the issue persists after trying all solutions:

1. **Share Network Tab Screenshot**: Show the failed request details
2. **Share Browser Console**: Full error stack trace
3. **Share Container Status**: Output of `docker ps --filter "name=kinship-atlas"`

The fix for port 54321 is correct - this is likely a separate connectivity or CORS issue that needs browser-level debugging.

