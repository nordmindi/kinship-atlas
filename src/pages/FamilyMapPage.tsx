
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getFamilyMembers } from '@/services/supabaseService';
import { FamilyMember } from '@/types';
import FamilyMap from '@/components/family/FamilyMap';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Map } from 'lucide-react';

const FamilyMapPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch family members data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Load family members
        const members = await getFamilyMembers();
        
        // Check if we have any members with location data
        const membersWithLocation = members.filter(
          m => m.currentLocation && 
          typeof m.currentLocation.lat === 'number' && 
          typeof m.currentLocation.lng === 'number'
        );
        
        if (membersWithLocation.length === 0) {
          // We still set the members, but we'll show a message in the UI
          toast({
            title: "No Location Data",
            description: "None of your family members have location data. Add locations to see them on the map.",
            variant: "default"
          });
        }
        
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error loading family members:', error);
        setError('Could not load family members. Please try again later.');
        toast({
          title: "Error",
          description: "Could not load family members.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);
  
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
  
  const handleSelectMember = (memberId: string) => {
    navigate(`/family-member/${memberId}`);
  };

  return (
    <MobileLayout
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || '' 
      }}
      title="Family Map"
      icon={<Map className="h-5 w-5" />}
    >
      <div className="flex flex-col h-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-pulse text-heritage-purple">Loading family data...</div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center p-4">
              <p className="text-heritage-purple mb-2">{error}</p>
              <button 
                className="px-4 py-2 bg-heritage-purple text-white rounded-md"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <FamilyMap 
            members={familyMembers}
            onSelectMember={handleSelectMember}
          />
        )}
      </div>
    </MobileLayout>
  );
};

export default FamilyMapPage;
