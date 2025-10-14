
import React, { useState, useEffect } from 'react';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import EditFamilyMember from '@/components/family/EditFamilyMember';
import { FamilyMember } from '@/types';
import { getFamilyMembers } from '@/services/supabaseService';

const EditFamilyMemberPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<FamilyMember | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadMemberData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const members = await getFamilyMembers();
        const foundMember = members.find(m => m.id === id);
        setMember(foundMember);
      } catch (error) {
        console.error('Error loading family member data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      loadMemberData();
    }
  }, [id, user]);
  
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
      title={id ? "Edit Family Member" : "Add Family Member"}
    >
      {isLoading && id ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="animate-pulse text-heritage-purple">Loading member data...</div>
        </div>
      ) : (
        <EditFamilyMember 
          member={member}
          onSuccess={() => navigate('/family-tree')}
        />
      )}
    </MobileLayout>
  );
};

export default EditFamilyMemberPage;
