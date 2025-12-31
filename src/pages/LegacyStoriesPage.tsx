import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Calendar, 
  Users, 
  MapPin,
  Plus,
  ArrowLeft
} from "lucide-react";
import { useStories, useCreateStory, useUpdateStory, useDeleteStory } from "@/hooks/useStories";
import { useMemberTimeline } from "@/hooks/useTimeline";
import { useFamilyTree } from "@/contexts/FamilyTreeContext";
import StoryList from "@/components/stories/StoryList";
import Timeline from "@/components/stories/Timeline";
import StoryEditor from "@/components/stories/StoryEditor";
import { familyMemberService } from "@/services/familyMemberService";
import type { FamilyMember } from "@/types";
import type { CreateStoryRequest, UpdateStoryRequest, FamilyStory } from "@/types/stories";

const LegacyStoriesPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  useFamilyTree();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState("stories");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const {
    data: stories = [],
    isLoading: storiesLoading,
  } = useStories();
  
  const createStoryMutation = useCreateStory();
  const updateStoryMutation = useUpdateStory();
  const deleteStoryMutation = useDeleteStory();
  
  // Wrapper functions to match old API
  const createStory = async (request: CreateStoryRequest) => {
    const result = await createStoryMutation.mutateAsync(request);
    return result;
  };
  
  const updateStory = async (request: UpdateStoryRequest) => {
    const result = await updateStoryMutation.mutateAsync(request);
    return result;
  };
  
  const deleteStory = async (storyId: string) => {
    const result = await deleteStoryMutation.mutateAsync(storyId);
    return result;
  };

  const {
    timeline,
    isLoading: timelineLoading
  } = useMemberTimeline(selectedMemberId || '');

  // Load family members explicitly (root cause: context does not provide members)
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setMembersLoading(true);
      try {
        const members = await familyMemberService.getAllFamilyMembers();
        if (!cancelled) {
          setFamilyMembers(members);
        }
      } catch (e) {
        console.error('Failed to load family members for Legacy Stories page:', e);
        if (!cancelled) setFamilyMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleStoryUpdate = (story: any) => {
    // The story is already updated in the hook, just refresh if needed
  };

  const handleStoryDelete = async (storyId: string) => {
    const result = await deleteStory(storyId);
    if (!result.success) {
      console.error('Failed to delete story:', result.error);
    }
  };

  const handleCreateStory = () => {
    setIsEditorOpen(true);
  };

  const handleStorySave = (story: FamilyStory) => {
    setIsEditorOpen(false);
    // The createStory function from useStories hook will update the local state
  };

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

  // Safe fallbacks to avoid undefined access during initial load
  const safeStories = stories || [];
  const safeTimeline = timeline || [];
  const safeMembers = familyMembers || [];

  const stats = {
    totalStories: safeStories.length,
    totalEvents: safeTimeline.filter(item => item.itemType === 'event').length,
    totalMembers: safeMembers.length,
    dateRange: safeTimeline.length > 0 ? {
      earliest: safeTimeline[safeTimeline.length - 1]?.date,
      latest: safeTimeline[0]?.date
    } : null
  };

  return (
    <MobileLayout 
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || ''
      }}
      showBackButton
      title="Legacy Stories"
      icon={<BookOpen className="h-5 w-5" />}
    >
      <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalStories}</p>
                  <p className="text-sm text-gray-600">Stories</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                  <p className="text-sm text-gray-600">Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <p className="text-sm text-gray-600">Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {safeTimeline.filter(item => item.location).length}
                  </p>
                  <p className="text-sm text-gray-600">Locations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Member Selection & Actions */}
        <Card className="mb-8 shadow-sm border-heritage-purple/10">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">View Timeline for Family Member</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateStory}>
                  <Plus className="h-4 w-4 mr-1" /> Add Story
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {safeMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedMemberId === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMemberId(null)}
                >
                  All Members
                </Button>
                {safeMembers.map(member => (
                  <Button
                    key={member.id}
                    variant={selectedMemberId === member.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    {member.firstName} {member.lastName}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No family members yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="stories" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Stories
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stories" className="h-full">
              <StoryList
                stories={safeStories}
                isLoading={storiesLoading}
                onStoryUpdate={handleStoryUpdate}
                onStoryDelete={handleStoryDelete}
                familyMembers={safeMembers}
                showCreateCTA={false}
              />
            </TabsContent>

            <TabsContent value="timeline" className="h-full">
              <Timeline
                timeline={safeTimeline}
                isLoading={timelineLoading}
                onItemClick={(item) => {
                  // Handle timeline item click
                  console.log('Timeline item clicked:', item);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Floating Action Button (removed to avoid duplicates) */}

        {/* Story Editor */}
        <StoryEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleStorySave}
          familyMembers={safeMembers}
          createStory={createStory}
          updateStory={updateStory}
        />
      </div>
    </MobileLayout>
  );
};

export default LegacyStoriesPage;
