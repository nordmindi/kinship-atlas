import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import AddFamilyMemberForm from '@/components/family/AddFamilyMemberForm';
import { FamilyMember } from '@/types';

/**
 * Add Family Member page.
 * 
 * Note: Authentication and authorization (admin/editor only) are handled
 * by ProtectedRoute in App.tsx. This component can assume the user is
 * authenticated and authorized.
 */
const AddFamilyMemberPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = (member: FamilyMember) => {
    // Navigate back to home after successful creation
    navigate('/');
  };

  return (
    <MobileLayout 
      currentUser={{ 
        name: user?.email?.split('@')[0] || 'User', 
        email: user?.email || ''
      }}
      showBackButton
      title="Add Family Member"
    >
      <AddFamilyMemberForm 
        onSuccess={handleSuccess}
        onCancel={() => navigate('/')}
      />
    </MobileLayout>
  );
};

export default AddFamilyMemberPage;
