# Local Development Setup Guide

This guide will help you set up Kinship Atlas for local development using Supabase with Docker.

## Prerequisites

- **Node.js 18+** and npm
- **Docker Desktop** (for running Supabase locally)
- **Git** (for version control)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env.local
```

The `.env.local` file should contain:

```env
# Local Supabase URLs (default local development URLs)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 3. Start Supabase Local Development

```bash
# Start the local Supabase stack (includes PostgreSQL, API, Auth, Storage, etc.)
npm run supabase:start
```

This will:
- Start Docker containers for all Supabase services
- Run database migrations
- Set up the database schema
- Start the Supabase Studio dashboard

### 4. Seed the Database (Optional)

```bash
# Reset database and load sample data
npm run supabase:seed
```

### 5. Start the Development Server

```bash
# Start the React development server
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Supabase Studio**: http://localhost:54323
- **API**: http://localhost:54321
- **Database**: localhost:54322

## Development Workflow

### Daily Development

```bash
# Start everything (Supabase + React dev server)
npm run dev:full
```

### Database Management

```bash
# View Supabase status
npm run supabase:status

# Open Supabase Studio (database admin interface)
npm run supabase:studio

# Reset database with fresh data
npm run supabase:reset

# Reset database and load seed data
npm run supabase:seed
```

### Database Migrations

```bash
# Create a new migration
npm run supabase:migration:new create_new_table

# Apply migrations to local database
npm run supabase:reset

# Push local migrations to remote (when ready)
npm run supabase:db:push
```

### Clean Development Environment

```bash
# Stop everything and start fresh
npm run dev:clean
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start React development server only |
| `npm run dev:full` | Start both Supabase and React dev server |
| `npm run dev:setup` | Initial setup (start Supabase + seed data) |
| `npm run dev:clean` | Clean restart (stop + start + seed) |
| `npm run supabase:start` | Start local Supabase stack |
| `npm run supabase:stop` | Stop local Supabase stack |
| `npm run supabase:status` | Show Supabase services status |
| `npm run supabase:studio` | Open Supabase Studio dashboard |
| `npm run supabase:reset` | Reset local database |
| `npm run supabase:seed` | Reset database and load seed data |
| `npm run supabase:db:push` | Push local migrations to remote |
| `npm run supabase:db:pull` | Pull remote schema to local |
| `npm run supabase:db:diff` | Show differences between local and remote |
| `npm run supabase:migration:new` | Create new migration file |

## Local Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| Supabase Studio | http://localhost:54323 | Database admin interface |
| API | http://localhost:54321 | Supabase API endpoint |
| Database | localhost:54322 | PostgreSQL database |
| Inbucket (Email) | http://localhost:54324 | Email testing interface |
| Edge Functions | http://localhost:54325 | Edge Functions runtime |

## Sample Data

The seed file (`supabase/seed.sql`) includes:

- **6 Family Members**: John & Mary Smith (grandparents), David & Sarah (parents), Emma & James (children)
- **Family Relationships**: Complete family tree with marriages, parent-child, and sibling relationships
- **Locations**: Current residences for all family members
- **Family Stories**: 3 sample stories with family member associations
- **Family Events**: 3 sample events with participant lists

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Stop all Supabase services
   npm run supabase:stop
   
   # Check what's using the ports
   lsof -i :54321
   lsof -i :54322
   lsof -i :54323
   ```

2. **Docker Issues**
   ```bash
   # Make sure Docker Desktop is running
   docker --version
   
   # Restart Docker if needed
   # (Restart Docker Desktop application)
   ```

3. **Database Connection Issues**
   ```bash
   # Check Supabase status
   npm run supabase:status
   
   # Reset everything
   npm run dev:clean
   ```

4. **Migration Issues**
   ```bash
   # Reset database to clean state
   npm run supabase:reset
   
   # Check migration files in supabase/migrations/
   ```

### Reset Everything

If you encounter persistent issues:

```bash
# Stop everything
npm run supabase:stop

# Remove Docker containers and volumes
docker system prune -a --volumes

# Start fresh
npm run dev:setup
```

## Production Deployment

When ready to deploy:

1. **Link to Remote Project**
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Push Migrations**
   ```bash
   npm run supabase:db:push
   ```

3. **Update Environment Variables**
   - Update `.env.local` with production Supabase URLs
   - Deploy your frontend with the production environment variables

## Additional Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development/overview)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Need Help?

- Check the [Supabase documentation](https://supabase.com/docs)
- Review the project's `.cursorrules` for development guidelines
- Open an issue in the repository
