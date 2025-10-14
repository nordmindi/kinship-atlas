/**
 * Script to create a test user and log them in
 * This fixes the root cause: no authenticated user
 */

import { createClient } from '@supabase/supabase-js';

// Use hardcoded local development values
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  try {
    console.log('🚀 Creating test user...');
    
    // Test user credentials
    const testEmail = 'test@kinship-atlas.com';
    const testPassword = 'testpassword123';
    
    // Create user using admin client
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (authError) {
      console.error('❌ Error creating user:', authError);
      return;
    }
    
    console.log('✅ User created successfully:', authData.user.id);
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        role: 'admin',
        display_name: 'Test User'
      });
    
    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
    } else {
      console.log('✅ User profile created successfully');
    }
    
    console.log('🎉 Test user setup complete!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('🆔 User ID:', authData.user.id);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();
