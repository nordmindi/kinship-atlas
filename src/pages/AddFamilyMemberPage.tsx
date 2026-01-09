import React from 'react';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import AddFamilyMember from '@/components/family/AddFamilyMember';

/**
 * Add Family Member page.
 * 
 * Note: Authentication and authorization (admin/editor only) are handled
 * by ProtectedRoute in App.tsx. This component can assume the user is
 * authenticated and authorized.
 */
const AddFamilyMemberPage = () => {
  const { user } = useAuth();

  return (
    <MobileLayout 
      currentUser={{ 
        name: user?.email?.split('@')[0] || 'User', 
        email: user?.email || ''
      }}
      showBackButton
      title="Add Family Member"
    >
      <AddFamilyMember />
    </MobileLayout>
  );
};

export default AddFamilyMemberPage;
