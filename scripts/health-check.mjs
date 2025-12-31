#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * Performs comprehensive health checks on the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

// Load environment variables
const envFile = '.env.local';
let envVars = {};

if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    }
  });
} else {
  console.warn('⚠️  .env.local file not found. Using defaults for local development.\n');
}

const SUPABASE_MODE = envVars.VITE_SUPABASE_MODE || process.env.VITE_SUPABASE_MODE || 'local';
const SUPABASE_URL = SUPABASE_MODE === 'remote'
  ? envVars.VITE_SUPABASE_URL_REMOTE || process.env.VITE_SUPABASE_URL_REMOTE || envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  : envVars.VITE_SUPABASE_URL_LOCAL || process.env.VITE_SUPABASE_URL_LOCAL || envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://localhost:60011';

const SUPABASE_ANON_KEY = SUPABASE_MODE === 'remote'
  ? envVars.VITE_SUPABASE_ANON_KEY_REMOTE || process.env.VITE_SUPABASE_ANON_KEY_REMOTE || envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  : envVars.VITE_SUPABASE_ANON_KEY_LOCAL || process.env.VITE_SUPABASE_ANON_KEY_LOCAL || envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('\nPlease create a .env.local file with:');
  console.error('  VITE_SUPABASE_MODE=local');
  console.error('  VITE_SUPABASE_URL_LOCAL=http://localhost:60011');
  console.error('  VITE_SUPABASE_ANON_KEY_LOCAL=your-anon-key');
  console.error('\nOr copy env.template to .env.local:');
  console.error('  cp env.template .env.local\n');
  process.exit(1);
}

console.log(`📋 Configuration:`);
console.log(`   Mode: ${SUPABASE_MODE}`);
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function performHealthCheck() {
  console.log('🏥 Performing health check...\n');
  
  const checks = {
    connection: false,
    tables: false,
    constraints: false,
    orphanedData: false,
    migrations: false,
  };

  // 1. Connection check
  console.log('1. Testing database connection...');
  try {
    const { error } = await supabase.from('family_members').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
      throw error;
    }
    checks.connection = true;
    console.log('   ✅ Connection successful\n');
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message, '\n');
    return checks;
  }

  // 2. Table existence check
  console.log('2. Checking required tables...');
  const requiredTables = ['family_members', 'relations', 'family_stories', 'media', 'locations'];
  const optionalTables = ['audit_log']; // New tables from recent migrations
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.error(`   ❌ Table ${table} not accessible:`, error.message);
        allTablesExist = false;
      } else {
        console.log(`   ✅ Table ${table} exists`);
      }
    } catch (error) {
      console.error(`   ❌ Table ${table} check failed:`, error.message);
      allTablesExist = false;
    }
  }
  
  // Check optional tables (new features)
  for (const table of optionalTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.warn(`   ⚠️  Table ${table} not found (optional - run migrations to enable)`);
      } else {
        console.log(`   ✅ Table ${table} exists`);
      }
    } catch (error) {
      // Optional table, just warn
      console.warn(`   ⚠️  Table ${table} not accessible (optional)`);
    }
  }
  
  checks.tables = allTablesExist;
  console.log('');

  // 3. Check for orphaned data
  console.log('3. Checking for orphaned data...');
  try {
    const { data: orphanedRelations } = await supabase.rpc('cleanup_orphaned_relations');
    const { data: orphanedLocations } = await supabase.rpc('cleanup_orphaned_locations');
    
    const orphanedRelCount = orphanedRelations?.[0]?.orphaned_count || 0;
    const orphanedLocCount = orphanedLocations?.[0]?.orphaned_count || 0;
    
    if (orphanedRelCount > 0) {
      console.warn(`   ⚠️  Found ${orphanedRelCount} orphaned relations`);
    } else {
      console.log('   ✅ No orphaned relations');
    }
    
    if (orphanedLocCount > 0) {
      console.warn(`   ⚠️  Found ${orphanedLocCount} orphaned locations`);
    } else {
      console.log('   ✅ No orphaned locations');
    }
    
    checks.orphanedData = orphanedRelCount === 0 && orphanedLocCount === 0;
  } catch (error) {
    console.warn('   ⚠️  Could not check orphaned data:', error.message);
  }
  console.log('');

  // 4. Migration status
  console.log('4. Checking migration status...');
  try {
    const { data: migrations, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('applied_at', { ascending: false });
    
    if (error) {
      console.warn('   ⚠️  Could not check migrations:', error.message);
    } else {
      console.log(`   ✅ Found ${migrations?.length || 0} applied migrations`);
      checks.migrations = true;
    }
  } catch (error) {
    console.warn('   ⚠️  Migration check failed:', error.message);
  }
  console.log('');

  // Summary
  console.log('📊 Health Check Summary:');
  console.log(`   Connection: ${checks.connection ? '✅' : '❌'}`);
  console.log(`   Tables: ${checks.tables ? '✅' : '❌'}`);
  console.log(`   Orphaned Data: ${checks.orphanedData ? '✅' : '⚠️'}`);
  console.log(`   Migrations: ${checks.migrations ? '✅' : '⚠️'}`);
  
  const allHealthy = Object.values(checks).every(v => v === true);
  console.log(`\n${allHealthy ? '✅' : '⚠️'} Overall: ${allHealthy ? 'Healthy' : 'Issues detected'}`);
  
  return checks;
}

performHealthCheck().then(checks => {
  const allHealthy = Object.values(checks).every(v => v === true);
  process.exit(allHealthy ? 0 : 1);
});

