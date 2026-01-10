# Security Utilities Usage Guide

This guide explains how to use the new security utilities implemented in the codebase.

## 1. Enhanced Logger (`src/utils/logger.ts`)

Replace all `console.log`, `console.error`, etc. with the logger utility to prevent information disclosure in production.

### Before:
```typescript
console.log('User data:', userData);
console.error('Error:', error);
```

### After:
```typescript
import { logger } from '@/utils/logger';

logger.log('User data:', userData);
logger.error('Error:', error);
```

### Features:
- **Development**: All logs work normally
- **Production**: 
  - `log()`, `warn()`, `debug()`, `info()` are disabled
  - `error()` sanitizes sensitive information before logging
  - Automatically removes passwords, tokens, keys, and JWT tokens

### Migration:
1. Replace `console.log` → `logger.log`
2. Replace `console.error` → `logger.error`
3. Replace `console.warn` → `logger.warn`
4. Replace `console.debug` → `logger.debug`
5. Replace `console.info` → `logger.info`

## 2. Error Sanitization (`src/utils/errorHandler.ts`)

Use this utility to create user-friendly error messages that don't expose internal details.

### Basic Usage:
```typescript
import { sanitizeErrorMessage, createUserError } from '@/utils/errorHandler';

try {
  await someOperation();
} catch (error) {
  // Show sanitized message to user
  const userMessage = sanitizeErrorMessage(error);
  toast.error(userMessage);
  
  // Log full error (sanitized in production)
  logger.error('Operation failed:', error);
}
```

### With Context:
```typescript
import { createUserError } from '@/utils/errorHandler';

try {
  await uploadFile(file);
} catch (error) {
  const userError = createUserError(error, 'file upload');
  toast.error(userError.userMessage);
  logger.error('Upload failed:', userError);
}
```

### Error Types Handled:
- Authentication/Authorization errors
- Network/Connection errors
- Timeout errors
- Not found errors
- Validation errors (shown as-is, usually safe)
- Database errors (sanitized)
- File upload errors
- Session/token errors

## 3. Rate Limiting (`src/utils/rateLimiter.ts`)

Prevent abuse by limiting request frequency.

### Basic Usage:
```typescript
import { checkRateLimit, RateLimits } from '@/utils/rateLimiter';

// Check rate limit before operation
const result = checkRateLimit(userId, 'AUTH');

if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`);
}

// Proceed with operation
await signIn(email, password);
```

### With Function Wrapper:
```typescript
import { withRateLimit, RateLimits } from '@/utils/rateLimiter';

// Wrap a function with rate limiting
const rateLimitedSignIn = withRateLimit(
  signIn,
  (email: string) => `auth:${email}`, // Create identifier from email
  'AUTH'
);

// Use normally - rate limiting is automatic
await rateLimitedSignIn(email, password);
```

### Available Presets:
- **AUTH**: 5 requests per 15 minutes (authentication endpoints)
- **FILE_UPLOAD**: 10 requests per minute (file uploads)
- **API**: 100 requests per minute (general API calls)
- **SEARCH**: 20 requests per minute (search operations)
- **EXPORT**: 3 requests per hour (data exports)

### Custom Rate Limits:
```typescript
import { rateLimiter } from '@/utils/rateLimiter';

const result = rateLimiter.check(
  `user:${userId}`,
  10, // max requests
  60 * 1000 // 1 minute window
);

if (!result.allowed) {
  // Handle rate limit
}
```

## 4. Integration Examples

### Authentication with Rate Limiting and Error Handling:
```typescript
import { checkRateLimit, RateLimits } from '@/utils/rateLimiter';
import { sanitizeErrorMessage } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

async function handleSignIn(email: string, password: string) {
  try {
    // Check rate limit
    const rateLimitResult = checkRateLimit(`auth:${email}`, 'AUTH');
    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      throw new Error(`Too many sign-in attempts. Please try again in ${waitTime} seconds.`);
    }
    
    // Attempt sign in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      throw error;
    }
    
    logger.log('User signed in successfully');
  } catch (error) {
    logger.error('Sign in failed:', error);
    const userMessage = sanitizeErrorMessage(error);
    toast.error(userMessage);
  }
}
```

### File Upload with Rate Limiting:
```typescript
import { checkRateLimit, RateLimits } from '@/utils/rateLimiter';
import { sanitizeErrorMessage } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

async function handleFileUpload(file: File) {
  try {
    // Check rate limit
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');
    
    const rateLimitResult = checkRateLimit(`upload:${userId}`, 'FILE_UPLOAD');
    if (!rateLimitResult.allowed) {
      throw new Error('Too many uploads. Please wait a moment and try again.');
    }
    
    // Upload file
    await uploadFile(file);
    
    logger.log('File uploaded successfully');
  } catch (error) {
    logger.error('Upload failed:', error);
    const userMessage = sanitizeErrorMessage(error);
    toast.error(userMessage);
  }
}
```

## Migration Checklist

When updating existing code:

- [ ] Replace `console.log` with `logger.log`
- [ ] Replace `console.error` with `logger.error`
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Replace `console.debug` with `logger.debug`
- [ ] Replace `console.info` with `logger.info`
- [ ] Wrap user-facing error messages with `sanitizeErrorMessage()`
- [ ] Add rate limiting to authentication endpoints
- [ ] Add rate limiting to file upload endpoints
- [ ] Add rate limiting to export operations
- [ ] Test error messages don't expose sensitive information
- [ ] Verify logs are sanitized in production builds

## Best Practices

1. **Always use logger instead of console**: Prevents information disclosure
2. **Sanitize user-facing errors**: Never show raw error messages to users
3. **Rate limit sensitive operations**: Authentication, uploads, exports
4. **Use appropriate rate limit presets**: Don't create overly restrictive limits
5. **Log errors for debugging**: Use logger.error() for errors, even if sanitized
6. **Test in production mode**: Verify logs and errors are properly sanitized

## Testing

### Test Rate Limiting:
```typescript
import { checkRateLimit, RateLimits } from '@/utils/rateLimiter';

// Should allow
const result1 = checkRateLimit('test', 'AUTH');
console.assert(result1.allowed === true);

// Should allow (within limit)
for (let i = 0; i < 4; i++) {
  checkRateLimit('test', 'AUTH');
}

// Should deny (exceeded limit)
const result2 = checkRateLimit('test', 'AUTH');
console.assert(result2.allowed === false);
```

### Test Error Sanitization:
```typescript
import { sanitizeErrorMessage } from '@/utils/errorHandler';

// Should sanitize database errors
const dbError = new Error('Database connection failed: password=secret123');
const sanitized = sanitizeErrorMessage(dbError);
console.assert(sanitized.includes('database error'));
console.assert(!sanitized.includes('password=secret123'));
```

## Notes

- Rate limiting is client-side only. Server-side rate limiting should also be implemented.
- Error sanitization prevents information disclosure but may hide useful debugging info in development.
- Logger automatically sanitizes in production, but you should still be careful about what you log.
- CSP headers are configured in `index.html` and apply to all pages.
