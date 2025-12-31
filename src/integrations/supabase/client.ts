import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Determine which Supabase instance to use based on VITE_SUPABASE_MODE
const SUPABASE_MODE = import.meta.env.VITE_SUPABASE_MODE || 'local';

// Get configuration based on mode
const getSupabaseConfig = () => {
  if (SUPABASE_MODE === 'remote') {
    // Use remote Supabase configuration (production)
    return {
      url: import.meta.env.VITE_SUPABASE_URL_REMOTE || import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_REMOTE || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  } else {
    // Use local Supabase configuration (development)
    // In production, this should not be used - ensure VITE_SUPABASE_MODE=remote
    const url = import.meta.env.VITE_SUPABASE_URL_LOCAL || import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    // Only use hardcoded fallbacks in development
    if (import.meta.env.DEV) {
      // CRITICAL: Override any .env file values that use port 54321
      // The .env file might have old values, but we always want 60011 in dev
      let finalUrl = url || "http://localhost:60011";
      
      // If URL contains 54321, force it to 60011 (migration from old setup)
      if (finalUrl.includes('54321')) {
        console.warn('⚠️  Detected old Supabase URL (54321) in environment. Overriding to 60011.');
        finalUrl = finalUrl.replace(/:\d+/, ':60011').replace(/54321/, '60011');
      }
      
      return {
        // Default to proxy port 60011 (not direct 54321)
        url: finalUrl,
        anonKey: anonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      };
    }
    
    return { url, anonKey };
  }
};

const config = getSupabaseConfig();

// Validate configuration
if (!config.url) {
  throw new Error(`Missing Supabase URL. Please set VITE_SUPABASE_URL_${SUPABASE_MODE.toUpperCase()} or VITE_SUPABASE_URL in your .env.local file.`);
}

if (!config.anonKey) {
  throw new Error(`Missing Supabase Anon Key. Please set VITE_SUPABASE_ANON_KEY_${SUPABASE_MODE.toUpperCase()} or VITE_SUPABASE_ANON_KEY in your .env.local file.`);
}

// CRITICAL: Clean up old sessions BEFORE creating the client
// This prevents Supabase-js from loading old sessions with mismatched URLs
if (typeof window !== 'undefined') {
  try {
    const currentUrl = new URL(config.url);
    const currentHost = currentUrl.host; // e.g., "localhost:60011"
    const currentPort = currentUrl.port || (currentUrl.protocol === 'https:' ? '443' : '80');
    
    // Find and remove ALL Supabase localStorage keys that might be from different URLs
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          // Check for URL mismatches in the stored value
          let shouldRemove = false;
          
          try {
            const parsed = JSON.parse(storedValue);
            if (parsed && typeof parsed === 'object') {
              const valueStr = JSON.stringify(parsed);
              
              // Remove if it contains references to port 54321 (old URL)
              if (valueStr.includes('54321') || valueStr.includes('localhost:54321')) {
                shouldRemove = true;
              }
              
              // Remove if it contains a different host/port than current
              // Check for any URL that doesn't match current host
              const urlMatches = valueStr.match(/https?:\/\/([^/\s"']+)/g);
              if (urlMatches) {
                urlMatches.forEach(match => {
                  try {
                    const matchUrl = new URL(match);
                    const matchHost = matchUrl.host;
                    if (matchHost !== currentHost && matchHost.includes('localhost')) {
                      shouldRemove = true;
                    }
                  } catch {
                    // Ignore invalid URLs in the match
                  }
                });
              }
            }
          } catch {
            // If parsing fails, check raw value for old URL patterns
            if (storedValue.includes('54321') || 
                storedValue.includes('localhost:54321') ||
                (storedValue.includes('localhost') && !storedValue.includes(currentHost))) {
              shouldRemove = true;
            }
          }
          
          if (shouldRemove) {
            keysToRemove.push(key);
          }
        }
      }
    }
    
    // Remove old session data BEFORE client creation
    if (keysToRemove.length > 0) {
      console.log('🧹 Cleaning up old Supabase sessions from different URL...');
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`   Removed: ${key}`);
      });
      console.log(`✅ Cleared ${keysToRemove.length} old session(s). Client will initialize with clean state.`);
    }
    
    // Also clear sessionStorage for good measure
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        sessionKeysToRemove.push(key);
      }
    }
    if (sessionKeysToRemove.length > 0) {
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
  } catch (error) {
    console.warn('Error cleaning up old sessions:', error);
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Create client AFTER cleanup is complete
// This ensures Supabase-js doesn't load old sessions with mismatched URLs
export const supabase = createClient<Database>(config.url, config.anonKey);

// Debug logging for development only
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Client Configuration:');
  console.log('   Mode:', SUPABASE_MODE);
  console.log('   URL:', config.url);
  console.log('   Anon Key:', config.anonKey?.substring(0, 20) + '...');
  
  // Verify connectivity
  console.log('   ✅ Client initialized with URL:', config.url);
  console.log('   💡 If you see connection errors, check:');
  console.log('      1. Supabase containers are running (docker ps)');
  console.log('      2. URL matches proxy port (http://localhost:60011)');
  console.log('      3. Browser console for network errors');
}