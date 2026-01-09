/**
 * Family Groups Management Page
 * 
 * Page for managing family groups (create, edit, delete).
 * Note: Authentication is handled by ProtectedRoute in App.tsx.
 */

import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyGroupManager } from '@/components/family/FamilyGroupManager';
import { Users } from 'lucide-react';

const FamilyGroupsPage = () => {
  const { user } = useAuth();

  return (
    <MobileLayout
      currentUser={{
        name: user?.email?.split('@')[0] || 'User',
        email: user?.email || '',
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
