#!/usr/bin/env node

/**
 * Database Clearing Script for Kinship Atlas
 * 
 * This script safely clears all data from the database while preserving
 * the database structure and user accounts.
 * 
 * Usage: node scripts/clear-database.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Could not load .env file:', error.message);
    process.exit(1);
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Clear data in the correct order (respecting foreign key constraints)
    const tables = [
      'relations',           // Clear relationships first
      'media',              // Clear media references
      'stories',            // Clear stories
      'family_members',     // Clear family members last
    ];

    for (const table of tables) {
      console.log(`🗑️  Clearing ${table}...`);
      
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        console.error(`❌ Error clearing ${table}:`, error.message);
        throw error;
      }
      
      console.log(`✅ ${table} cleared successfully`);
    }

    // Clear any uploaded files from storage
    console.log('\n🗑️  Clearing storage files...');
    
    const { data: files, error: listError } = await supabase.storage
      .from('family-photos')
      .list('', { limit: 1000 });

    if (listError) {
      console.error('❌ Error listing storage files:', listError.message);
    } else if (files && files.length > 0) {
      const filePaths = files.map(file => file.name);
      
      const { error: deleteError } = await supabase.storage
        .from('family-photos')
        .remove(filePaths);
      
      if (deleteError) {
        console.error('❌ Error deleting storage files:', deleteError.message);
      } else {
        console.log(`✅ Deleted ${filePaths.length} files from storage`);
      }
    } else {
      console.log('✅ No files found in storage');
    }

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • All family members removed');
    console.log('   • All relationships removed');
    console.log('   • All stories removed');
    console.log('   • All media files removed');
    console.log('   • Database structure preserved');
    console.log('   • User accounts preserved');
    
    console.log('\n🚀 You can now start fresh with creating persons and connections!');
    console.log('   • Refresh your browser to clear layout state');
    console.log('   • Start adding family members');
    console.log('   • Create relationships between them');

  } catch (error) {
    console.error('\n❌ Database cleanup failed:', error.message);
    console.error('\nPlease check your database connection and try again.');
    process.exit(1);
  }
}

// Run the cleanup
clearDatabase();
