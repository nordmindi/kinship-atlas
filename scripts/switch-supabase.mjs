#!/usr/bin/env node

/**
 * Switch Supabase Configuration Script
 * 
 * This script helps you switch between local and remote Supabase configurations.
 * 
 * Usage:
 *   node scripts/switch-supabase.mjs local
 *   node scripts/switch-supabase.mjs remote
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function switchSupabaseMode() {
  const mode = process.argv[2]?.toLowerCase();
  
  if (!mode || !['local', 'remote'].includes(mode)) {
    console.log('❌ Invalid mode. Use "local" or "remote"');
    console.log('\nUsage:');
    console.log('  node scripts/switch-supabase.mjs local');
    console.log('  node scripts/switch-supabase.mjs remote');
    rl.close();
    process.exit(1);
  }

  const envPath = '.env.local';
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found.');
    console.log('   Please create it from env.template first.');
    rl.close();
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update VITE_SUPABASE_MODE
  if (envContent.includes('VITE_SUPABASE_MODE=')) {
    envContent = envContent.replace(
      /^VITE_SUPABASE_MODE=.*$/m,
      `VITE_SUPABASE_MODE=${mode}`
    );
  } else {
    // Add it at the beginning if it doesn't exist
    envContent = `VITE_SUPABASE_MODE=${mode}\n${envContent}`;
  }

  // Also update legacy VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for backward compatibility
  if (mode === 'local') {
    const localUrl = envContent.match(/^VITE_SUPABASE_URL_LOCAL=(.*)$/m)?.[1] || 'http://localhost:60011';
    const localKey = envContent.match(/^VITE_SUPABASE_ANON_KEY_LOCAL=(.*)$/m)?.[1] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    
    if (envContent.includes('VITE_SUPABASE_URL=') && !envContent.includes('VITE_SUPABASE_URL_LOCAL=')) {
      envContent = envContent.replace(/^VITE_SUPABASE_URL=.*$/m, `VITE_SUPABASE_URL=${localUrl}`);
    }
    if (envContent.includes('VITE_SUPABASE_ANON_KEY=') && !envContent.includes('VITE_SUPABASE_ANON_KEY_LOCAL=')) {
      envContent = envContent.replace(/^VITE_SUPABASE_ANON_KEY=.*$/m, `VITE_SUPABASE_ANON_KEY=${localKey}`);
    }
  } else {
    const remoteUrl = envContent.match(/^VITE_SUPABASE_URL_REMOTE=(.*)$/m)?.[1];
    const remoteKey = envContent.match(/^VITE_SUPABASE_ANON_KEY_REMOTE=(.*)$/m)?.[1];
    
    if (remoteUrl && envContent.includes('VITE_SUPABASE_URL=') && !envContent.includes('VITE_SUPABASE_URL_REMOTE=')) {
      envContent = envContent.replace(/^VITE_SUPABASE_URL=.*$/m, `VITE_SUPABASE_URL=${remoteUrl}`);
    }
    if (remoteKey && envContent.includes('VITE_SUPABASE_ANON_KEY=') && !envContent.includes('VITE_SUPABASE_ANON_KEY_REMOTE=')) {
      envContent = envContent.replace(/^VITE_SUPABASE_ANON_KEY=.*$/m, `VITE_SUPABASE_ANON_KEY=${remoteKey}`);
    }
  }

  fs.writeFileSync(envPath, envContent);

  console.log(`\n✅ Switched Supabase mode to: ${mode.toUpperCase()}`);
  console.log(`\n📝 Updated ${path.resolve(envPath)}`);
  console.log('\n⚠️  IMPORTANT: Restart your development server for changes to take effect!');
  console.log('   Run: npm run dev\n');

  rl.close();
}

switchSupabaseMode().catch((error) => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

