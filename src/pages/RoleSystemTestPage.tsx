import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, getAllUsers, updateUserRole } from '@/services/userService';
import { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, User, CheckCircle, XCircle } from 'lucide-react';

const RoleSystemTestPage: React.FC = () => {
  const { user, userProfile, isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const runTests = React.useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    const results: Record<string, any> = {};

    try {
      // Test 1: Get user profile
      console.log('🧪 Test 1: Getting user profile...');
      const profile = await getUserProfile(user.id);
      results.getUserProfile = {
        success: !!profile,
        data: profile,
        error: null
      };
      console.log('✅ User profile loaded:', profile);

      // Test 2: Check if user is admin
      results.isAdmin = {
        success: true,
        data: isAdmin,
        error: null
      };
      console.log('✅ Admin status:', isAdmin);

      // Test 3: Get all users (admin only)
      if (isAdmin) {
        console.log('🧪 Test 3: Getting all users (admin only)...');
        const users = await getAllUsers();
        results.getAllUsers = {
          success: true,
          data: users,
          error: null
        };
        setAllUsers(users);
        console.log('✅ All users loaded:', users);
      } else {
        results.getAllUsers = {
          success: false,
          data: null,
          error: 'User is not admin'
        };
        console.log('❌ Cannot get all users - not admin');
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      results.error = error;
    }

    setTestResults(results);
    setIsLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    runTests();
  }, [runTests]);

  const handleRoleUpdate = async (userId: string, newRole: 'admin' | 'family_member') => {
    if (!isAdmin) return;
    
    try {
      const success = await updateUserRole(userId, newRole);
      if (success) {
        console.log(`✅ Role updated to ${newRole}`);
        runTests(); // Refresh data
      } else {
        console.error('❌ Failed to update role');
      }
    } catch (error) {
      console.error('❌ Error updating role:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Role System Test</h1>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>ID:</strong> {user?.id}</p>
            <p><strong>Role:</strong> 
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="ml-2">
                {isAdmin ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Family Member
                  </>
                )}
              </Badge>
            </p>
            <p><strong>Profile Data:</strong> {userProfile ? 'Loaded' : 'Not loaded'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Testing role system functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {testResults.getUserProfile?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Get User Profile: {testResults.getUserProfile?.success ? 'Success' : 'Failed'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {testResults.isAdmin?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Admin Status Check: {testResults.isAdmin?.success ? 'Success' : 'Failed'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {testResults.getAllUsers?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Get All Users: {testResults.getAllUsers?.success ? 'Success' : testResults.getAllUsers?.error || 'Failed'}</span>
            </div>
          </div>
          
          <Button onClick={runTests} disabled={isLoading} className="mt-4">
            {isLoading ? 'Running Tests...' : 'Run Tests Again'}
          </Button>
        </CardContent>
      </Card>

      {/* All Users (Admin Only) */}
      {isAdmin && allUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Admin view of all users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{user.display_name}</p>
                    <p className="text-sm text-muted-foreground">{user.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleUpdate(user.id, 'admin')}
                        disabled={user.role === 'admin'}
                      >
                        Make Admin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleUpdate(user.id, 'family_member')}
                        disabled={user.role === 'family_member'}
                      >
                        Make Family Member
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoleSystemTestPage;
