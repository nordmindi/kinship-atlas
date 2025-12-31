# How to Clear Browser Storage for Supabase

If you're seeing connection errors to `localhost:54321` after changing to port `60011`, you need to clear the old Supabase session data from your browser.

## Quick Fix (Recommended)

### Option 1: Use Browser DevTools

1. **Open Developer Tools** (F12 or Right-click → Inspect)
2. **Go to Application tab** (Chrome/Edge) or **Storage tab** (Firefox)
3. **Clear Local Storage**:
   - Find "Local Storage" in the left sidebar
   - Click on your site's URL (e.g., `http://localhost:5173`)
   - Look for keys starting with `sb-` (Supabase session keys)
   - Right-click and "Delete" or select all and press Delete
4. **Clear Session Storage** (if any):
   - Find "Session Storage" in the left sidebar
   - Repeat the same process
5. **Hard Refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)

### Option 2: Use Browser Console

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Paste and run this code**:

```javascript
// Clear all Supabase-related storage
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log('Removed:', key);
});
console.log('✅ Cleared', keysToRemove.length, 'items. Please refresh the page.');
```

4. **Refresh the page** (F5 or Ctrl+R)

### Option 3: Clear All Site Data

1. **Open Developer Tools** (F12)
2. **Go to Application tab** (Chrome/Edge) or **Storage tab** (Firefox)
3. **Click "Clear site data"** or "Clear storage"
4. **Check all boxes** (Cookies, Local storage, Session storage, etc.)
5. **Click "Clear site data"**
6. **Refresh the page**

## Why This Happens

Supabase stores authentication sessions in browser localStorage with keys like:
- `sb-<project-ref>-auth-token`
- `sb-<project-ref>-auth-token-code-verifier`

When you change the Supabase URL (e.g., from port 54321 to 60011), the old session data still references the old URL. The Supabase client tries to refresh the token using the old URL, causing connection errors.

## Prevention

The app now automatically detects and clears old sessions from different URLs on startup (development mode only). However, if you're still seeing issues:

1. **Clear browser storage** (use one of the methods above)
2. **Restart the dev server**: `npm run dev`
3. **Hard refresh** the browser (Ctrl+Shift+R)

## Verify It's Fixed

After clearing storage, check the browser console. You should see:
```
🔧 Supabase Client Configuration:
   Mode: local
   URL: http://localhost:60011
   Anon Key: eyJhbGciOiJIUzI1NiIs...
```

If you still see errors to `localhost:54321`, the storage wasn't fully cleared. Try Option 3 (Clear All Site Data).

