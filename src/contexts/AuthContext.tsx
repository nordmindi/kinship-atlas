import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
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
  error: Error | null;
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
  refreshSession: () => Promise<{ error: Error | null }>;
  /** Whether the session is about to expire (within 5 minutes) */
  isSessionExpiringSoon: boolean;
};

/** Session expiry warning threshold in milliseconds (5 minutes) */
const SESSION_EXPIRY_WARNING_MS = 5 * 60 * 1000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSessionExpiringSoon, setIsSessionExpiringSoon] = useState(false);
  
  // Ref to track if we're already refreshing the session
  const isRefreshingSession = useRef(false);
  
  // Session expiry check interval
  const sessionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Function to check if session is about to expire
  const checkSessionExpiry = useCallback(() => {
    if (!session?.expires_at) {
      setIsSessionExpiringSoon(false);
      return;
    }
    
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    setIsSessionExpiringSoon(timeUntilExpiry > 0 && timeUntilExpiry < SESSION_EXPIRY_WARNING_MS);
  }, [session?.expires_at]);

  // Function to load user profile
  // If profile cannot be found, logout the user
  const loadUserProfile = useCallback(async (userId: string) => {
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
    } catch (err) {
      console.error('Error loading user profile:', err);
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
  }, []);

  // Function to refresh user profile
  // If profile cannot be found, will logout the user via loadUserProfile
  const refreshUserProfile = useCallback(async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    } else {
      // If no user, clear profile
      setUserProfile(null);
    }
  }, [user?.id, loadUserProfile]);

  // Function to manually refresh the session
  const refreshSession = useCallback(async (): Promise<{ error: Error | null }> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingSession.current) {
      return { error: null };
    }

    isRefreshingSession.current = true;

    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        // If refresh fails due to invalid session, sign out
        if (
          refreshError.message?.includes('Invalid Refresh Token') ||
          refreshError.message?.includes('Refresh Token Not Found') ||
          (refreshError as AuthError).status === 401
        ) {
          console.warn('Session refresh failed - signing out user');
          await performCompleteLogout();
          setUser(null);
          setSession(null);
          setUserProfile(null);
          window.location.href = '/auth';
        }
        return { error: refreshError };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setIsSessionExpiringSoon(false);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    } finally {
      isRefreshingSession.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    // Initialize auth state from current session
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create a timeout promise to prevent hanging indefinitely
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection to authentication server timed out')), 15000)
        );

        // Main session retrieval with timeout
        const sessionPromise = supabase.auth.getSession();
        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null } };

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
        if (isMounted) {
          setError(error instanceof Error ? error : new Error('Unknown authentication error'));
          // Ensure we're not stuck in loading state
          setIsLoading(false);
        }
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
  }, [loadUserProfile]);

  // Set up session expiry check interval
  useEffect(() => {
    // Check immediately
    checkSessionExpiry();

    // Check every minute
    sessionCheckIntervalRef.current = setInterval(checkSessionExpiry, 60 * 1000);

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [checkSessionExpiry]);

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
      return { error: err as Error };
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
    error,
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
    refreshSession,
    isSessionExpiringSoon,
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
