import React, { useState } from 'react';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { performCompleteLogout, debugAuthState, hasValidSession, getCurrentUser } from '@/utils/authUtils';
import { toast } from '@/hooks/use-toast';
import { LogOut, Bug, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const LogoutTestPage = () => {
  const { user, session, isLoading } = useAuth();
  const [testResults, setTestResults] = useState<{
    hasValidSession: boolean | null;
    currentUser: unknown;
    debugInfo: string;
  }>({
    hasValidSession: null,
    currentUser: null,
    debugInfo: ''
  });

  const runTests = async () => {
    setTestResults({
      hasValidSession: null,
      currentUser: null,
      debugInfo: ''
    });

    try {
      // Test 1: Check valid session
      const validSession = await hasValidSession();
      
      // Test 2: Get current user
      const currentUser = await getCurrentUser();
      
      // Test 3: Debug auth state
      const debugInfo = captureDebugInfo();
      
      setTestResults({
        hasValidSession: validSession,
        currentUser,
        debugInfo
      });

      toast({
        title: "Tests completed",
        description: "Authentication tests have been run successfully.",
      });
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test failed",
        description: "There was an error running the tests.",
        variant: "destructive"
      });
    }
  };

  const captureDebugInfo = () => {
    const info: string[] = [];
    
    // Check localStorage
    info.push('LocalStorage:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        info.push(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
      }
    }
    
    // Check sessionStorage
    info.push('\nSessionStorage:');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        info.push(`  ${key}: ${sessionStorage.getItem(key)?.substring(0, 50)}...`);
      }
    }
    
    return info.join('\n');
  };

  const handleDebugAuth = () => {
    debugAuthState();
    toast({
      title: "Debug info logged",
      description: "Check the browser console for detailed authentication state.",
    });
  };

  const handleCompleteLogout = async () => {
    try {
      const result = await performCompleteLogout();
      if (result.success) {
        toast({
          title: "Logout successful",
          description: "All authentication state has been cleared.",
        });
        // Refresh the page
        window.location.href = '/auth';
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error during logout.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title="Logout Test">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Logout Test">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Current Auth State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Current Authentication State
            </CardTitle>
            <CardDescription>
              Shows the current user and session information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Authenticated</Badge>
                  <Badge variant="secondary">{user.email}</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>User ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                  {session && (
                    <p><strong>Session Expires:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-500">Not authenticated</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Authentication Tests
            </CardTitle>
            <CardDescription>
              Run tests to verify authentication state and logout functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runTests} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Tests
              </Button>
              <Button onClick={handleDebugAuth} variant="outline">
                <Bug className="h-4 w-4 mr-2" />
                Debug Console
              </Button>
            </div>
            
            {testResults.hasValidSession !== null && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Valid Session:</span>
                  {testResults.hasValidSession ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="destructive">No</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-medium">Current User:</span>
                  {testResults.currentUser ? (
                    <Badge variant="default">
                      {(testResults.currentUser as { email?: string })?.email || 'Unknown'}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">None</Badge>
                  )}
                </div>
                
                {testResults.debugInfo && (
                  <div>
                    <p className="font-medium mb-2">Debug Info:</p>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                      {testResults.debugInfo}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Logout Actions
            </CardTitle>
            <CardDescription>
              Test different logout methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCompleteLogout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Complete Logout (Clear All State)
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p><strong>Complete Logout</strong> will:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Sign out from Supabase</li>
                <li>Clear all localStorage items</li>
                <li>Clear all sessionStorage items</li>
                <li>Clear any authentication cookies</li>
                <li>Redirect to login page</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default LogoutTestPage;
