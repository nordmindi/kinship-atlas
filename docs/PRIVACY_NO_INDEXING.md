# Privacy: Search Engine Indexing Prevention

**Date**: 2026-01-10  
**Status**: ✅ Configured

## Overview

Kinship Atlas is a private family application and should not be indexed by search engines or discoverable via web crawlers. Users share links directly with family members.

## Implemented Protections

### 1. robots.txt

**Location**: `public/robots.txt`

Updated to disallow all web crawlers:
```
User-agent: *
Disallow: /
```

This tells all search engines and web crawlers to not index any pages on the site.

### 2. Meta Tags

**Location**: `index.html`

Added comprehensive noindex meta tags:
- `noindex` - Don't index this page
- `nofollow` - Don't follow links on this page
- `noarchive` - Don't cache/archive this page
- `nosnippet` - Don't show snippets in search results
- `noimageindex` - Don't index images

Applied to:
- General robots meta tag
- Googlebot-specific meta tag
- Bingbot-specific meta tag

### 3. HTTP Header

**Location**: `vercel.json`

Added `X-Robots-Tag` header to all responses:
```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex
```

This provides an additional layer of protection at the HTTP level.

## How It Works

1. **robots.txt**: First line of defense - tells crawlers not to access the site
2. **Meta Tags**: If a crawler ignores robots.txt, meta tags in HTML prevent indexing
3. **HTTP Header**: Server-level instruction that applies to all pages

## Verification

After deployment, verify the protections are working:

1. **Check robots.txt**: Visit `https://your-domain.com/robots.txt`
   - Should show `Disallow: /`

2. **Check meta tags**: View page source
   - Should see `noindex, nofollow` meta tags

3. **Check HTTP headers**: Use browser dev tools or curl
   ```bash
   curl -I https://your-domain.com
   ```
   - Should see `X-Robots-Tag` header

4. **Google Search Console**: If you have access, verify pages aren't indexed
   - Use "URL Inspection" tool
   - Should show "Excluded by 'noindex' tag"

## Important Notes

- **Existing Indexed Pages**: If pages were already indexed, they may remain in search results until:
  - Google/Bing re-crawl and see the noindex tags
  - You request removal via Search Console (if you have access)
  - Natural expiration (can take weeks/months)

- **Direct Links Still Work**: These protections don't prevent:
  - Users sharing direct links
  - Accessing the site via direct URL
  - Bookmarking pages
  - Only prevents search engine discovery

- **Social Media Sharing**: Meta tags don't prevent:
  - Sharing links on social media
  - Social media preview cards (Open Graph tags still work)
  - Direct link sharing via email, messaging, etc.

## If You Need to Remove Existing Indexed Pages

If your site was previously indexed and you want to remove it from search results:

1. **Google Search Console**:
   - Request URL removal
   - Use "Removals" tool
   - Can take a few days to process

2. **Bing Webmaster Tools**:
   - Similar removal request process

3. **Wait for Re-crawl**:
   - Search engines will eventually re-crawl and respect noindex tags
   - Can take several weeks

## Testing

To test that indexing is prevented:

1. **Test robots.txt**:
   ```bash
   curl https://your-domain.com/robots.txt
   ```

2. **Test meta tags**: View page source, search for "noindex"

3. **Test HTTP header**:
   ```bash
   curl -I https://your-domain.com | grep -i robots
   ```

## Reverting (If Needed)

If you ever need to allow indexing again:

1. Update `public/robots.txt`:
   ```
   User-agent: *
   Allow: /
   ```

2. Remove meta tags from `index.html`

3. Remove `X-Robots-Tag` header from `vercel.json`

4. Submit sitemap to search engines (if you create one)

## Related Documentation

- [Security Implementation](./SECURITY_IMPLEMENTATION_SUMMARY.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)

---

**Last Updated**: 2026-01-10
