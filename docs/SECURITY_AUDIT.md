# Security Audit Report

**Date**: 2025-02-15  
**Status**: ⚠️ Issues Found - Action Required

## Critical Issues

### 1. ⚠️ Hardcoded Mapbox Token (HIGH PRIORITY)

**Location**: `src/components/family/FamilyMap.tsx:41`

**Issue**: A real Mapbox token is hardcoded in the source code:
```typescript
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibG92YWJsZWFpIiwiYSI6ImNsdWs2OWdtcDA0YTYyam85OGczcmJtd2IifQ.a5Q5TBBMnJ9KJJPEiYgMpw';
```

**Risk**: 
- Token exposed in version control
- Anyone with access to the repository can use the token
- Potential unauthorized usage and billing

**Action Required**:
- ✅ Remove hardcoded token (fixed)
- Use environment variable only
- Rotate the exposed token in Mapbox dashboard
- Add token to `.gitignore` verification

**Status**: ✅ FIXED - Token removed from code

---

## Medium Priority Issues

### 2. Hardcoded Supabase Local Development Keys

**Locations**:
- `docker-compose.dev.yml` (lines 101-102, 127-128)
- `scripts/create-test-user.mjs` (line 10)
- `scripts/make-admin.mjs` (line 12)
- `scripts/verify-admin-status.mjs` (line 10)
- `scripts/health-check.mjs` (line 39)
- `scripts/backup-database.mjs` (line 42)
- `scripts/switch-supabase.mjs` (line 65)
- `scripts/setup-env.mjs` (line 89)
- `src/integrations/supabase/client.ts` (line 36)

**Issue**: Supabase demo/local development keys are hardcoded in multiple files.

**Risk**: 
- **LOW** - These are well-known Supabase local development keys
- Only work for local Docker Compose instances
- Cannot be used to access production or remote Supabase projects
- Standard practice for Supabase local development

**Action Required**:
- ✅ Add comments clarifying these are local dev keys only
- Document that production keys must never be hardcoded
- Ensure all scripts check for environment variables first

**Status**: ✅ DOCUMENTED - Keys are safe for local dev, but should be clearly marked

---

### 3. Hardcoded Test Credentials

**Location**: `scripts/create-test-user.mjs` (lines 19-20)

**Issue**: Test email and password are hardcoded:
```javascript
const testEmail = 'test@kinship-atlas.com';
const testPassword = 'testpassword123';
```

**Risk**: 
- **LOW** - Only used for local development
- Script creates test users in local Docker instance only
- Not used in production code

**Action Required**:
- ✅ Add warning comments that this is for local dev only
- Consider making credentials configurable via environment variables

**Status**: ✅ DOCUMENTED - Safe for local dev, clearly marked

---

### 4. Database Password in Docker Compose

**Location**: `docker-compose.dev.yml` (lines 21-22, 95)

**Issue**: Database password "postgres" is hardcoded in Docker Compose file.

**Risk**: 
- **LOW** - Standard default for local development
- Only affects local Docker containers
- Not exposed to production

**Action Required**:
- ✅ Document that this is local dev only
- For production, use environment variables or secrets management

**Status**: ✅ ACCEPTABLE - Standard practice for local dev

---

## Low Priority / Informational

### 5. Environment File Template

**Location**: `env.template`

**Status**: ✅ SAFE - Template file with placeholder values only

### 6. .gitignore Configuration

**Status**: ✅ VERIFIED - Properly configured to exclude:
- `.env` files
- `.env.local` files
- `*.local` files
- Build artifacts
- Test results

---

## Recommendations

### Immediate Actions

1. ✅ **Remove hardcoded Mapbox token** - COMPLETED
2. ✅ **Add security comments** - COMPLETED
3. ⚠️ **Rotate exposed Mapbox token** - ACTION REQUIRED (manual step)

### Best Practices Going Forward

1. **Never commit real API keys or tokens** to version control
2. **Always use environment variables** for sensitive configuration
3. **Use secrets management** for production deployments (Vercel, GitHub Secrets, etc.)
4. **Regular security audits** - Review codebase quarterly
5. **Use pre-commit hooks** to scan for secrets before commits

### Security Checklist for New Code

- [ ] No hardcoded API keys or tokens
- [ ] No hardcoded passwords or credentials
- [ ] Environment variables used for all sensitive data
- [ ] `.env.local` in `.gitignore`
- [ ] Production keys never in codebase
- [ ] Service role keys only in server-side code (if needed)
- [ ] Test credentials clearly marked as dev-only

---

## Verification

Run these commands to verify no secrets are committed:

```bash
# Check for JWT tokens (excluding known safe local dev keys)
grep -r "eyJ" --exclude-dir=node_modules --exclude-dir=.git | grep -v "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vI"

# Check for Mapbox tokens
grep -r "pk\." --exclude-dir=node_modules --exclude-dir=.git

# Check for .env files
find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*"
```

---

## Summary

**Total Issues Found**: 4  
**Critical**: 1 (✅ Fixed)  
**Medium**: 3 (✅ Documented/Safe)  
**Low**: 0

**Overall Status**: ✅ **SAFE FOR COMMIT** (after Mapbox token rotation)

All hardcoded values are either:
- Safe local development defaults (Supabase demo keys)
- Removed from code (Mapbox token)
- Clearly documented as dev-only (test credentials)

**Next Steps**:
1. ✅ Rotate the exposed Mapbox token in Mapbox dashboard (see [MAPBOX_TOKEN_ROTATION_GUIDE.md](./MAPBOX_TOKEN_ROTATION_GUIDE.md))
2. Update any production deployments with new token
3. Continue monitoring for new secrets in future commits

**Token Rotation Guide**: See [MAPBOX_TOKEN_ROTATION_GUIDE.md](./MAPBOX_TOKEN_ROTATION_GUIDE.md) for step-by-step instructions.
