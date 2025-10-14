import { supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive logout utility that clears all authentication state
 */
export const performCompleteLogout = async () => {
  try {
    // 1. Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('Supabase sign out error:', signOutError);
    }

    // 2. Clear all localStorage items related to Supabase
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('sb-') || 
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('kinship-atlas')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // 3. Clear all sessionStorage items related to Supabase
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('sb-') || 
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('kinship-atlas')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });

    // 4. Clear any cookies (if any)
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      if (name.includes('supabase') || name.includes('auth')) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    });

    console.log('✅ Complete logout performed successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Logout error:', error);
    return { success: false, error };
  }
};

/**
 * Check if user has a valid session
 */
export const hasValidSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return !error && !!session && !!session.user;
  } catch (error) {
    console.error('Session check error:', error);
    return false;
  }
};

/**
 * Get current user info safely
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get user error:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

/**
 * Debug authentication state
 */
export const debugAuthState = () => {
  console.log('🔍 Authentication State Debug:');
  console.log('================================');
  
  // Check localStorage
  console.log('📦 LocalStorage items:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('auth'))) {
      console.log(`  ${key}:`, localStorage.getItem(key));
    }
  }
  
  // Check sessionStorage
  console.log('📦 SessionStorage items:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('auth'))) {
      console.log(`  ${key}:`, sessionStorage.getItem(key));
    }
  }
  
  // Check cookies
  console.log('🍪 Cookies:');
  document.cookie.split(";").forEach((c) => {
    if (c.includes('supabase') || c.includes('auth')) {
      console.log(`  ${c.trim()}`);
    }
  });
  
  console.log('================================');
};
