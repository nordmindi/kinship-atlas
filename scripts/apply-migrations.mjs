#!/usr/bin/env node

/**
 * Apply Migrations Script
 * 
 * Provides instructions for applying database migrations.
 * Note: Migrations should be applied via Supabase CLI or Dashboard.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

async function showMigrationInstructions() {
  console.log('📋 Database Migration Instructions\n');
  console.log('='.repeat(70));
  
  const migrationsDir = 'supabase/migrations';
  
  if (!existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }
  
  const migrationFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found in', migrationsDir);
    return;
  }
  
  console.log(`\n📁 Found ${migrationFiles.length} migration file(s):\n`);
  migrationFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('\n🚀 How to Apply Migrations:\n');
  
  console.log('1. Using Supabase CLI (Recommended):');
  console.log('   supabase db push\n');
  
  console.log('2. Using Supabase Dashboard:');
  console.log('   - Go to SQL Editor');
  console.log('   - Copy and paste migration SQL');
  console.log('   - Run the query\n');
  
  console.log('3. For Clean Start (Local Development):');
  console.log('   npm run supabase:reset\n');
  console.log('   This will:');
  console.log('   - Drop all tables (if using clean slate migration)');
  console.log('   - Apply complete production schema\n');
  
  console.log('4. Manual Application (Local Docker):');
  console.log('   docker compose -f docker-compose.dev.yml exec db psql -U postgres -d postgres -f /path/to/migration.sql\n');
  
  console.log('='.repeat(70));
  console.log('\n💡 Recommended Approach:');
  console.log('   For new deployments: Use 20250215000000_complete_production_schema.sql');
  console.log('   For clean resets: Use 20250201000001_drop_all_tables_clean_slate.sql first, then complete schema\n');
}

showMigrationInstructions();

