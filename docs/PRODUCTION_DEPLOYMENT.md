# Production Deployment Guide

This guide covers the steps required to deploy Kinship Atlas to production.

## Prerequisites

1. **Supabase Project**: Create a production Supabase project at [supabase.com](https://supabase.com)
2. **Environment Variables**: Configure all required environment variables
3. **Database Migrations**: Ensure all migrations are applied to production database
4. **Storage Buckets**: Configure Supabase Storage buckets for media files

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file (or configure in your deployment platform) with the following:

```env
# REQUIRED: Set to 'remote' for production
VITE_SUPABASE_MODE=remote

# REQUIRED: Production Supabase configuration
VITE_SUPABASE_URL_REMOTE=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY_REMOTE=your-production-anon-key

# Optional: Mapbox token for Family Map feature
VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

### Getting Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** → `VITE_SUPABASE_URL_REMOTE`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY_REMOTE`

⚠️ **Security Note**: Never commit `.env.local` to version control. Use your deployment platform's environment variable configuration.

## Database Setup

### 1. Apply Migrations

All database migrations must be applied to your production database:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manual application via Supabase Dashboard
# Navigate to SQL Editor and run migrations in order
```

Migration files are located in: `supabase/migrations/`

### 2. Verify Schema

Ensure the following tables exist:
- `family_members`
- `family_relationships`
- `family_stories`
- `media`
- `user_profiles`
- `schema_migrations` (for tracking applied migrations)

### 3. Configure Row Level Security (RLS)

RLS policies should already be in place via migrations. Verify in Supabase Dashboard:
- **Authentication** → **Policies**

## Storage Configuration

### 1. Create Storage Buckets

In Supabase Dashboard → **Storage**, create the following buckets:

- **`family-media`**: For family photos, documents, audio, and video files
  - Public: `false` (private bucket)
  - File size limit: Configure as needed (default: 50MB)

### 2. Configure Storage Policies

Storage policies are configured via migrations. Verify they allow:
- Authenticated users to upload files
- Users to access only their own files
- Public read access for media linked to family members (if desired)

## Build and Deploy

### 1. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### 2. Deploy to Hosting Platform

#### Vercel (Recommended)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to production
npm run vercel:deploy
```

Or use the Vercel dashboard:
1. Connect your repository
2. Configure environment variables
3. Deploy

#### Other Platforms

Deploy the `dist/` folder to your hosting provider:
- **Netlify**: Drag and drop `dist/` folder or connect via Git
- **AWS S3 + CloudFront**: Upload `dist/` to S3 bucket
- **Self-hosted**: Serve `dist/` with nginx, Apache, or similar

### 3. Configure CORS

Ensure your Supabase project allows requests from your production domain:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Add your production domain to **Allowed CORS origins**

Example:
```
https://your-domain.com
https://www.your-domain.com
```

## Post-Deployment Checklist

- [ ] Environment variables configured correctly
- [ ] Database migrations applied
- [ ] Storage buckets created and configured
- [ ] RLS policies active
- [ ] CORS configured for production domain
- [ ] Build completes without errors
- [ ] Application loads in production
- [ ] Authentication works (sign up/sign in)
- [ ] Family member creation works
- [ ] Media upload works
- [ ] Family tree displays correctly
- [ ] All features tested in production environment

## Security Considerations

### Production Security Checklist

- [ ] **No hardcoded credentials**: All secrets in environment variables
- [ ] **RLS enabled**: Row-level security policies active on all tables
- [ ] **Storage policies**: Proper access control on storage buckets
- [ ] **HTTPS only**: Production site served over HTTPS
- [ ] **Environment variables**: Never exposed in client-side code
- [ ] **API keys**: Only anon key in client (never service role key)
- [ ] **CORS**: Restricted to production domain only
- [ ] **Error messages**: No sensitive information in error responses

### Monitoring

Consider setting up:
- **Error tracking**: Sentry, LogRocket, or similar
- **Analytics**: Google Analytics, Plausible, or similar
- **Uptime monitoring**: UptimeRobot, Pingdom, or similar

## Troubleshooting

### Common Issues

#### "Missing Supabase URL" Error
- Ensure `VITE_SUPABASE_MODE=remote` is set
- Verify `VITE_SUPABASE_URL_REMOTE` is configured
- Check that environment variables are loaded in your deployment platform

#### Authentication Not Working
- Verify CORS is configured for your domain
- Check that Supabase project is active
- Ensure RLS policies allow authenticated access

#### Media Upload Fails
- Verify `family-media` bucket exists
- Check storage policies allow uploads
- Ensure file size limits are appropriate

#### Database Errors
- Verify all migrations are applied
- Check database connection in Supabase Dashboard
- Review RLS policies for proper access

## Rollback Plan

If issues occur after deployment:

1. **Revert deployment**: Use your platform's rollback feature
2. **Check logs**: Review error logs in deployment platform and Supabase
3. **Database rollback**: If needed, revert specific migrations
4. **Environment variables**: Verify all are correctly set

## Support

For issues or questions:
- Check [README.md](../README.md) for general information
- Review [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for development setup
- Check Supabase documentation: https://supabase.com/docs

