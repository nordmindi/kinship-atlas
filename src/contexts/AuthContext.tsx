
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { getUserProfile } from '@/services/userService';
import { isAdmin, isEditor, isViewer, canWrite, canDelete, canManageUsers } from '@/lib/permissions';
import { performCompleteLogout } from '@/utils/authUtils';

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  role: UserRole | null;
  canWrite: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to load user profile
  // If profile cannot be found, logout the user
  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      
      // Check if user still has an active session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // If profile is null and user still has an active session, logout
      if (!profile && currentSession?.user?.id === userId) {
        console.warn('User profile not found - logging out user');
        setUserProfile(null);
        // Perform complete logout to clear all auth state
        await performCompleteLogout();
        // Redirect to auth page
        window.location.href = '/auth';
        return;
      }
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
      
      // Check if user still has an active session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // If there's an error and user still has an active session, logout
      if (currentSession?.user?.id === userId) {
        console.warn('Error fetching user profile - logging out user');
        await performCompleteLogout();
        window.location.href = '/auth';
      }
    }
  };

  // Function to refresh user profile
  // If profile cannot be found, will logout the user via loadUserProfile
  const refreshUserProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    } else {
      // If no user, clear profile
      setUserProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    // Initialize auth state from current session
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Auto-login for development only (disabled in production)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && import.meta.env.DEV) {
          // Only attempt auto-login in development mode
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: 'test@kinship-atlas.com',
              password: 'testpassword123'
            });
            if (error) {
              // Silently fail in development - user can manually log in
              if (error.message.includes('Invalid login credentials')) {
                // Try to create the test user if it doesn't exist
                await supabase.auth.signUp({
                  email: 'test@kinship-atlas.com',
                  password: 'testpassword123'
                });
                // Retry login after user creation
                await supabase.auth.signInWithPassword({
                  email: 'test@kinship-atlas.com',
                  password: 'testpassword123'
                });
              }
            }
          } catch (err) {
            // Silently handle errors in development
          }
        }
        
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        // Load user profile if user exists
        if (data.session?.user?.id) {
          await loadUserProfile(data.session.user.id);
        }
        
        if (!isMounted) return;
        
        // Set up auth state listener
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            // Don't process auth state changes if component is unmounted
            if (!isMounted) return;
            
            setSession(newSession);
            setUser(newSession?.user || null);
            
            // Handle session expiration
            if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
              if (event === 'SIGNED_OUT') {
                setUserProfile(null);
              }
              // For TOKEN_REFRESHED, we don't need to reload the profile
              // unless the user ID changed, which shouldn't happen
              // Skip reloading profile on token refresh to prevent unnecessary loading
              if (event === 'TOKEN_REFRESHED') {
                return;
              }
            }
            
            // Load user profile for new session (but not on token refresh)
            if (newSession?.user?.id) {
              await loadUserProfile(newSession.user.id);
            } else {
              setUserProfile(null);
            }
          }
        );
        
        subscription = authSubscription;
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // Always set loading to false, even if there was an error
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    // Clean up subscription on unmount
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignIn timeout after 10 seconds')), 10000)
      );
      
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as { data: { user: { id: string } } | null; error: Error | null };
      return { error };
    } catch (err) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role = userProfile?.role ?? null;
  
  const value = {
    user,
    userProfile,
    session,
    isLoading,
    isAdmin: isAdmin(role),
    isEditor: isEditor(role),
    isViewer: isViewer(role),
    role,
    canWrite: canWrite(role),
    canDelete: canDelete(role),
    canManageUsers: canManageUsers(role),
    signIn,
    signUp,
    signOut,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
