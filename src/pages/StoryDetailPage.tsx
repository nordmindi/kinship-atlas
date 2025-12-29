import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Users, Edit, Trash2, Eye } from "lucide-react";
import { getFamilyStories } from "@/services/supabaseService";
import { getFamilyMembers } from "@/services/supabaseService";
import { FamilyStory, FamilyMember } from "@/types";
import { getYearRange } from "@/utils/dateUtils";

const StoryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [story, setStory] = useState<FamilyStory | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStory = async () => {
      if (!user || !id) return;
      
      setIsLoading(true);
      try {
        // Load stories and find the specific one
        const stories = await getFamilyStories();
        const foundStory = stories.find(s => s.id === id);
        
        if (foundStory) {
          setStory(foundStory);
          
          // Load family members for author name and related members
          const members = await getFamilyMembers();
          setFamilyMembers(members);
        }
      } catch (error) {
        console.error('Error loading story:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStory();
  }, [user, id]);

  const handleBack = () => {
    navigate(-1);
  };

  const getAuthorName = (authorId: string) => {
    const member = familyMembers.find(m => m.id === authorId);
    return member ? `${member.firstName} ${member.lastName}` : "Unknown";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'protagonist': return 'bg-blue-100 text-blue-800';
      case 'witness': return 'bg-green-100 text-green-800';
      case 'narrator': return 'bg-purple-100 text-purple-800';
      case 'participant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-heritage-purple">Loading story...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!story) {
    return (
      <MobileLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-heritage-dark mb-4">Story Not Found</h1>
            <p className="text-muted-foreground mb-6">The story you're looking for doesn't exist or has been removed.</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User',
        email: user.email || ''
      }}
      showBackButton
      title="Story Details"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-heritage-dark">{story.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {story.date ? getYearRange(story.date) : 'No date'}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  By {getAuthorName(story.authorId)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Story Content */}
        <div className="space-y-8">
          {/* Main Story Card */}
          <Card className="shadow-sm border-heritage-purple/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Story Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {story.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Related Members */}
          {story.relatedMembers && story.relatedMembers.length > 0 && (
            <Card className="shadow-sm border-heritage-purple/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People in this Story
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {story.relatedMembers.map(member => (
                    <Badge
                      key={member.id}
                      variant="secondary"
                      className={getRoleColor(member.role)}
                    >
                      {member.familyMember?.firstName} {member.familyMember?.lastName}
                      <span className="ml-1 text-xs opacity-75">({member.role})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media */}
          {story.media && story.media.length > 0 && (
            <Card className="shadow-sm border-heritage-purple/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Media ({story.media.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {story.media.map(media => (
                    <div
                      key={media.id}
                      className="relative group border rounded-md overflow-hidden"
                    >
                      {media.media_type === 'image' && media.url ? (
                        <img
                          src={media.url}
                          alt={media.caption || 'Story media'}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.currentTarget as HTMLImageElement;
                            const nextElement = target.nextElementSibling as HTMLElement;
                            target.style.display = 'none';
                            if (nextElement) nextElement.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-24 flex items-center justify-center bg-gray-100"
                        style={{ display: media.media_type === 'image' && media.url ? 'none' : 'flex' }}
                      >
                        <span className="text-lg">
                          {media.media_type === 'image' ? '🖼️' : '📎'}
                        </span>
                      </div>
                      {media.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {media.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default StoryDetailPage;
