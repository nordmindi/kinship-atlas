import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { testSupabaseConnection, testUserAuth } from '@/utils/supabaseTest';

const AuthTestPage = () => {
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  useEffect(() => {
    checkAuthStatus();
    testConnection();
  }, [user]);

  const testConnection = async () => {
    setConnectionStatus('Testing connection...');
    const isConnected = await testSupabaseConnection();
    setConnectionStatus(isConnected ? '✅ Connection successful' : '❌ Connection failed');
  };

  const checkAuthStatus = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        setAuthStatus(`❌ Auth Error: ${error.message}`);
      } else if (currentUser) {
        setAuthStatus(`✅ Authenticated as: ${currentUser.email} (${currentUser.id})`);
      } else {
        setAuthStatus('❌ Not authenticated');
      }
    } catch (error) {
      setAuthStatus(`❌ Error checking auth: ${error}`);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Signed in successfully",
          description: `Welcome ${data.user?.email}`,
        });
        await checkAuthStatus();
      }
    } catch (error) {
      toast({
        title: "Sign in error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Account created",
          description: `Please check your email to confirm your account`,
        });
        await checkAuthStatus();
      }
    } catch (error) {
      toast({
        title: "Sign up error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      await checkAuthStatus();
    } catch (error) {
      toast({
        title: "Sign out error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const clearAuthState = () => {
    // Clear all auth-related localStorage
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
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    toast({
      title: "Auth state cleared",
      description: "Please refresh the page",
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>
            Test and fix authentication issues after database reset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Connection:</strong> {connectionStatus || 'Testing connection...'}
            </AlertDescription>
          </Alert>
          
          <Alert>
            <AlertDescription>
              <strong>Authentication:</strong> {authStatus || 'Checking authentication status...'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSignIn} 
              disabled={isSigningIn}
              className="flex-1"
            >
              {isSigningIn ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button 
              onClick={handleSignUp} 
              disabled={isSigningIn}
              variant="outline"
              className="flex-1"
            >
              {isSigningIn ? 'Signing up...' : 'Sign Up'}
            </Button>
          </div>

          {user && (
            <Button 
              onClick={handleSignOut} 
              variant="destructive"
              className="w-full"
            >
              Sign Out
            </Button>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={testConnection} 
              variant="outline"
              className="flex-1"
            >
              Test Connection
            </Button>
            <Button 
              onClick={clearAuthState} 
              variant="outline"
              className="flex-1"
            >
              Clear Auth State & Refresh
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Test Account:</strong></p>
            <p>Email: test@example.com</p>
            <p>Password: password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthTestPage;
