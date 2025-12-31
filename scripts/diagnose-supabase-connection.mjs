#!/usr/bin/env node

/**
 * Diagnostic Script for Supabase Connection Issues
 * 
 * This script helps identify why the app is connecting to the wrong port.
 * Run this and share the output for analysis.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 SUPABASE CONNECTION DIAGNOSTIC');
console.log('=================================\n');

// 1. Check for .env.local file
console.log('1. ENVIRONMENT FILE CHECK');
console.log('---------------------------');
const envLocalPath = join(projectRoot, '.env.local');
if (existsSync(envLocalPath)) {
  console.log('✅ .env.local exists');
  const envContent = readFileSync(envLocalPath, 'utf-8');
  
  // Check for Supabase variables
  const supabaseMode = envContent.match(/VITE_SUPABASE_MODE=(.*)/)?.[1]?.trim();
  const supabaseUrlLocal = envContent.match(/VITE_SUPABASE_URL_LOCAL=(.*)/)?.[1]?.trim();
  const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const supabaseUrlRemote = envContent.match(/VITE_SUPABASE_URL_REMOTE=(.*)/)?.[1]?.trim();
  
  console.log(`   VITE_SUPABASE_MODE: ${supabaseMode || 'NOT SET'}`);
  console.log(`   VITE_SUPABASE_URL_LOCAL: ${supabaseUrlLocal || 'NOT SET'}`);
  console.log(`   VITE_SUPABASE_URL: ${supabaseUrl || 'NOT SET'}`);
  console.log(`   VITE_SUPABASE_URL_REMOTE: ${supabaseUrlRemote || 'NOT SET'}`);
  
  // Check for port 54321
  if (supabaseUrlLocal?.includes('54321') || supabaseUrl?.includes('54321')) {
    console.log('   ⚠️  WARNING: Found port 54321 in environment variables!');
  }
} else {
  console.log('❌ .env.local does NOT exist');
  console.log('   → App will use hardcoded fallback: http://localhost:60011');
}

// 2. Check client.ts configuration
console.log('\n2. CLIENT CONFIGURATION');
console.log('-------------------------');
const clientPath = join(projectRoot, 'src/integrations/supabase/client.ts');
if (existsSync(clientPath)) {
  const clientContent = readFileSync(clientPath, 'utf-8');
  
  // Check fallback URL
  const fallbackMatch = clientContent.match(/url.*localhost:(\d+)/);
  if (fallbackMatch) {
    console.log(`   Fallback URL port: ${fallbackMatch[1]}`);
    if (fallbackMatch[1] === '54321') {
      console.log('   ⚠️  WARNING: Fallback uses port 54321!');
    }
  }
  
  // Check if cleanup runs before or after client creation
  const clientCreatePos = clientContent.indexOf('createClient');
  const cleanupPos = clientContent.indexOf('Clean up old sessions');
  
  if (clientCreatePos < cleanupPos) {
    console.log('   ⚠️  WARNING: Client created BEFORE cleanup code');
    console.log('   → This is the root cause! Cleanup happens too late.');
  } else {
    console.log('   ✅ Cleanup runs before client creation');
  }
} else {
  console.log('❌ client.ts not found');
}

// 3. Check for other Supabase client instances
console.log('\n3. SUPABASE CLIENT INSTANCES');
console.log('-----------------------------');
const srcPath = join(projectRoot, 'src');
try {
  const { execSync } = await import('child_process');
  const grepResult = execSync(
    `grep -r "createClient" ${srcPath} --include="*.ts" --include="*.tsx" | grep -v node_modules`,
    { encoding: 'utf-8', cwd: projectRoot }
  );
  
  const instances = grepResult.trim().split('\n').filter(Boolean);
  console.log(`   Found ${instances.length} createClient call(s):`);
  instances.forEach((line, i) => {
    const file = line.split(':')[0];
    console.log(`   ${i + 1}. ${file}`);
  });
  
  if (instances.length > 1) {
    console.log('   ⚠️  WARNING: Multiple Supabase client instances may cause conflicts!');
  }
} catch (error) {
  console.log('   ⚠️  Could not search for client instances');
}

// 4. Browser diagnostic instructions
console.log('\n4. BROWSER DIAGNOSTIC (Run in Console)');
console.log('----------------------------------------');
console.log(`
Run this in your browser console (F12 → Console):

// Check localStorage
console.log('=== LOCALSTORAGE ===');
Object.keys(localStorage)
  .filter(k => k.startsWith('sb-'))
  .forEach(k => {
    console.log(k, ':', localStorage.getItem(k));
  });

// Check Supabase client URL
console.log('=== CLIENT CONFIG ===');
console.log('URL:', window.__SUPABASE_URL__ || 'Check supabase client');
console.log('Check: import { supabase } from "@/integrations/supabase/client"; supabase.supabaseUrl');

// Check active session
console.log('=== ACTIVE SESSION ===');
import('@/integrations/supabase/client').then(m => {
  m.supabase.auth.getSession().then(({data}) => {
    console.log('Session exists:', !!data.session);
    if (data.session) {
      console.log('Session user:', data.session.user?.id);
    }
  });
});
`);

console.log('\n✅ Diagnostic complete!');
console.log('📋 Share the output above and browser console results for analysis.\n');

