# Mapbox Token Rotation Guide

## ⚠️ Action Required: Rotate Exposed Mapbox Token

A Mapbox token was previously hardcoded in the source code and has been removed. You need to rotate this token to prevent unauthorized usage.

## Step-by-Step Instructions

### 1. Access Mapbox Dashboard

1. Go to: https://account.mapbox.com/access-tokens/
2. Sign in to your Mapbox account

### 2. Locate the Exposed Token

The exposed token was:
```
pk.eyJ1IjoibG92YWJsZWFpIiwiYSI6ImNsdWs2OWdtcDA0YTYyam85OGczcmJtd2IifQ.a5Q5TBBMnJ9KJJPEiYgMpw
```

### 3. Delete or Regenerate the Token

**Option A: Delete the Token (Recommended if not in use)**
1. Find the token in your list
2. Click the "Delete" or trash icon next to it
3. Confirm deletion

**Option B: Regenerate the Token (If you want to keep using it)**
1. Find the token in your list
2. Click "Regenerate" or create a new token
3. Copy the new token

### 4. Update Environment Variables

After rotating the token, update your environment variables:

**For Local Development:**
```bash
# Edit .env.local
VITE_MAPBOX_TOKEN=your-new-token-here
```

**For Production:**
- Update the token in your deployment platform's environment variables:
  - Vercel: Project Settings → Environment Variables
  - Netlify: Site Settings → Environment Variables
  - Other platforms: Use their respective environment variable configuration

### 5. Verify the Fix

1. Restart your development server
2. Navigate to the Family Map page
3. Verify the map loads correctly with the new token

## Verification Checklist

- [ ] Logged into Mapbox dashboard
- [ ] Located the exposed token
- [ ] Deleted or regenerated the token
- [ ] Updated `.env.local` with new token (if regenerated)
- [ ] Updated production environment variables (if applicable)
- [ ] Tested map functionality with new token
- [ ] Verified no unauthorized usage in Mapbox dashboard

## Security Best Practices

Going forward:

1. **Never hardcode tokens** in source code
2. **Always use environment variables** for API keys and tokens
3. **Use different tokens** for development and production
4. **Rotate tokens regularly** (every 6-12 months)
5. **Monitor token usage** in the Mapbox dashboard for suspicious activity

## Need Help?

If you encounter issues:
- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Verify environment variables are loaded correctly
- Check browser console for error messages
- Ensure the token has proper permissions in Mapbox dashboard

## Token Status

✅ **Codebase Status**: Token removed from source code  
⚠️ **Action Required**: Rotate token in Mapbox dashboard  
✅ **Environment Variable**: Now required via `VITE_MAPBOX_TOKEN`
