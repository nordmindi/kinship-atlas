#!/usr/bin/env node

/**
 * Apply New Migrations Script
 * 
 * Applies the audit logging and soft delete migrations to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

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
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigrations() {
  console.log('🔄 Applying new migrations...\n');
  
  const migrationsDir = 'supabase/migrations';
  const newMigrations = [
    '20250122000000_add_audit_logging.sql',
    '20250122000001_add_soft_deletes.sql'
  ];

  for (const migrationFile of newMigrations) {
    const migrationPath = join(migrationsDir, migrationFile);
    
    if (!existsSync(migrationPath)) {
      console.warn(`⚠️  Migration file not found: ${migrationFile}`);
      continue;
    }

    console.log(`📄 Applying ${migrationFile}...`);
    
    try {
      const sql = readFileSync(migrationPath, 'utf-8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s.length > 10);
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
            console.error(`   ❌ Error: ${error.message}`);
          }
        }
      }
      
      // For Supabase, we need to use the REST API or direct SQL execution
      // Since we can't execute arbitrary SQL via the client, we'll provide instructions
      console.log(`   ⚠️  Cannot execute SQL directly via Supabase client.`);
      console.log(`   Please apply this migration manually using one of these methods:\n`);
      console.log(`   1. Using Supabase Dashboard:`);
      console.log(`      - Go to SQL Editor`);
      console.log(`      - Copy contents of ${migrationPath}`);
      console.log(`      - Paste and run\n`);
      console.log(`   2. Using Docker (local only):`);
      console.log(`      docker compose -f docker-compose.dev.yml exec db psql -U postgres -d postgres -f /path/to/${migrationFile}\n`);
      console.log(`   3. Reset database (local only):`);
      console.log(`      npm run supabase:reset\n`);
      
    } catch (error) {
      console.error(`   ❌ Failed to read migration: ${error.message}`);
    }
  }
  
  console.log('\n✅ Migration application instructions provided.');
  console.log('💡 For local development, the easiest way is: npm run supabase:reset');
}

applyMigrations();

