# Supabase Connection Troubleshooting

## Common Issues

### Issue: `ERR_CONNECTION_REFUSED` on `localhost:54321`

**Problem**: The app is trying to connect to the wrong port. This usually happens because:
1. Browser has cached old session data from port 54321
2. Supabase isn't running
3. Environment variables are incorrect

**Solution**:

1. **Clear Browser Storage** (IMPORTANT - Do this first!):
   - Open DevTools (F12) → Console tab
   - Run: `localStorage.clear(); sessionStorage.clear(); location.reload();`
   - OR see [CLEAR_BROWSER_STORAGE.md](./CLEAR_BROWSER_STORAGE.md) for detailed instructions
   
   The app now automatically cleans up old sessions, but you may need to manually clear once.

2. **Check Supabase is running**:
   ```bash
   docker ps --filter "name=kinship-atlas"
   ```
   
   All containers should be "Up" and healthy.

3. **Verify the correct port**:
   - Docker Compose setup uses port **60011** (via proxy)
   - The app should connect to `http://localhost:60011`
   - NOT `http://localhost:54321` (that's the direct GoTrue port)

4. **Check environment variables**:
   ```bash
   # Make sure .env.local exists and has:
   VITE_SUPABASE_MODE=local
   VITE_SUPABASE_URL_LOCAL=http://localhost:60011
   ```

5. **Restart the dev server**:
   ```bash
   # Stop the dev server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

6. **Hard refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Database Container Fails to Start

**Problem**: Migration errors or database corruption.

**Solution**:

1. **Check migration errors**:
   ```bash
   docker logs kinship-atlas-db --tail 50
   ```

2. **Reset the database** (⚠️ This will delete all data):
   ```bash
   docker compose -f docker-compose.dev.yml down
   rm -rf docker-data/db
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Fix migration errors**:
   - Check for duplicate policy/table creation
   - Use `DROP IF EXISTS` before `CREATE` in migrations
   - Use `CREATE IF NOT EXISTS` where appropriate

### Issue: Port Already in Use

**Problem**: Another service is using the required ports.

**Solution**:

1. **Check what's using the ports**:
   ```bash
   # Windows
   netstat -ano | findstr :60011
   
   # Linux/Mac
   lsof -i :60011
   ```

2. **Stop conflicting services** or change ports in `docker-compose.dev.yml`

## Quick Health Check

Run this to verify everything is working:

```bash
# 1. Check containers are running
docker ps --filter "name=kinship-atlas"

# 2. Check database is healthy
docker logs kinship-atlas-db --tail 10

# 3. Check API is responding
curl http://localhost:60011/rest/v1/

# 4. Check auth endpoint
curl http://localhost:60011/auth/v1/health
```

## Port Reference

| Service | Internal Port | External Port | URL |
|---------|--------------|--------------|-----|
| Database | 5432 | 60000 | `localhost:60000` |
| GoTrue (Auth) | 9999 | 60001 | `localhost:60001` |
| Studio | 3000 | 60002 | `http://localhost:60002` |
| Inbucket (Email) | 9000 | 60003 | `http://localhost:60003` |
| PostgREST (API) | 3000 | 60009 | `localhost:60009` |
| **Proxy (Main)** | 8000 | **60011** | **`http://localhost:60011`** |

**Important**: The app should connect to port **60011** (the proxy), not the individual service ports.

## Environment Variables

Make sure your `.env.local` file has:

```env
VITE_SUPABASE_MODE=local
VITE_SUPABASE_URL_LOCAL=http://localhost:60011
VITE_SUPABASE_ANON_KEY_LOCAL=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Still Having Issues?

1. **Clear browser cache** - Old cached URLs might be causing issues
2. **Restart everything**:
   ```bash
   docker compose -f docker-compose.dev.yml down
   docker compose -f docker-compose.dev.yml up -d
   npm run dev
   ```
3. **Check browser console** - Look for specific error messages
4. **Verify network** - Make sure Docker Desktop is running and containers are accessible

