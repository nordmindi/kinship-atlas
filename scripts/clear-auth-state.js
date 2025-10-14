/**
 * Clear Authentication State Script
 * 
 * Run this in your browser console to clear all authentication state:
 * 
 * 1. Open your browser's Developer Tools (F12)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 
 * This will clear all authentication data and force a fresh login
 */

(function() {
  console.log('🧹 Clearing authentication state...');
  
  // Clear all Supabase-related localStorage data
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('auth') || 
      key.startsWith('sb-') ||
      key.includes('session')
    )) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️  Removed localStorage: ${key}`);
  });
  
  // Clear all Supabase-related sessionStorage data
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('supabase') || 
      key.includes('auth') || 
      key.startsWith('sb-') ||
      key.includes('session')
    )) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`🗑️  Removed sessionStorage: ${key}`);
  });
  
  // Clear any cookies that might contain auth data
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('✅ Authentication state cleared successfully!');
  console.log('🔄 Please refresh the page and log in again.');
  console.log('📝 You may need to create a new account or use the existing test account.');
})();
