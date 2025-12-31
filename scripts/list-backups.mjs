#!/usr/bin/env node

/**
 * List Backups Script
 * 
 * Lists all available backups in a cross-platform way
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = 'backups';

if (!existsSync(BACKUP_DIR)) {
  console.log('No backups directory found.');
  console.log('Create a backup with: npm run backup:create');
  process.exit(0);
}

try {
  const backups = readdirSync(BACKUP_DIR)
    .filter(item => {
      const fullPath = join(BACKUP_DIR, item);
      return statSync(fullPath).isDirectory();
    })
    .sort()
    .reverse(); // Most recent first

  if (backups.length === 0) {
    console.log('No backups found.');
    console.log('Create a backup with: npm run backup:create');
    process.exit(0);
  }

  console.log(`Found ${backups.length} backup(s):\n`);
  
  backups.forEach((backup, index) => {
    const fullPath = join(BACKUP_DIR, backup);
    const stats = statSync(fullPath);
    const date = stats.mtime.toISOString().replace('T', ' ').substring(0, 19);
    
    console.log(`${index + 1}. ${backup}`);
    console.log(`   Created: ${date}`);
    console.log(`   Path: ${fullPath}\n`);
  });
} catch (error) {
  console.error('Error listing backups:', error.message);
  process.exit(1);
}

