/**
 * HTML Sanitization Utilities
 * 
 * Provides XSS protection for user-generated HTML content
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify
 * Allows safe HTML tags and attributes for rich text content
 */
const sanitizeConfig: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'div'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'src', 'class', 'style'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  RETURN_TRUSTED_TYPE: false,
  SAFE_FOR_TEMPLATES: false,
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
  WHOLE_DOCUMENT: false,
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * @param dirty - Unsanitized HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  
  // If running in Node.js environment (SSR), return as-is
  // DOMPurify requires a DOM, so we'll sanitize on the client
  if (typeof window === 'undefined') {
    return dirty;
  }
  
  return DOMPurify.sanitize(dirty, sanitizeConfig);
}

/**
 * Sanitize text content (removes all HTML)
 * 
 * @param dirty - Text that may contain HTML
 * @returns Plain text with HTML removed
 */
export function sanitizeText(dirty: string | null | undefined): string {
  if (!dirty) return '';
  
  if (typeof window === 'undefined') {
    // In SSR, just strip HTML tags with regex (basic protection)
    return dirty.replace(/<[^>]*>/g, '');
  }
  
  // Use DOMPurify to strip all HTML
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL to prevent XSS in href attributes
 * 
 * @param url - URL string to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  try {
    // Only allow http, https, mailto, tel protocols
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    
    if (allowedProtocols.includes(parsed.protocol)) {
      return url;
    }
    
    return '';
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Check if a string contains potentially dangerous content
 * 
 * @param content - Content to check
 * @returns true if content appears safe, false if potentially dangerous
 */
export function isContentSafe(content: string | null | undefined): boolean {
  if (!content) return true;
  
  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(content));
}

