/**
 * Rate Limiting Utility
 * 
 * Provides client-side rate limiting to prevent abuse and reduce server load.
 * Note: This is a client-side implementation. Server-side rate limiting should
 * also be implemented at the API level (Supabase provides some protection).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  firstRequestAt: number;
}

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired records every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed based on rate limits
   * 
   * @param identifier - Unique identifier (e.g., user ID, IP, endpoint)
   * @param maxRequests - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if request is allowed, false if rate limited
   */
  check(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.records.get(identifier);

    // No record or window expired - allow request
    if (!record || now > record.resetAt) {
      this.records.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
        firstRequestAt: now,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    // Increment count and allow
    record.count++;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Get current rate limit status
   */
  getStatus(
    identifier: string,
    maxRequests: number
  ): { count: number; remaining: number; resetAt: number | null } {
    const record = this.records.get(identifier);
    
    if (!record) {
      return {
        count: 0,
        remaining: maxRequests,
        resetAt: null,
      };
    }

    const now = Date.now();
    if (now > record.resetAt) {
      return {
        count: 0,
        remaining: maxRequests,
        resetAt: null,
      };
    }

    return {
      count: record.count,
      remaining: Math.max(0, maxRequests - record.count),
      resetAt: record.resetAt,
    };
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, record] of this.records.entries()) {
      if (now > record.resetAt) {
        this.records.delete(identifier);
      }
    }
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit presets for common use cases
 */
export const RateLimits = {
  // Authentication endpoints - strict limits
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // File uploads - moderate limits
  FILE_UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // API requests - generous limits
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Search requests - moderate limits
  SEARCH: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Export requests - strict limits
  EXPORT: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Helper function to check rate limit with preset
 */
export function checkRateLimit(
  identifier: string,
  preset: keyof typeof RateLimits
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = RateLimits[preset];
  return rateLimiter.check(identifier, limit.maxRequests, limit.windowMs);
}

/**
 * Create a rate-limited function wrapper
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  identifier: string | ((...args: Parameters<T>) => string),
  preset: keyof typeof RateLimits
): T {
  return (async (...args: Parameters<T>) => {
    const id = typeof identifier === 'function' ? identifier(...args) : identifier;
    const result = checkRateLimit(id, preset);
    
    if (!result.allowed) {
      const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new Error(
        `Rate limit exceeded. Please try again in ${resetIn} second${resetIn !== 1 ? 's' : ''}.`
      );
    }
    
    return fn(...args);
  }) as T;
}
