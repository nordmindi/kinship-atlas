import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLoadingRecovery, useTabVisibility } from '@/hooks/useTabVisibility';
import { Navigate, useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FamilyMember } from '@/types';
import FamilyTreeView from '@/components/family/FamilyTreeView';
import { Users, Loader2, Search, Filter, X, UserPlus } from 'lucide-react';
import { getFamilyMembers } from '@/services/supabaseService';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BulkAssignToGroupDialog } from '@/components/family/BulkAssignToGroupDialog';

interface MemberFilters {
  gender: 'all' | 'male' | 'female' | 'other';
  rootMembers: 'all' | 'root' | 'non-root';
  relations: 'all' | 'has-relations' | 'no-relations';
}

const AllFamilyMembersPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MemberFilters>({
    gender: 'all',
    rootMembers: 'all',
    relations: 'all',
  });
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const { setSelectedMemberId } = useFamilyTree();
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);

  // Use loading recovery hook to handle stuck loading states
  useLoadingRecovery(isLoading, setIsLoading, {
    timeout: 30000,
    onTimeout: () => {
      setLoadError('Request timed out. Please try again.');
    },
  });
  
  // Clear selected member when page loads to show all members
  useEffect(() => {
    setSelectedMemberId(null);
  }, [setSelectedMemberId]);
  
  // Fetch family members data
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const loadData = async () => {
      if (!user) {
        if (isMounted) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
        return;
      }
      
      if (isMounted) {
        isLoadingRef.current = true;
        setIsLoading(true);
        setLoadError(null);
        lastLoadTimeRef.current = Date.now();
      }
      
      // Set a timeout to prevent infinite loading (30 seconds)
      timeoutId = setTimeout(() => {
        if (isMounted && isLoadingRef.current) {
          console.warn('Family members load timeout - resetting loading state');
          isLoadingRef.current = false;
          setIsLoading(false);
          setLoadError('Request timed out. Please try again.');
        }
      }, 30000);
      
      try {
        const members = await getFamilyMembers();
        if (isMounted) {
          setFamilyMembers(members);
          isLoadingRef.current = false;
          setIsLoading(false);
          setLoadError(null);
          lastLoadTimeRef.current = Date.now();
        }
      } catch (error) {
        console.error('Error loading family members:', error);
        if (isMounted) {
          setLoadError('Could not load family members. Please try again later.');
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);

  // Handle tab visibility changes - refetch data when tab becomes visible again
  useTabVisibility({
    enabled: !!user,
    onVisible: () => {
      if (!user) return;

      const STALE_THRESHOLD = 1000 * 60 * 2; // 2 minutes - only refresh if data is older than this
      const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current;
      
      // If we're stuck in loading state, reset and retry
      if (isLoading && familyMembers.length === 0) {
        console.log('🔄 Tab refocused - retrying family members load (stuck in loading)...');
        setIsLoading(false);
        setLoadError(null);
        
        // Retry loading after a short delay
        setTimeout(async () => {
          try {
            setIsLoading(true);
            const members = await getFamilyMembers();
            setFamilyMembers(members);
            setIsLoading(false);
            lastLoadTimeRef.current = Date.now();
            console.log('✅ Successfully loaded family members after refocus');
          } catch (error) {
            console.error('Error reloading family members on refocus:', error);
            setLoadError('Could not load family members. Please try again.');
            setIsLoading(false);
          }
        }, 100);
      } else if (familyMembers.length > 0 && timeSinceLastLoad > STALE_THRESHOLD) {
        // If we have data but it's stale, do a background refresh (don't show loading)
        console.log('🔄 Tab refocused - refreshing stale data...');
        const refreshData = async () => {
          try {
            const members = await getFamilyMembers();
            // Only update if we got data (don't clear on error)
            if (members && members.length > 0) {
              setFamilyMembers(members);
              lastLoadTimeRef.current = Date.now();
              console.log('✅ Successfully refreshed family members');
            }
          } catch (error) {
            console.error('Error refreshing family members on refocus:', error);
            // Don't show error - this is a background refresh
          }
        };
        refreshData();
      }
    },
  });

  // Filter members based on search and filters - MUST be before any conditional returns
  const filteredMembers = useMemo(() => {
    let filtered = familyMembers;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
        member.birthPlace?.toLowerCase().includes(query) ||
        member.deathPlace?.toLowerCase().includes(query) ||
        member.bio?.toLowerCase().includes(query) ||
        member.currentLocation?.description?.toLowerCase().includes(query)
      );
    }

    // Apply gender filter
    if (filters.gender !== 'all') {
      filtered = filtered.filter(member => member.gender === filters.gender);
    }

    // Apply root members filter
    if (filters.rootMembers === 'root') {
      filtered = filtered.filter(member => member.isRootMember === true);
    } else if (filters.rootMembers === 'non-root') {
      filtered = filtered.filter(member => !member.isRootMember);
    }

    // Apply relations filter
    if (filters.relations === 'has-relations') {
      filtered = filtered.filter(member => (member.relations?.length || 0) > 0);
    } else if (filters.relations === 'no-relations') {
      filtered = filtered.filter(member => (member.relations?.length || 0) === 0);
    }

    return filtered;
  }, [familyMembers, searchQuery, filters]);

  const resetFilters = () => {
    setFilters({
      gender: 'all',
      rootMembers: 'all',
      relations: 'all',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.gender !== 'all' || 
    filters.rootMembers !== 'all' || 
    filters.relations !== 'all' ||
    searchQuery !== '';

  // Early returns after all hooks
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
    setSelectedMemberId(memberId);
    navigate(`/family-member/${memberId}`);
  };
  
  const handleMemberDeleted = () => {
    // Reload data after member deletion
    const loadData = async () => {
      try {
        const members = await getFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error('Error reloading family members:', error);
      }
    };
    loadData();
  };
  
  return (
    <MobileLayout
      currentUser={{
        name: user.email?.split('@')[0] || 'User',
        email: user.email || ''
      }}
      showBackButton
      title="All Family Members"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="p-4 h-full flex flex-col">
        {isLoading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-heritage-purple" />
              <p className="mt-2 text-muted-foreground">Loading family members...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center text-center">
              <p className="text-red-600 mb-4">{loadError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-heritage-purple text-white rounded-lg hover:bg-heritage-purple-dark"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <div className="space-y-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, birth place, bio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-white"
                    aria-label="Search family members"
                  />
                </div>
                <Button
                  variant="default"
                  onClick={() => setShowBulkAssignDialog(true)}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign to Groups
                </Button>
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">
                      {[
                        filters.gender !== 'all' && 1,
                        filters.rootMembers !== 'all' && 1,
                        filters.relations !== 'all' && 1,
                      ].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Gender Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="gender-filter" className="text-sm">Gender</Label>
                      <Select
                        value={filters.gender}
                        onValueChange={(value: MemberFilters['gender']) =>
                          setFilters(prev => ({ ...prev, gender: value }))
                        }
                      >
                        <SelectTrigger id="gender-filter" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Genders</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Root Members Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="root-filter" className="text-sm">Root Members</Label>
                      <Select
                        value={filters.rootMembers}
                        onValueChange={(value: MemberFilters['rootMembers']) =>
                          setFilters(prev => ({ ...prev, rootMembers: value }))
                        }
                      >
                        <SelectTrigger id="root-filter" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="root">Root Members Only</SelectItem>
                          <SelectItem value="non-root">Non-Root Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Relations Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="relations-filter" className="text-sm">Relations</Label>
                      <Select
                        value={filters.relations}
                        onValueChange={(value: MemberFilters['relations']) =>
                          setFilters(prev => ({ ...prev, relations: value }))
                        }
                      >
                        <SelectTrigger id="relations-filter" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="has-relations">Has Relations</SelectItem>
                          <SelectItem value="no-relations">No Relations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Count */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredMembers.length} of {familyMembers.length} family members
                {hasActiveFilters && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={resetFilters}
                    className="h-auto p-0 ml-2 text-primary"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>

            {/* Family Members Grid */}
            <div className="flex-1 overflow-auto">
              <FamilyTreeView 
                members={filteredMembers}
                currentMemberId=""
                onSelectMember={handleSelectMember}
                onMemberDeleted={handleMemberDeleted}
              />
            </div>

            {/* Bulk Assign Dialog */}
            <BulkAssignToGroupDialog
              isOpen={showBulkAssignDialog}
              onClose={() => setShowBulkAssignDialog(false)}
              members={filteredMembers}
              onUpdate={handleMemberDeleted}
            />
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default AllFamilyMembersPage;

