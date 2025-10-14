
import React from 'react';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import AddFamilyMember from '@/components/family/AddFamilyMember';

const AddFamilyMemberPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-heritage-purple">Loading...</div>
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
        email: user.email || ''
      }}
      showBackButton
      title="Add Family Member"
    >
      <AddFamilyMember />
    </MobileLayout>
  );
};

export default AddFamilyMemberPage;
