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
# Copy the environment template
cp env.template .env.local
```

The `.env.local` file should contain:

```env
# Use local Supabase (Docker Compose)
VITE_SUPABASE_MODE=local
VITE_SUPABASE_URL_LOCAL=http://localhost:60011
VITE_SUPABASE_ANON_KEY_LOCAL=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
- **Supabase Studio**: http://localhost:60002
- **API (via proxy)**: http://localhost:60011
- **Database**: localhost:60000

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

### Data Persistence

The Docker setup uses **bind mounts** to store database and storage data in the `docker-data/` directory within your project. This ensures:

- ✅ **Data persists through Docker container restarts**
- ✅ **Data persists through Docker daemon restarts**
- ✅ **Data persists through computer restarts**
- ✅ **Easy backup** - just backup the `docker-data/` directory
- ✅ **Easy inspection** - data is stored in a known location

**Data Storage Locations:**
- Database data: `./docker-data/db/`
- Storage assets (uploaded files): `./docker-data/storage/`

**Important Notes:**
- The `docker-data/` directory is automatically created when you first start the containers
- This directory is excluded from git (via `.gitignore`) to avoid committing large data files
- To completely reset your data, you can delete the `docker-data/` directory and restart containers
- Always stop containers before deleting the `docker-data/` directory to avoid data corruption

**Backup Your Data:**
```bash
# Stop containers first
npm run supabase:stop

# Backup the data directory
cp -r docker-data docker-data-backup

# Or use tar for compression
tar -czf docker-data-backup.tar.gz docker-data/
```

**Restore Your Data:**
```bash
# Stop containers
npm run supabase:stop

# Restore from backup
cp -r docker-data-backup docker-data

# Or from compressed backup
tar -xzf docker-data-backup.tar.gz

# Start containers
npm run supabase:start
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
| Supabase Studio | http://localhost:60002 | Database admin interface |
| API (via proxy) | http://localhost:60011 | Supabase API endpoint |
| Database | localhost:60000 | PostgreSQL database |
| Inbucket (Email) | http://localhost:60003 | Email testing interface |
| Storage API | http://localhost:60006 | File storage API |
| Realtime | http://localhost:60008 | Realtime subscriptions |
| PostgREST | http://localhost:60009 | REST API |

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
   lsof -i :60000
   lsof -i :60002
   lsof -i :60011
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

# Option 1: Remove Docker containers and volumes (keeps docker-data/)
docker-compose -f docker-compose.dev.yml down -v

# Option 2: Complete reset (removes all data including docker-data/)
docker-compose -f docker-compose.dev.yml down -v
rm -rf docker-data/

# Start fresh
npm run dev:setup
```

**Note:** Option 2 will permanently delete all your local database data and uploaded files. Use with caution!

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
