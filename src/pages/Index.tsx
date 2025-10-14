import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Users, Map as MapIcon, BookOpen, UserPlus, BookPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import FamilyTreeView from "@/components/family/FamilyTreeView";
import FamilyMap from "@/components/family/FamilyMap";
import StoryCard from "@/components/stories/StoryCard";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyTree } from "@/contexts/FamilyTreeContext";
import { getFamilyMembers, getFamilyStories } from "@/services/supabaseService";
import { FamilyMember, FamilyStory } from "@/types";
import { getYearRange } from "@/utils/dateUtils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedMemberId, setSelectedMemberId } = useFamilyTree();
  
  // Load data when user is authenticated
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Load family members
        const members = await getFamilyMembers();
        setFamilyMembers(members);
        
        // Load stories
        const stories = await getFamilyStories();
        setStories(stories);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

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
  
  return (
    <MobileLayout 
      currentUser={user ? { 
        name: user.email?.split('@')[0] || 'User',
        email: user.email || ''
      } : undefined}
    >
      <div className="px-4 py-3 bg-heritage-purple-light/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search family members, stories..." 
            className="pl-10 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-between p-1 bg-white border-b">
          <TabsTrigger value="home" className="flex-1">Home</TabsTrigger>
          <TabsTrigger value="tree" className="flex-1" onClick={() => navigate('/family-tree')}>Family Tree</TabsTrigger>
          <TabsTrigger value="map" className="flex-1">Map</TabsTrigger>
          <TabsTrigger value="stories" className="flex-1">Stories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="home" className="pt-4 pb-16 space-y-6">
          <section>
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-lg font-medium text-heritage-dark">Recent Stories</h2>
              <Button variant="ghost" size="sm" className="text-heritage-purple" onClick={() => setActiveTab("stories")}>
                View All
              </Button>
            </div>
            <div className="px-4 space-y-4">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-gray-200 rounded"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                </div>
              ) : filteredStories.length > 0 ? (
                filteredStories.slice(0, 3).map(story => (
                  <StoryCard 
                    key={story.id}
                    story={story}
                    authorName={getAuthorName(story.authorId)}
                    onView={() => console.log("View story", story.id)}
                  />
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground">No stories found.</p>
              )}
            </div>
          </section>
          
          <section>
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-lg font-medium text-heritage-dark">Family</h2>
              <Button variant="ghost" size="sm" className="text-heritage-purple" onClick={() => setActiveTab("tree")}>
                View All
              </Button>
            </div>
            <div className="flex overflow-x-auto pb-4 pl-4 space-x-3 scrollbar-hide">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="w-32 flex-shrink-0">
                    <div className="aspect-square rounded-lg bg-gray-200 animate-pulse"></div>
                    <div className="mt-1 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map(member => (
                  <div 
                    key={member.id} 
                    className="w-32 flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      setSelectedMemberId(member.id);
                      setActiveTab("tree");
                    }}
                  >
                    <div 
                      className="aspect-square rounded-lg bg-cover bg-center overflow-hidden border border-heritage-purple/20"
                      style={{ 
                        backgroundImage: member.avatar ? `url(${member.avatar})` : 'none',
                        backgroundColor: !member.avatar ? '#e9e2f5' : undefined
                      }}
                    >
                      {!member.avatar && (
                        <div className="w-full h-full flex items-center justify-center text-heritage-purple">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <p className="text-sm font-medium line-clamp-1">
                        {member.firstName}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {getYearRange(member.birthDate, member.deathDate)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full py-4 text-center text-muted-foreground">
                  No family members found.
                </div>
              )}
            </div>
          </section>
          
          <section className="px-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center space-y-2 py-4">
                  <div className="rounded-full bg-heritage-purple-light p-3">
                    <UserPlus className="h-6 w-6 text-heritage-purple" />
                  </div>
                  <h3 className="font-medium">Add to Your Family Tree</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite family members or add ancestors
                  </p>
                  <Button 
                    className="mt-2 bg-heritage-purple hover:bg-heritage-purple-medium"
                    onClick={handleAddMember}
                  >
                    Add Family Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
        
        <TabsContent value="tree">
          {isLoading ? (
            <div className="h-[60vh] flex items-center justify-center">
              <div className="animate-pulse text-heritage-purple">Loading family tree...</div>
            </div>
          ) : (
            <FamilyTreeView 
              members={filteredMembers}
              currentMemberId={selectedMemberId || ""}
              onSelectMember={setSelectedMemberId}
            />
          )}
        </TabsContent>
        
        <TabsContent value="map">
          {isLoading ? (
            <div className="h-[60vh] flex items-center justify-center">
              <div className="animate-pulse text-heritage-purple">Loading map...</div>
            </div>
          ) : (
            <FamilyMap 
              members={filteredMembers.filter(member => member.currentLocation)}
              onSelectMember={setSelectedMemberId}
            />
          )}
        </TabsContent>
        
        <TabsContent value="stories" className="pt-4 pb-16 space-y-6">
          <div className="px-4 space-y-4">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            ) : filteredStories.length > 0 ? (
              filteredStories.map(story => (
                <StoryCard 
                  key={story.id}
                  story={story}
                  authorName={getAuthorName(story.authorId)}
                  onView={() => console.log("View story", story.id)}
                />
              ))
            ) : (
              <p className="text-center py-4 text-muted-foreground">No stories found.</p>
            )}
            
            <Button 
              className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
              onClick={handleAddStory}
            >
              Add New Story
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="fixed right-6 bottom-20 z-40 md:bottom-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="rounded-full shadow-lg bg-heritage-purple hover:bg-heritage-purple-medium h-14 w-14">
              <PlusCircle className="h-6 w-6" />
              <span className="sr-only">Add new</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2">
            <DropdownMenuItem onClick={handleAddMember} className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Add Family Member</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddStory} className="cursor-pointer">
              <BookPlus className="mr-2 h-4 w-4" />
              <span>Add Story</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </MobileLayout>
  );
};

export default Index;
