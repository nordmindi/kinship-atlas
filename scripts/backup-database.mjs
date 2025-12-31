#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Creates a backup of the database and storage
 * Supports both local (Docker) and remote (Supabase Cloud) databases
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BACKUP_DIR = 'backups';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(BACKUP_DIR, `backup-${timestamp}`);

async function createBackup() {
  console.log('🔄 Starting database backup...');
  console.log(`   Mode: ${SUPABASE_MODE}`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Backup path: ${backupPath}\n`);

  // Create backup directory
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
  mkdirSync(backupPath, { recursive: true });

  try {
    // Backup metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      mode: SUPABASE_MODE,
      url: SUPABASE_URL,
      version: '1.0.0',
    };
    writeFileSync(
      join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Backup family members
    console.log('📦 Backing up family members...');
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .is('deleted_at', null); // Only active records

    if (membersError) {
      console.error('❌ Error backing up family members:', membersError);
    } else {
      writeFileSync(
        join(backupPath, 'family_members.json'),
        JSON.stringify(members || [], null, 2)
      );
      console.log(`   ✅ Backed up ${members?.length || 0} family members`);
    }

    // Backup relations
    console.log('📦 Backing up relations...');
    const { data: relations, error: relationsError } = await supabase
      .from('relations')
      .select('*')
      .is('deleted_at', null);

    if (relationsError) {
      console.error('❌ Error backing up relations:', relationsError);
    } else {
      writeFileSync(
        join(backupPath, 'relations.json'),
        JSON.stringify(relations || [], null, 2)
      );
      console.log(`   ✅ Backed up ${relations?.length || 0} relations`);
    }

    // Backup stories
    console.log('📦 Backing up stories...');
    const { data: stories, error: storiesError } = await supabase
      .from('family_stories')
      .select('*')
      .is('deleted_at', null);

    if (storiesError) {
      console.error('❌ Error backing up stories:', storiesError);
    } else {
      writeFileSync(
        join(backupPath, 'family_stories.json'),
        JSON.stringify(stories || [], null, 2)
      );
      console.log(`   ✅ Backed up ${stories?.length || 0} stories`);
    }

    // Backup media
    console.log('📦 Backing up media...');
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .is('deleted_at', null);

    if (mediaError) {
      console.error('❌ Error backing up media:', mediaError);
    } else {
      writeFileSync(
        join(backupPath, 'media.json'),
        JSON.stringify(media || [], null, 2)
      );
      console.log(`   ✅ Backed up ${media?.length || 0} media records`);
    }

    // Backup locations
    console.log('📦 Backing up locations...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .is('deleted_at', null);

    if (locationsError) {
      console.error('❌ Error backing up locations:', locationsError);
    } else {
      writeFileSync(
        join(backupPath, 'locations.json'),
        JSON.stringify(locations || [], null, 2)
      );
      console.log(`   ✅ Backed up ${locations?.length || 0} locations`);
    }

    // For local Docker backups, also backup the data directory
    if (SUPABASE_MODE === 'local' && existsSync('docker-data')) {
      console.log('📦 Backing up Docker data directory...');
      try {
        execSync(`tar -czf ${join(backupPath, 'docker-data.tar.gz')} docker-data/`, {
          stdio: 'inherit',
        });
        console.log('   ✅ Backed up Docker data directory');
      } catch (error) {
        console.warn('   ⚠️  Could not backup Docker data directory:', error.message);
      }
    }

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`   Location: ${backupPath}`);
    console.log(`   Files: ${JSON.stringify(metadata, null, 2)}`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

createBackup();

