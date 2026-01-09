#!/usr/bin/env node
/**
 * Script to verify and fix admin status for a user
 * Usage: node scripts/verify-admin-status.mjs <user-email>
 */

import { createClient } from '@supabase/supabase-js';

// SECURITY NOTE: Fallback key is Supabase LOCAL DEVELOPMENT key only
// It ONLY works with local Docker Compose instances, NOT production
// Always prefer environment variables for production use
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:60011';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAdminStatus(userEmail) {
  try {
    console.log(`🔍 Checking admin status for: ${userEmail}`);
    
    // Get user from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ User with email ${userEmail} not found`);
      console.log('Available users:');
      users.forEach(u => console.log(`  - ${u.email} (${u.id})`));
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }
    
    console.log(`📋 Current role: ${profile.role || 'NULL'}`);
    console.log(`📋 Display name: ${profile.display_name || 'NULL'}`);
    
    if (profile.role !== 'admin') {
      console.log(`⚠️  User is not an admin. Current role: ${profile.role || 'NULL'}`);
      console.log(`🔄 Updating role to admin...`);
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('❌ Error updating role:', updateError);
        return;
      }
      
      console.log(`✅ Successfully updated ${userEmail} to admin role!`);
    } else {
      console.log(`✅ User is already an admin`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: node scripts/verify-admin-status.mjs <user-email>');
  process.exit(1);
}

verifyAdminStatus(userEmail);

