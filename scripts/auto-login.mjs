/**
 * Script to automatically log in the test user
 * This provides the authentication session needed for the application
 */

import { createClient } from '@supabase/supabase-js';

// Use hardcoded local development values
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function autoLogin() {
  try {
    console.log('🔐 Attempting auto-login...');
    
    // Test user credentials
    const testEmail = 'test@kinship-atlas.com';
    const testPassword = 'testpassword123';
    
    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.error('❌ Login error:', error);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('👤 User ID:', data.user.id);
    console.log('📧 Email:', data.user.email);
    console.log('🔑 Session:', data.session?.access_token?.substring(0, 20) + '...');
    
    // Test the session by getting user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('🧪 Session test:', userData.user ? 'SUCCESS' : 'FAILED');
    
    if (userData.user) {
      console.log('🎉 Authentication is working! You can now create family members.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

autoLogin();
