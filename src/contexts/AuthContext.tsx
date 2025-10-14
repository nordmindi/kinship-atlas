
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types';
import { getUserProfile } from '@/services/userService';

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
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
  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    }
  };

  // Function to refresh user profile
  const refreshUserProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Initialize auth state from current session
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Auto-login for development if no user is found
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('🔐 No session found, attempting auto-login for development');
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@kinship-atlas.com',
            password: 'testpassword123'
          });
          if (error) {
            console.log('⚠️ Auto-login failed:', error.message);
            // Try to create the test user if it doesn't exist
            if (error.message.includes('Invalid login credentials')) {
              console.log('🔄 Creating test user...');
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: 'test@kinship-atlas.com',
                password: 'testpassword123'
              });
              if (signUpError) {
                console.log('⚠️ Test user creation failed:', signUpError.message);
              } else {
                console.log('✅ Test user created, retrying auto-login...');
                // Retry login after user creation
                const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                  email: 'test@kinship-atlas.com',
                  password: 'testpassword123'
                });
                if (retryError) {
                  console.log('⚠️ Retry auto-login failed:', retryError.message);
                } else {
                  console.log('✅ Auto-login successful after user creation');
                }
              }
            }
          } else {
            console.log('✅ Auto-login successful for development');
          }
        } catch (err) {
          console.log('⚠️ Auto-login error:', err);
        }
      }
      
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
      
      // Load user profile if user exists
      if (data.session?.user?.id) {
        await loadUserProfile(data.session.user.id);
      }
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('🔐 Auth state change:', event, newSession?.user?.id);
          
          setSession(newSession);
          setUser(newSession?.user || null);
          
          // Handle session expiration
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            console.log('🔐 Session event:', event);
            if (event === 'SIGNED_OUT') {
              setUserProfile(null);
            }
          }
          
          // Load user profile for new session
          if (newSession?.user?.id) {
            await loadUserProfile(newSession.user.id);
          } else {
            setUserProfile(null);
          }
        }
      );
      
      setIsLoading(false);
      
      // Clean up subscription
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 SignIn called with:', { email, password: '***' });
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
      console.log('🔐 SignIn result:', { data: data?.user?.id, error });
      return { error };
    } catch (err) {
      console.error('🔐 SignIn error:', err);
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

  const value = {
    user,
    userProfile,
    session,
    isLoading,
    isAdmin: userProfile?.role === 'admin',
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
