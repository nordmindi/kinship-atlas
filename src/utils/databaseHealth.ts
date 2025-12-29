import { supabase } from '@/integrations/supabase/client';
import { checkDatabaseHealth, getAppliedMigrations } from './migrationRunner';

/**
 * Database health check result
 */
export interface DatabaseHealthResult {
  healthy: boolean;
  connection: boolean;
  migrations: {
    tableExists: boolean;
    appliedCount: number;
    status: 'ok' | 'missing_table' | 'error';
  };
  tables: {
    family_members: boolean;
    relations: boolean;
    locations: boolean;
    user_profiles: boolean;
    schema_migrations: boolean;
  };
  errors: string[];
}

/**
 * Perform comprehensive database health check
 */
export async function performDatabaseHealthCheck(): Promise<DatabaseHealthResult> {
  const result: DatabaseHealthResult = {
    healthy: true,
    connection: false,
    migrations: {
      tableExists: false,
      appliedCount: 0,
      status: 'ok'
    },
    tables: {
      family_members: false,
      relations: false,
      locations: false,
      user_profiles: false,
      schema_migrations: false
    },
    errors: []
  };

  try {
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('family_members')
      .select('count')
      .limit(0);

    if (connectionError) {
      result.errors.push(`Connection error: ${connectionError.message}`);
      result.healthy = false;
    } else {
      result.connection = true;
    }
  } catch (error) {
    result.errors.push(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    result.healthy = false;
  }

  // Check migration status
  try {
    const migrationHealth = await checkDatabaseHealth();
    result.migrations.tableExists = migrationHealth.migrationsTableExists;
    result.migrations.appliedCount = migrationHealth.appliedMigrations;
    
    if (!migrationHealth.healthy) {
      result.migrations.status = migrationHealth.migrationsTableExists ? 'error' : 'missing_table';
      if (migrationHealth.error) {
        result.errors.push(`Migration check: ${migrationHealth.error}`);
      }
    }
  } catch (error) {
    result.migrations.status = 'error';
    result.errors.push(`Migration check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check if required tables exist
  const tablesToCheck = [
    'family_members',
    'relations',
    'locations',
    'user_profiles',
    'schema_migrations'
  ] as const;

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          result.tables[table] = false;
          result.errors.push(`Table ${table} does not exist`);
          result.healthy = false;
        } else {
          // Table exists but might have permission issues
          result.tables[table] = true;
        }
      } else {
        result.tables[table] = true;
      }
    } catch (error) {
      result.tables[table] = false;
      result.errors.push(`Error checking table ${table}: ${error instanceof Error ? error.message : String(error)}`);
      result.healthy = false;
    }
  }

  return result;
}

/**
 * Get database statistics
 */
export async function getDatabaseStatistics(): Promise<{
  familyMembers: number;
  relations: number;
  locations: number;
  stories: number;
  events: number;
  appliedMigrations: number;
}> {
  const stats = {
    familyMembers: 0,
    relations: 0,
    locations: 0,
    stories: 0,
    events: 0,
    appliedMigrations: 0
  };

  try {
    // Get counts for each table
    const [members, relations, locations, stories, events, migrations] = await Promise.all([
      supabase.from('family_members').select('*', { count: 'exact', head: true }),
      supabase.from('relations').select('*', { count: 'exact', head: true }),
      supabase.from('locations').select('*', { count: 'exact', head: true }),
      supabase.from('family_stories').select('*', { count: 'exact', head: true }),
      supabase.from('family_events').select('*', { count: 'exact', head: true }),
      getAppliedMigrations()
    ]);

    stats.familyMembers = members.count || 0;
    stats.relations = relations.count || 0;
    stats.locations = locations.count || 0;
    stats.stories = stories.count || 0;
    stats.events = events.count || 0;
    stats.appliedMigrations = migrations.length;
  } catch (error) {
    console.error('Error fetching database statistics:', error);
  }

  return stats;
}

/**
 * Check for orphaned data
 */
export async function checkOrphanedData(): Promise<{
  orphanedRelations: number;
  orphanedLocations: number;
  hasIssues: boolean;
}> {
  const result = {
    orphanedRelations: 0,
    orphanedLocations: 0,
    hasIssues: false
  };

  try {
    // Check for orphaned relations
    const { data: orphanedRelationsData } = await supabase.rpc('cleanup_orphaned_relations');
    if (orphanedRelationsData && orphanedRelationsData.length > 0) {
      result.orphanedRelations = orphanedRelationsData[0]?.orphaned_count || 0;
    }

    // Check for orphaned locations
    const { data: orphanedLocationsData } = await supabase.rpc('cleanup_orphaned_locations');
    if (orphanedLocationsData && orphanedLocationsData.length > 0) {
      result.orphanedLocations = orphanedLocationsData[0]?.orphaned_count || 0;
    }

    result.hasIssues = result.orphanedRelations > 0 || result.orphanedLocations > 0;
  } catch (error) {
    console.error('Error checking orphaned data:', error);
    // Functions might not exist yet, which is okay
  }

  return result;
}

