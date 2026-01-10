/**
 * Production-safe logging utility
 * Only logs in development mode to avoid console noise in production
 * Sanitizes errors in production to prevent information disclosure
 */

import { sanitizeErrorForLogging } from './errorHandler';

const isDevelopment = import.meta.env.DEV;

/**
 * Sanitizes arguments for production logging
 */
function sanitizeArgs(args: unknown[]): unknown[] {
  if (isDevelopment) {
    return args; // Show everything in development
  }
  
  // In production, sanitize sensitive information
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Remove potential secrets
      return arg
        .replace(/password[=:]\s*[^\s,}]+/gi, 'password=***')
        .replace(/token[=:]\s*[^\s,}]+/gi, 'token=***')
        .replace(/key[=:]\s*[^\s,}]+/gi, 'key=***')
        .replace(/secret[=:]\s*[^\s,}]+/gi, 'secret=***')
        .replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'JWT_TOKEN');
    }
    
    if (arg instanceof Error) {
      return sanitizeErrorForLogging(arg);
    }
    
    return arg;
  });
}

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
    // In production, logs are silently ignored (or could send to analytics)
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, sanitize before logging
      const sanitized = sanitizeArgs(args);
      console.error(...sanitized);
      
      // TODO: In the future, send to error tracking service (Sentry, LogRocket, etc.)
      // errorTrackingService.captureException(args[0], { extra: args.slice(1) });
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    } else {
      // In production, sanitize warnings
      const sanitized = sanitizeArgs(args);
      console.warn(...sanitized);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
    // Debug logs are completely disabled in production
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
    // Info logs are disabled in production
  },
};

