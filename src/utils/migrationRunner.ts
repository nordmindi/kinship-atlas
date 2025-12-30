import { supabase } from '@/integrations/supabase/client';

/**
 * Migration file structure
 */
export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  sql: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  version: string;
  name: string;
  success: boolean;
  error?: string;
  executionTimeMs: number;
}

/**
 * Check if a migration has been applied
 */
async function isMigrationApplied(version: string): Promise<boolean> {
  try {
    // Type assertion needed because migration_applied is not in generated types yet
    const { data, error } = await (supabase.rpc as any)('migration_applied', { version });
    
    if (error) {
      // If the function doesn't exist, assume migration tracking isn't set up yet
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return false;
      }
      console.error('Error checking migration status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Record that a migration has been applied
 */
async function recordMigration(
  version: string,
  name: string,
  executionTimeMs: number,
  checksum?: string
): Promise<boolean> {
  try {
    // Type assertion needed because record_migration is not in generated types yet
    const { error } = await (supabase.rpc as any)('record_migration', {
      version,
      name,
      checksum: checksum || null,
      execution_time_ms: executionTimeMs
    });
    
    if (error) {
      console.error('Error recording migration:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording migration:', error);
    return false;
  }
}

/**
 * Execute a single migration SQL file
 */
async function executeMigration(migration: MigrationFile): Promise<MigrationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Running migration: ${migration.version} - ${migration.name}`);
    
    // Check if already applied
    const applied = await isMigrationApplied(migration.version);
    if (applied) {
      console.log(`⏭️  Migration ${migration.version} already applied, skipping`);
      return {
        version: migration.version,
        name: migration.name,
        success: true,
        executionTimeMs: 0
      };
    }
    
    // Execute the migration SQL
    // Note: Supabase client doesn't support multi-statement SQL directly
    // We need to split by semicolons and execute statements one by one
    const statements = migration.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Use the REST API to execute SQL (requires service role key in production)
    // For now, we'll use a workaround with the client
    // Type assertion needed because exec_sql is not in generated types yet
    const { error } = await (supabase.rpc as any)('exec_sql', { sql: migration.sql });
    
    if (error) {
      // Fallback: Try executing via direct query if RPC doesn't exist
      // This is a limitation - we need service role for raw SQL
      console.warn('⚠️  Cannot execute migration directly. Migrations should be run via Supabase CLI or service role.');
      console.warn('   Migration:', migration.version, migration.name);
      console.warn('   Error:', error.message);
      
      return {
        version: migration.version,
        name: migration.name,
        success: false,
        error: `Migration execution requires service role. Use Supabase CLI: supabase db push`,
        executionTimeMs: Date.now() - startTime
      };
    }
    
    const executionTimeMs = Date.now() - startTime;
    
    // Record the migration
    await recordMigration(migration.version, migration.name, executionTimeMs);
    
    console.log(`✅ Migration ${migration.version} applied successfully (${executionTimeMs}ms)`);
    
    return {
      version: migration.version,
      name: migration.name,
      success: true,
      executionTimeMs
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Migration ${migration.version} failed:`, errorMessage);
    
    return {
      version: migration.version,
      name: migration.name,
      success: false,
      error: errorMessage,
      executionTimeMs
    };
  }
}

/**
 * Check database health and migration status
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  migrationsTableExists: boolean;
  appliedMigrations: number;
  error?: string;
}> {
  try {
    // Check if migrations table exists
    // Type assertion needed because schema_migrations is not in generated types yet
    const { data: tableCheck, error: tableError } = await (supabase.from as any)('schema_migrations')
      .select('version')
      .limit(1);
    
    const migrationsTableExists = !tableError || tableError.code !== 'PGRST116';
    
    if (!migrationsTableExists) {
      return {
        healthy: false,
        migrationsTableExists: false,
        appliedMigrations: 0,
        error: 'Migrations table does not exist. Run initial migration first.'
      };
    }
    
    // Get count of applied migrations
    // Type assertion needed because schema_migrations is not in generated types yet
    const { count, error: countError } = await (supabase.from as any)('schema_migrations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      return {
        healthy: false,
        migrationsTableExists: true,
        appliedMigrations: 0,
        error: countError.message
      };
    }
    
    return {
      healthy: true,
      migrationsTableExists: true,
      appliedMigrations: count || 0
    };
  } catch (error) {
    return {
      healthy: false,
      migrationsTableExists: false,
      appliedMigrations: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get list of applied migrations
 */
export async function getAppliedMigrations(): Promise<string[]> {
  try {
    // Type assertion needed because schema_migrations is not in generated types yet
    const { data, error } = await (supabase.from as any)('schema_migrations')
      .select('version')
      .order('applied_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching applied migrations:', error);
      return [];
    }
    
    // Type assertion for data shape
    return ((data || []) as Array<{ version: string }>).map(m => m.version);
  } catch (error) {
    console.error('Error fetching applied migrations:', error);
    return [];
  }
}

/**
 * Note: This migration runner is primarily for checking status.
 * Actual migrations should be run via:
 * - Supabase CLI: `supabase db push` (for remote)
 * - Docker init scripts (for local)
 * 
 * This utility helps track and verify migration status from the app.
 */
export const migrationRunner = {
  checkDatabaseHealth,
  getAppliedMigrations,
  isMigrationApplied
};

