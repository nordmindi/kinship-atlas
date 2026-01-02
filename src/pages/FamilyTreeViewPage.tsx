import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FamilyMember } from '@/types';
import FamilyTreeGraph from '@/components/family/FamilyTreeGraph';
import { useNavigate } from 'react-router-dom';
import FamilyTreeHeader from '@/components/family/tree/FamilyTreeHeader';
import FamilyTreeTutorial from '@/components/family/tree/FamilyTreeTutorial';
import EmptyFamilyTree from '@/components/family/tree/EmptyFamilyTree';
import { FamilyGroupFilter } from '@/components/family/FamilyGroupFilter';
import { Button } from '@/components/ui/button';
import { Users, Loader2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getFamilyMembers } from '@/services/supabaseService';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { familyGroupService } from '@/services/familyGroupService';

const FamilyTreeViewPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserMember, setCurrentUserMember] = useState<FamilyMember | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [filteredMemberIds, setFilteredMemberIds] = useState<string[]>([]);
  const { selectedMemberId, setSelectedMemberId } = useFamilyTree();
  
  // Fetch family members data (using mock data for demonstration)
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setLoadError(null);
      
      try {
        console.log('Loading family members for user:', user.id);
        
        // Load real family members from Supabase
        const members = await getFamilyMembers();
        console.log('Loaded family members:', members.length, members);
        
        setFamilyMembers(members);
        
        // Find the current user in the family members (you may need to implement user-family member mapping)
        const currentMember = members.find(member => member.id === user.id) || members[0];
        setCurrentUserMember(currentMember || null);
        console.log('Current user member:', currentMember);
        
      } catch (error) {
        console.error('Error loading family members:', error);
        setLoadError('Could not load family tree data. Please try again.');
        toast({
          title: "Error",
          description: "Could not load family tree data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, refreshKey]);

  useEffect(() => {
    if (!familyMembers.length) {
      return;
    }

    const isCurrentSelectionValid = selectedMemberId
      ? familyMembers.some(member => member.id === selectedMemberId)
      : false;

    if (isCurrentSelectionValid) {
      return;
    }

    const fallbackMember =
      (currentUserMember && familyMembers.some(member => member.id === currentUserMember.id))
        ? currentUserMember.id
        : familyMembers[0]?.id;

    if (fallbackMember) {
      setSelectedMemberId(fallbackMember);
    }
  }, [familyMembers, currentUserMember, selectedMemberId, setSelectedMemberId]);

  // Function to refresh family tree data
  const handleRelationshipUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filter members by selected groups
  useEffect(() => {
    const filterMembers = async () => {
      if (selectedGroupIds.length === 0) {
        setFilteredMemberIds([]);
        return;
      }

      try {
        const memberIds = await familyGroupService.filterMembersByGroups(selectedGroupIds);
        setFilteredMemberIds(memberIds);
      } catch (error) {
        console.error('Error filtering members by groups:', error);
        setFilteredMemberIds([]);
      }
    };

    filterMembers();
  }, [selectedGroupIds]);

  // Compute filtered members
  const displayedMembers = useMemo(() => {
    if (selectedGroupIds.length === 0 || filteredMemberIds.length === 0) {
      return familyMembers;
    }

    return familyMembers.filter(member => filteredMemberIds.includes(member.id));
  }, [familyMembers, filteredMemberIds, selectedGroupIds]);
  
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-heritage-purple" />
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  const handleSelectMember = (memberId: string) => {
    console.log('Member selected:', memberId);
    setSelectedMemberId(memberId);
    
    // If we're in focus mode, keep focus on the newly selected member
    if (focusMode) {
      setFocusMode(true);
    }
  };

  const handleNavToProfile = (memberId: string) => {
    console.log('Navigating to profile:', memberId);
    navigate(`/family-member/${memberId}`);
  };
  
  const handleToggleFocusMode = () => {
    setFocusMode(!focusMode);
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // The actual search is handled in the FamilyTreeRenderer component
  };
  
  const handleAddFamilyMember = () => {
    navigate('/add-family-member');
  };

  return (
    <MobileLayout
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || '' 
      }}
      title="Family Tree"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="flex flex-col h-full">
        <FamilyTreeHeader 
          familyMembers={familyMembers}
          selectedMemberId={selectedMemberId || ''}
          onSelectMember={handleSelectMember}
          isLoading={isLoading}
          showLegend={showLegend}
          onToggleLegend={() => setShowLegend(!showLegend)}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
          focusMode={focusMode}
          onToggleFocusMode={handleToggleFocusMode}
          onSearch={handleSearch}
        />
        
        <div className="flex-1 p-4 h-full">
          {isLoading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-heritage-purple" />
                <p className="mt-2 text-muted-foreground">Loading family tree...</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center text-center">
                <p className="text-red-600 mb-4">{loadError}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : familyMembers.length > 0 ? (
            <div className="flex flex-col gap-4 h-full">
              <FamilyTreeTutorial 
                familyMembersCount={familyMembers.length}
                recentChangesCount={0} // TODO: Implement recent changes tracking
              />
              
              <FamilyGroupFilter
                selectedGroupIds={selectedGroupIds}
                onSelectionChange={setSelectedGroupIds}
                className="mb-2"
              />
              
              <div className="flex-1 h-[600px] min-h-[600px] bg-white rounded-lg border overflow-hidden relative">
                <FamilyTreeGraph 
                  members={displayedMembers}
                  onSelectMember={handleNavToProfile}
                  rootMemberId={selectedMemberId || undefined}
                  currentUserId={currentUserMember?.id}
                  showLegend={showLegend}
                  showMinimap={showMinimap}
                  focusMode={focusMode}
                  focusMemberId={focusMode ? selectedMemberId || undefined : undefined}
                  onEditMember={(memberId) => {
                    // Navigate to edit page
                    window.location.href = `/edit-family-member/${memberId}`;
                  }}
                  onViewMemberProfile={(memberId) => {
                    // Navigate to profile page
                    window.location.href = `/family-member/${memberId}`;
                  }}
                  onAddMemberRelation={(memberId) => {
                    // Navigate to add relation page
                    window.location.href = `/add-relation/${memberId}/child`;
                  }}
                  onViewMemberTimeline={(memberId) => {
                    // Navigate to profile page with timeline tab
                    window.location.href = `/family-member/${memberId}#timeline`;
                  }}
                  onRelationshipUpdated={handleRelationshipUpdated}
                  onRelationshipCreated={handleRelationshipUpdated}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <EmptyFamilyTree />
              <div className="mt-4 flex justify-center">
                <Button onClick={handleAddFamilyMember} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Family Member
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default FamilyTreeViewPage;
