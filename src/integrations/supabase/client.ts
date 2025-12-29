import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Determine which Supabase instance to use based on VITE_SUPABASE_MODE
const SUPABASE_MODE = import.meta.env.VITE_SUPABASE_MODE || 'local';

// Get configuration based on mode
const getSupabaseConfig = () => {
  if (SUPABASE_MODE === 'remote') {
    // Use remote Supabase configuration
    return {
      url: import.meta.env.VITE_SUPABASE_URL_REMOTE || import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_REMOTE || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  } else {
    // Use local Supabase configuration (default)
    return {
      url: import.meta.env.VITE_SUPABASE_URL_LOCAL || import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:60011",
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    };
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

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(config.url, config.anonKey);

// Debug logging for development
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Client Configuration:');
  console.log('   Mode:', SUPABASE_MODE);
  console.log('   URL:', config.url);
  console.log('   Anon Key:', config.anonKey.substring(0, 20) + '...');
}