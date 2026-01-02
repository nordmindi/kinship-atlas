/**
 * Family Groups Management Page
 * 
 * Page for managing family groups (create, edit, delete)
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyGroupManager } from '@/components/family/FamilyGroupManager';
import { Users } from 'lucide-react';

const FamilyGroupsPage = () => {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MobileLayout
      currentUser={{
        name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
      }}
      title="Family Groups"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="p-4">
        <FamilyGroupManager />
      </div>
    </MobileLayout>
  );
};

export default FamilyGroupsPage;

