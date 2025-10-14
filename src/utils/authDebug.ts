// Comprehensive authentication debugging utility
import { supabase } from '@/integrations/supabase/client';

export const debugAuthState = async () => {
  console.log('🔍 === COMPREHENSIVE AUTH DEBUG ===');
  
  // 1. Check Supabase client configuration
  console.log('1️⃣ Supabase Client Config:');
  console.log('   URL:', supabase.supabaseUrl);
  console.log('   Anon Key:', supabase.supabaseKey?.substring(0, 20) + '...');
  
  // 2. Check current session
  console.log('2️⃣ Current Session:');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  console.log('   Session Data:', sessionData);
  console.log('   Session Error:', sessionError);
  
  // 3. Check current user
  console.log('3️⃣ Current User:');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log('   User Data:', userData);
  console.log('   User Error:', userError);
  
  // 4. Check auth state changes
  console.log('4️⃣ Auth State Listener:');
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('   Auth State Change:', event, session?.user?.id);
  });
  
  // 5. Test database connection
  console.log('5️⃣ Database Connection Test:');
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('count')
      .limit(1);
    console.log('   DB Test Result:', { data, error });
  } catch (err) {
    console.log('   DB Test Error:', err);
  }
  
  // 6. Check localStorage for auth tokens
  console.log('6️⃣ Local Storage Auth Data:');
  const authKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));
  authKeys.forEach(key => {
    console.log(`   ${key}:`, localStorage.getItem(key)?.substring(0, 50) + '...');
  });
  
  console.log('🔍 === END AUTH DEBUG ===');
};

// Export for use in browser console
(window as any).debugAuthState = debugAuthState;
