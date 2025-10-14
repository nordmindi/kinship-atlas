
import React, { useEffect, useState } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import AddRelationForm from "@/components/family/AddRelationForm";
import { FamilyMember } from '@/types';
import { getFamilyMembers } from '@/services/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AddRelationPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { id, type } = useParams<{ id: string; type: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadMemberData = async () => {
      if (id) {
        try {
          setIsLoading(true);
          const members = await getFamilyMembers();
          const foundMember = members.find(m => m.id === id);
          setMember(foundMember || null);
        } catch (error) {
          console.error('Error loading family member:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadMemberData();
  }, [id]);
  
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
  
  const validRelationTypes = ['parent', 'child', 'spouse', 'sibling'];
  
  if (!id || !type || !validRelationTypes.includes(type)) {
    return <Navigate to="/family-tree" replace />;
  }
  
  const relationInfoMap = {
    parent: {
      title: "Add Parent",
      description: "Add a parent to build your family tree upward.",
      relationshipCreates: "parent-child"
    },
    child: {
      title: "Add Child",
      description: "Add children to extend your family tree downward.",
      relationshipCreates: "parent-child"
    },
    spouse: {
      title: "Add Spouse",
      description: "Add a spouse to create partnerships in your tree.",
      relationshipCreates: "partnership"
    },
    sibling: {
      title: "Add Sibling",
      description: "Add siblings who share the same parents.",
      relationshipCreates: "sibling"
    }
  };
  
  const relationInfo = relationInfoMap[type as keyof typeof relationInfoMap];
  
  return (
    <MobileLayout 
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || '' 
      }}
      showBackButton
      title={relationInfo.title}
    >
      <div className="p-4 space-y-4">
        <Card className="bg-heritage-purple-light/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-heritage-purple">{relationInfo.title}</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(`/family-member/${id}`)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </div>
            <CardDescription>{relationInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse text-heritage-purple">Loading member details...</div>
            ) : member ? (
              <p className="text-sm text-muted-foreground">
                Adding a {type} for <span className="font-medium text-heritage-purple">
                  {member.firstName} {member.lastName}
                </span>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Member not found.</p>
            )}
          </CardContent>
        </Card>
        
        <AddRelationForm 
          memberId={id} 
          relationType={type as 'parent' | 'child' | 'spouse' | 'sibling'}
          onSuccess={() => navigate(`/family-member/${id}`)}
        />
      </div>
    </MobileLayout>
  );
};

export default AddRelationPage;
