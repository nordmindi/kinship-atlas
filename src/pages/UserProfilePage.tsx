import React from 'react';
import { Navigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import UserProfile from '@/components/auth/UserProfile';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Settings, Shield, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserProfilePage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleBack = () => {
    navigate(-1);
  };

  const handleAccountSettings = () => {
    // TODO: Implement account settings functionality
    console.log('Account settings clicked');
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">User Profile</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your account settings and preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto p-4">
          <UserProfile 
            variant="page" 
            onProfileClick={handleAccountSettings}
          />
          
          {/* Additional Profile Sections */}
          <div className="mt-6 space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Account Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Account Type</p>
                  <p className="mt-1">Personal Account</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Status</p>
                  <p className="mt-1 text-green-600">Active</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Provider</p>
                  <p className="mt-1 capitalize">
                    {user.app_metadata?.provider || 'Email'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Role</p>
                  <p className="mt-1 capitalize">
                    {user.role || 'User'}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Security</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Email Verification</p>
                  <p className="mt-1">
                    {user.email_confirmed_at ? (
                      <span className="text-green-600">Verified</span>
                    ) : (
                      <span className="text-yellow-600">Pending</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Phone Verification</p>
                  <p className="mt-1">
                    {user.phone_confirmed_at ? (
                      <span className="text-green-600">Verified</span>
                    ) : (
                      <span className="text-gray-500">Not Set</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Two-Factor Auth</p>
                  <p className="mt-1 text-gray-500">Not Enabled</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Last Password Change</p>
                  <p className="mt-1 text-gray-500">Unknown</p>
                </div>
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Data & Privacy</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export Your Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download a copy of your family tree data
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default UserProfilePage;
