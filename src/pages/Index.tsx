import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Users, Map as MapIcon, BookOpen, UserPlus, BookPlus, Upload, Download, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import FamilyTreeView from "@/components/family/FamilyTreeView";
import FamilyMap from "@/components/family/FamilyMap";
import StoryCard from "@/components/stories/StoryCard";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyTree } from "@/contexts/FamilyTreeContext";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useStories } from "@/hooks/useStories";
import { usePermissions } from "@/hooks/usePermissions";
import { useFamilyTimeline } from "@/hooks/useTimeline";
import { FamilyMember, FamilyStory } from "@/types";
import { getYearRange } from "@/utils/dateUtils";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Component for displaying family member in overview
const FamilyMemberOverviewCard = ({ member, onClick }: { member: FamilyMember; onClick: () => void }) => {
  const accessibleAvatarUrl = useStorageUrl(member.avatar);
  const [imageError, setImageError] = useState(false);
  
  return (
    <div 
      className="w-36 flex-shrink-0 cursor-pointer group"
      onClick={onClick}
    >
      <div 
        className="aspect-square rounded-xl overflow-hidden border-2 border-heritage-purple/20 group-hover:border-heritage-purple/40 transition-colors shadow-sm relative bg-heritage-purple-light"
      >
        {accessibleAvatarUrl && !imageError ? (
          <img 
            src={accessibleAvatarUrl} 
            alt={`${member.firstName} ${member.lastName}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-heritage-purple">
            <Users className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium line-clamp-1 text-heritage-dark">
          {member.firstName}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {getYearRange(member.birthDate, member.deathDate)}
        </p>
      </div>
    </div>
  );
};

const Index = () => {
  const { user, isLoading: authLoading, canWrite } = useAuth();
  const { canAddFamilyMember, canCreateStory } = usePermissions();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedMemberId, setSelectedMemberId } = useFamilyTree();
  
  // Use TanStack Query hooks for data fetching
  const { data: familyMembers = [], isLoading: membersLoading, error: membersError } = useFamilyMembers();
  const { data: stories = [], isLoading: storiesLoading, error: storiesError } = useStories();
  const memberIds = familyMembers.map(m => m.id);
  const { timeline = [], isLoading: timelineLoading } = useFamilyTimeline(memberIds);
  
  const isLoading = authLoading || membersLoading || storiesLoading || timelineLoading;

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

    const fallbackMemberId = familyMembers[0]?.id;

    if (fallbackMemberId) {
      setSelectedMemberId(fallbackMemberId);
    }
  }, [familyMembers, selectedMemberId, setSelectedMemberId]);
  
  // Get author name for stories
  const getAuthorName = (authorId: string) => {
    const member = familyMembers.find(m => m.id === authorId);
    return member ? `${member.firstName} ${member.lastName}` : "Unknown";
  };
  
  // Filter family members based on search
  const filteredMembers = searchQuery
    ? familyMembers.filter(member => 
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : familyMembers;
  
  // Filter stories based on search
  const filteredStories = searchQuery
    ? stories.filter(story => 
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stories;
  
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
  
  // Handle add member button
  const handleAddMember = () => {
    navigate('/add-family-member');
  };
  
  // Handle add story button
  const handleAddStory = () => {
    navigate('/add-story');
  };

  const handleImportFamilyData = () => {
    navigate('/import-family-data');
  };

  const handleExportFamilyData = () => {
    navigate('/export-family-data');
  };

  const handleLegacyStories = () => {
    navigate('/legacy-stories');
  };

  // Handle story view
  const handleViewStory = (storyId: string) => {
    navigate(`/story/${storyId}`);
  };
  
  return (
    <MobileLayout 
      currentUser={user ? { 
        name: user.email?.split('@')[0] || 'User',
        email: user.email || ''
      } : undefined}
    >
      {/* Search Section with proper container */}
      <div className="bg-gradient-to-r from-heritage-purple-light/30 to-heritage-purple-light/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search family members, stories..." 
              className="pl-10 bg-white shadow-sm border-0 focus:ring-2 focus:ring-heritage-purple/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs with proper container */}
      <div className="bg-white border-b border-heritage-purple/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-between p-1 bg-heritage-purple-light/20 border-0">
              <TabsTrigger value="home" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">Home</TabsTrigger>
              <TabsTrigger value="tree" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm" onClick={() => navigate('/family-tree')}>Family Tree</TabsTrigger>
              <TabsTrigger value="map" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">Map</TabsTrigger>
              <TabsTrigger value="stories" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">Stories</TabsTrigger>
            </TabsList>
            
            <TabsContent value="home" className="pt-8 pb-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Recent Stories Section */}
                <section className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-heritage-dark">Recent Stories</h2>
                    <Button variant="ghost" size="sm" className="text-heritage-purple hover:bg-heritage-purple-light" onClick={() => setActiveTab("stories")}>
                      View All
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                      </div>
                    ) : filteredStories.length > 0 ? (
                      filteredStories.slice(0, 3).map(story => (
                        <StoryCard 
                          key={story.id}
                          story={story}
                          authorName={getAuthorName(story.authorId)}
                          onView={() => handleViewStory(story.id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-heritage-purple-light mx-auto mb-3" />
                        <p className="text-muted-foreground">No stories found.</p>
                        <p className="text-sm text-muted-foreground mt-1">Start sharing your family stories!</p>
                      </div>
                    )}
                  </div>
                </section>
                
                {/* Timeline Overview Section */}
                <section className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-heritage-dark">Recent Timeline</h2>
                    <Button variant="ghost" size="sm" className="text-heritage-purple hover:bg-heritage-purple-light" onClick={() => navigate('/legacy-stories')}>
                      View Full Timeline
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-16 bg-gray-200 rounded-lg"></div>
                        <div className="h-16 bg-gray-200 rounded-lg"></div>
                      </div>
                    ) : timeline.length > 0 ? (
                      timeline.slice(0, 5).map((item, index) => (
                        <button
                          key={`${item.itemType || 'unknown'}-${item.itemId || index}-${item.memberId || 'no-member'}`}
                          type="button"
                          className="w-full flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-heritage-purple/40 hover:shadow-sm transition-all cursor-pointer text-left bg-transparent"
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.itemType === 'story') {
                              navigate(`/story/${item.itemId}`);
                            } else if (item.itemType === 'event') {
                              navigate(`/family-member/${item.memberId}#timeline`);
                            }
                          }}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.itemType === 'story' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {item.itemType === 'story' ? (
                              <BookOpen className="h-4 w-4" />
                            ) : (
                              <History className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-heritage-dark truncate">{item.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{getYearRange(item.date)}</span>
                              {item.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 text-heritage-purple-light mx-auto mb-3" />
                        <p className="text-muted-foreground">No timeline items yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">Stories and events will appear here.</p>
                      </div>
                    )}
                  </div>
                </section>
                
                {/* Family Section */}
                <section className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-heritage-dark">Family</h2>
                    <Button variant="ghost" size="sm" className="text-heritage-purple hover:bg-heritage-purple-light" onClick={() => {
                      setSelectedMemberId("");
                      setActiveTab("tree");
                    }}>
                      View All
                    </Button>
                  </div>
                  <div className="flex overflow-x-auto pb-2 space-x-4 scrollbar-hide">
                    {isLoading ? (
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="w-36 flex-shrink-0">
                          <div className="aspect-square rounded-xl bg-gray-200 animate-pulse"></div>
                          <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="mt-1 h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        </div>
                      ))
                    ) : filteredMembers.length > 0 ? (
                      filteredMembers.map(member => (
                        <FamilyMemberOverviewCard
                          key={member.id}
                          member={member}
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setActiveTab("tree");
                          }}
                        />
                      ))
                    ) : (
                      <div className="w-full py-8 text-center">
                        <Users className="h-12 w-12 text-heritage-purple-light mx-auto mb-3" />
                        <p className="text-muted-foreground">No family members found.</p>
                        <p className="text-sm text-muted-foreground mt-1">Start building your family tree!</p>
                      </div>
                    )}
                  </div>
                </section>
                
                {/* Call to Action Section */}
                <section className="bg-gradient-to-br from-heritage-purple-light/30 to-heritage-purple-light/50 rounded-xl p-6 sm:p-8 border border-heritage-purple/10">
                  <div className="text-center">
                    <div className="rounded-full bg-white p-4 w-fit mx-auto mb-4 shadow-sm">
                      <UserPlus className="h-8 w-8 text-heritage-purple" />
                    </div>
                    <h3 className="text-lg font-semibold text-heritage-dark mb-2">Add to Your Family Tree</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      Invite family members or add ancestors to build your complete family history
                    </p>
                    <Button 
                      className="bg-heritage-purple hover:bg-heritage-purple-medium shadow-sm"
                      onClick={handleAddMember}
                    >
                      Add Family Member
                    </Button>
                  </div>
                </section>
              </div>
            </TabsContent>
            
            <TabsContent value="tree">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                  <div className="h-[60vh] flex items-center justify-center">
                    <div className="animate-pulse text-heritage-purple">Loading family tree...</div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 overflow-hidden">
                    <FamilyTreeView 
                      members={filteredMembers}
                      currentMemberId={selectedMemberId || ""}
                      onSelectMember={setSelectedMemberId}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="map">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                  <div className="h-[60vh] flex items-center justify-center">
                    <div className="animate-pulse text-heritage-purple">Loading map...</div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 overflow-hidden">
                    <FamilyMap 
                      members={filteredMembers.filter(member => member.currentLocation)}
                      onSelectMember={setSelectedMemberId}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="stories" className="pt-8 pb-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                  </div>
                ) : filteredStories.length > 0 ? (
                  <div className="space-y-6">
                    {filteredStories.map(story => (
                      <div key={story.id} className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 p-6 sm:p-8">
                        <StoryCard 
                          story={story}
                          authorName={getAuthorName(story.authorId)}
                          onView={() => handleViewStory(story.id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 p-8 text-center">
                    <BookOpen className="h-16 w-16 text-heritage-purple-light mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-heritage-dark mb-2">No stories found</h3>
                    <p className="text-muted-foreground mb-6">Start documenting your family's stories and memories.</p>
                  </div>
                )}
                
                {canCreateStory() && (
                  <div className="bg-white rounded-xl shadow-sm border border-heritage-purple/10 p-6 sm:p-8">
                    <Button 
                      className="w-full bg-heritage-purple hover:bg-heritage-purple-medium shadow-sm"
                      onClick={handleAddStory}
                    >
                      <BookPlus className="h-4 w-4 mr-2" />
                      Add New Story
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {canWrite && (
        <div className="fixed right-6 bottom-20 z-40 md:bottom-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="rounded-full shadow-lg bg-heritage-purple hover:bg-heritage-purple-medium h-14 w-14">
                <PlusCircle className="h-6 w-6" />
                <span className="sr-only">Add new</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="mb-2">
              {canAddFamilyMember() && (
                <DropdownMenuItem onClick={handleAddMember} className="cursor-pointer">
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Add Family Member</span>
                </DropdownMenuItem>
              )}
              {canCreateStory() && (
                <DropdownMenuItem onClick={handleAddStory} className="cursor-pointer">
                  <BookPlus className="mr-2 h-4 w-4" />
                  <span>Add Story</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleImportFamilyData} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                <span>Import Family Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportFamilyData} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                <span>Export Family Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLegacyStories} className="cursor-pointer">
                <History className="mr-2 h-4 w-4" />
                <span>Legacy Stories</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </MobileLayout>
  );
};

export default Index;
