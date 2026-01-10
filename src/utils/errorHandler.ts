/**
 * Error Handling and Sanitization Utilities
 * 
 * Provides secure error handling that prevents information disclosure
 * while maintaining useful error messages for users.
 */

/**
 * Sanitizes error messages to prevent information disclosure
 * Maps internal errors to user-friendly messages
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Authentication and authorization errors
    if (
      message.includes('permission denied') ||
      message.includes('rls') ||
      message.includes('row-level security') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('access denied')
    ) {
      return 'You do not have permission to perform this action.';
    }
    
    // Network and connection errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('failed to fetch')
    ) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('aborted')
    ) {
      return 'Request timed out. Please try again.';
    }
    
    // Not found errors
    if (
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('does not exist')
    ) {
      return 'The requested resource was not found.';
    }
    
    // Validation errors (these are usually safe to show)
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('must be')
    ) {
      // Return original message for validation errors as they're user-friendly
      return error.message;
    }
    
    // Database errors (hide internal details)
    if (
      message.includes('database') ||
      message.includes('sql') ||
      message.includes('constraint') ||
      message.includes('foreign key') ||
      message.includes('unique constraint')
    ) {
      return 'A database error occurred. Please try again or contact support if the problem persists.';
    }
    
    // File upload errors
    if (
      message.includes('file') ||
      message.includes('upload') ||
      message.includes('too large') ||
      message.includes('size limit')
    ) {
      // File size errors are usually safe to show
      if (message.includes('too large') || message.includes('size limit')) {
        return error.message;
      }
      return 'File upload failed. Please check the file and try again.';
    }
    
    // Session/auth errors
    if (
      message.includes('session') ||
      message.includes('token') ||
      message.includes('expired') ||
      message.includes('invalid token')
    ) {
      return 'Your session has expired. Please sign in again.';
    }
    
    // Generic error for unknown issues
    return 'An error occurred. Please try again later.';
  }
  
  // Handle non-Error objects
  if (typeof error === 'string') {
    return sanitizeErrorMessage(new Error(error));
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Extracts safe error details for logging (removes sensitive information)
 */
export function sanitizeErrorForLogging(error: unknown): {
  message: string;
  type: string;
  stack?: string;
} {
  const isDev = import.meta.env.DEV;
  
  if (error instanceof Error) {
    // In development, show full error details
    if (isDev) {
      return {
        message: error.message,
        type: error.name,
        stack: error.stack,
      };
    }
    
    // In production, sanitize the message
    let sanitizedMessage = error.message;
    
    // Remove potential secrets
    sanitizedMessage = sanitizedMessage.replace(
      /password[=:]\s*[^\s,}]+/gi,
      'password=***'
    );
    sanitizedMessage = sanitizedMessage.replace(
      /token[=:]\s*[^\s,}]+/gi,
      'token=***'
    );
    sanitizedMessage = sanitizedMessage.replace(
      /key[=:]\s*[^\s,}]+/gi,
      'key=***'
    );
    sanitizedMessage = sanitizedMessage.replace(
      /secret[=:]\s*[^\s,}]+/gi,
      'secret=***'
    );
    
    // Remove stack traces in production (too much info)
    return {
      message: sanitizedMessage,
      type: error.name,
    };
  }
  
  return {
    message: String(error),
    type: 'Unknown',
  };
}

/**
 * Creates a user-friendly error object
 */
export function createUserError(
  error: unknown,
  context?: string
): {
  message: string;
  userMessage: string;
  context?: string;
} {
  return {
    message: error instanceof Error ? error.message : String(error),
    userMessage: sanitizeErrorMessage(error),
    context,
  };
}
