# Switching Between Local and Remote Supabase

This guide explains how to switch between local Docker Supabase and remote Supabase Cloud.

## Quick Start

### Switch to Local Supabase (Docker)
```bash
npm run supabase:local
```

### Switch to Remote Supabase (Cloud)
```bash
npm run supabase:remote
```

**Important:** Always restart your development server after switching:
```bash
npm run dev
```

## Configuration

The switching is controlled by the `VITE_SUPABASE_MODE` environment variable in your `.env.local` file:

```env
# Set to 'local' for Docker Compose or 'remote' for Supabase Cloud
VITE_SUPABASE_MODE=local
```

### Local Configuration

When `VITE_SUPABASE_MODE=local`, the app uses:
- `VITE_SUPABASE_URL_LOCAL` - Local Supabase URL (default: `http://localhost:60011`)
- `VITE_SUPABASE_ANON_KEY_LOCAL` - Local Supabase anon key

**Prerequisites:**
- Docker Compose must be running: `docker-compose -f docker-compose.dev.yml up -d`
- Local Supabase services must be healthy

### Remote Configuration

When `VITE_SUPABASE_MODE=remote`, the app uses:
- `VITE_SUPABASE_URL_REMOTE` - Your remote Supabase project URL
- `VITE_SUPABASE_ANON_KEY_REMOTE` - Your remote Supabase anon key

**Prerequisites:**
- You must have a Supabase project at https://app.supabase.com
- Get your project URL and anon key from: Project Settings → API

## Example .env.local File

```env
# Supabase Mode: 'local' or 'remote'
VITE_SUPABASE_MODE=local

# Local Supabase (Docker Compose)
VITE_SUPABASE_URL_LOCAL=http://localhost:60011
VITE_SUPABASE_ANON_KEY_LOCAL=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Remote Supabase (Supabase Cloud)
VITE_SUPABASE_URL_REMOTE=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY_REMOTE=your-remote-anon-key-here

# Mapbox Token (optional)
VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

## Manual Switching

You can also manually edit `.env.local` and change:
```env
VITE_SUPABASE_MODE=local   # or 'remote'
```

Then restart your dev server.

## Verification

After switching, check the browser console. You should see:
```
🔧 Supabase Client Configuration:
   Mode: local (or remote)
   URL: http://localhost:60011 (or your remote URL)
   Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting

### "Missing Supabase URL" Error
- Make sure `VITE_SUPABASE_URL_LOCAL` (for local) or `VITE_SUPABASE_URL_REMOTE` (for remote) is set in `.env.local`
- Or set the legacy `VITE_SUPABASE_URL` variable

### "Missing Supabase Anon Key" Error
- Make sure `VITE_SUPABASE_ANON_KEY_LOCAL` (for local) or `VITE_SUPABASE_ANON_KEY_REMOTE` (for remote) is set in `.env.local`
- Or set the legacy `VITE_SUPABASE_ANON_KEY` variable

### Local Mode Not Working
- Check Docker Compose is running: `docker-compose -f docker-compose.dev.yml ps`
- Check all services are healthy: `docker-compose -f docker-compose.dev.yml ps`
- Start services if needed: `docker-compose -f docker-compose.dev.yml up -d`

### Remote Mode Not Working
- Verify your remote Supabase project is active
- Check your URL and anon key are correct
- Ensure your project allows connections from your IP (if using IP restrictions)

## Database Migrations

When switching between local and remote Supabase, ensure migrations are applied:

### Local Migrations
Migrations run automatically when Docker containers are first initialized. To re-run migrations:
```bash
# Reset database (applies all migrations)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Remote Migrations
Use Supabase CLI to apply migrations:
```bash
# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

See [DATABASE_MIGRATIONS.md](./DATABASE_MIGRATIONS.md) for detailed migration documentation.

## Use Cases

### Local Development
- Use `local` mode for development and testing
- No internet required
- Fast iteration
- Full control over database state
- Migrations run automatically on first init

### Remote Development
- Use `remote` mode to test against production-like data
- Share data with team members
- Test production configurations
- Access to Supabase Cloud features
- Migrations must be applied via Supabase CLI

