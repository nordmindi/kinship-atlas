import { supabase } from '@/integrations/supabase/client';
import { performDatabaseHealthCheck, getDatabaseStatistics, checkOrphanedData } from './databaseHealth';
import { checkDatabaseHealth } from './migrationRunner';

/**
 * Test Supabase connection and authentication
 */
export const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('family_members').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test authentication endpoint
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('ℹ️  No active session (this is normal if not logged in):', authError.message);
    } else {
      console.log('✅ Authentication endpoint accessible');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return false;
  }
};

/**
 * Test user authentication flow
 */
export const testUserAuth = async (email: string, password: string) => {
  console.log('🧪 Testing user authentication...');
  
  try {
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error);
      return false;
    }
    
    console.log('✅ Authentication successful:', data.user?.email);
    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return false;
  }
};

/**
 * Comprehensive database health test
 */
export const testDatabaseHealth = async () => {
  console.log('🏥 Running comprehensive database health check...');
  
  try {
    const health = await performDatabaseHealthCheck();
    
    console.log('📊 Database Health Results:');
    console.log('   Connection:', health.connection ? '✅' : '❌');
    console.log('   Overall Health:', health.healthy ? '✅' : '❌');
    console.log('   Migrations:', health.migrations.appliedCount, 'applied');
    console.log('   Tables:');
    Object.entries(health.tables).forEach(([table, exists]) => {
      console.log(`     ${table}:`, exists ? '✅' : '❌');
    });
    
    if (health.errors.length > 0) {
      console.log('   Errors:');
      health.errors.forEach(error => console.log(`     - ${error}`));
    }
    
    // Get statistics
    const stats = await getDatabaseStatistics();
    console.log('📈 Database Statistics:');
    console.log('   Family Members:', stats.familyMembers);
    console.log('   Relations:', stats.relations);
    console.log('   Locations:', stats.locations);
    console.log('   Stories:', stats.stories);
    console.log('   Events:', stats.events);
    console.log('   Applied Migrations:', stats.appliedMigrations);
    
    // Check for orphaned data
    const orphaned = await checkOrphanedData();
    if (orphaned.hasIssues) {
      console.log('⚠️  Orphaned Data Detected:');
      console.log('   Orphaned Relations:', orphaned.orphanedRelations);
      console.log('   Orphaned Locations:', orphaned.orphanedLocations);
    } else {
      console.log('✅ No orphaned data detected');
    }
    
    return health.healthy;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
};
