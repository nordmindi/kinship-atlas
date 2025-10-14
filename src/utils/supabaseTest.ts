import { supabase } from '@/integrations/supabase/client';

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
