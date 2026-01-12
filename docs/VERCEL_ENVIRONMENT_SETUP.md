# Vercel Environment Variables Setup Guide

## Required Environment Variables

For production deployment on Vercel, you need to set the following environment variables:

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your production project (or create one if you don't have it)
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (a long JWT token starting with `eyJ...`)

### 2. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### For Production Environment:

```
VITE_SUPABASE_MODE = remote
```

```
VITE_SUPABASE_URL_REMOTE = https://your-actual-project-ref.supabase.co
```
⚠️ **Replace** `your-actual-project-ref` with your actual Supabase project reference ID

```
VITE_SUPABASE_ANON_KEY_REMOTE = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
⚠️ **Replace** with your actual anon/public key from Supabase

### 3. Optional: Mapbox Token (for Family Map feature)

If you want to use the Family Map feature, also add:

```
VITE_MAPBOX_TOKEN = your-mapbox-token-here
```

### 4. Verify Your Settings

After setting the variables:

1. **Redeploy** your application (Vercel will automatically use the new environment variables)
2. Check the deployment logs to ensure no errors
3. Test the application to verify Supabase connection works

### 5. Verify Environment Variables Are Set

You can verify the variables are set correctly by:

1. Going to your Vercel project → **Settings** → **Environment Variables**
2. Ensure all three variables are listed:
   - ✅ `VITE_SUPABASE_MODE` = `remote`
   - ✅ `VITE_SUPABASE_URL_REMOTE` = `https://[your-project].supabase.co`
   - ✅ `VITE_SUPABASE_ANON_KEY_REMOTE` = `eyJ...` (long token)

### Important Notes

- ⚠️ **Never commit** these values to your repository
- ✅ Environment variables in Vercel are automatically injected during build
- ✅ The app will automatically use `remote` mode in production
- ✅ Make sure to use your **production** Supabase project, not a development one

### Troubleshooting

If you still see "Missing Supabase URL" error:

1. **Check variable names**: They must be exactly:
   - `VITE_SUPABASE_MODE`
   - `VITE_SUPABASE_URL_REMOTE`
   - `VITE_SUPABASE_ANON_KEY_REMOTE`

2. **Check environment scope**: Make sure variables are set for **Production** environment

3. **Redeploy**: After adding/changing variables, you must redeploy for changes to take effect

4. **Check build logs**: Look for any errors during the build process

5. **Verify Supabase project**: Ensure your Supabase project is active and accessible
