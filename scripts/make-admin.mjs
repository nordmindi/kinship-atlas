#!/usr/bin/env node

/**
 * Script to make a user an admin
 * Usage: node scripts/make-admin.mjs <user-email>
 */

import { createClient } from '@supabase/supabase-js';

// SECURITY NOTE: These are Supabase LOCAL DEVELOPMENT keys only
// They are well-known demo keys that ONLY work with local Docker Compose instances
// They CANNOT be used to access production or remote Supabase projects
// For production, use environment variables with real keys from Supabase dashboard
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeUserAdmin(userEmail) {
  try {
    console.log(`🔍 Looking for user with email: ${userEmail}`);
    
    // Find the user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ User with email ${userEmail} not found`);
      console.log('Available users:');
      users.users.forEach(u => console.log(`  - ${u.email}`));
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Update user profile to admin
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error updating user profile:', updateError);
      return;
    }
    
    console.log(`🎉 Successfully made ${userEmail} an admin!`);
    console.log('The user can now access the admin dashboard at /admin');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node scripts/make-admin.mjs <user-email>');
  console.log('Example: node scripts/make-admin.mjs admin@example.com');
  process.exit(1);
}

makeUserAdmin(userEmail);
