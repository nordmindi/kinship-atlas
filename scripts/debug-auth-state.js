/**
 * Debug Authentication State Script
 * 
 * Run this in your browser console to examine the current authentication state:
 * 
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 
 * This will show you the current authentication state and help identify the issue
 */

(function() {
  console.log('🔍 DEBUGGING AUTHENTICATION STATE');
  console.log('=====================================');
  
  // Check localStorage for auth data
  console.log('\n📦 LOCAL STORAGE:');
  const localStorageKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('auth') || 
      key.startsWith('sb-') ||
      key.includes('session')
    )) {
      localStorageKeys.push(key);
      console.log(`   ${key}:`, localStorage.getItem(key));
    }
  }
  
  if (localStorageKeys.length === 0) {
    console.log('   ❌ No authentication data found in localStorage');
  }
  
  // Check sessionStorage for auth data
  console.log('\n📦 SESSION STORAGE:');
  const sessionStorageKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('auth') || 
      key.startsWith('sb-') ||
      key.includes('session')
    )) {
      sessionStorageKeys.push(key);
      console.log(`   ${key}:`, sessionStorage.getItem(key));
    }
  }
  
  if (sessionStorageKeys.length === 0) {
    console.log('   ❌ No authentication data found in sessionStorage');
  }
  
  // Check cookies
  console.log('\n🍪 COOKIES:');
  const cookies = document.cookie.split(';');
  const authCookies = cookies.filter(cookie => 
    cookie.includes('supabase') || 
    cookie.includes('auth') || 
    cookie.includes('sb-')
  );
  
  if (authCookies.length === 0) {
    console.log('   ❌ No authentication cookies found');
  } else {
    authCookies.forEach(cookie => console.log(`   ${cookie.trim()}`));
  }
  
  // Test Supabase client if available
  console.log('\n🧪 SUPABASE CLIENT TEST:');
  if (window.supabase) {
    console.log('   ✅ Supabase client found');
    window.supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.log('   ❌ getUser() error:', error);
      } else if (data.user) {
        console.log('   ✅ User authenticated:', data.user.email);
      } else {
        console.log('   ❌ No user found');
      }
    });
  } else {
    console.log('   ❌ Supabase client not found in window object');
  }
  
  console.log('\n📋 SUMMARY:');
  console.log(`   localStorage keys: ${localStorageKeys.length}`);
  console.log(`   sessionStorage keys: ${sessionStorageKeys.length}`);
  console.log(`   auth cookies: ${authCookies.length}`);
  
  console.log('\n💡 NEXT STEPS:');
  if (localStorageKeys.length === 0 && sessionStorageKeys.length === 0) {
    console.log('   1. You need to sign in first');
    console.log('   2. Go to /auth-test page to sign in');
    console.log('   3. Or use the test account: test@example.com / password123');
  } else {
    console.log('   1. Authentication data exists but may be invalid');
    console.log('   2. Try signing out and signing in again');
    console.log('   3. Clear auth state and refresh the page');
  }
})();
