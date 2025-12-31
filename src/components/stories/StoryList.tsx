import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Edit, 
  Trash2,
  Eye,
  X
} from 'lucide-react';
import { FamilyStory } from '@/types/stories';
import { FamilyMember } from '@/types';
import { getYearRange } from '@/utils/dateUtils';
import StoryEditor from './StoryEditor';

interface StoryListProps {
  stories: FamilyStory[];
  isLoading: boolean;
  onStoryUpdate: (story: FamilyStory) => void;
  onStoryDelete: (storyId: string) => void;
  familyMembers: FamilyMember[];
  showCreateCTA?: boolean; // controls whether to display internal create story buttons
}

const StoryList: React.FC<StoryListProps> = ({
  stories,
  isLoading,
  onStoryUpdate,
  onStoryDelete,
  familyMembers
 , showCreateCTA = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStory, setSelectedStory] = useState<FamilyStory | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<FamilyStory | null>(null);

  const filteredStories = stories.filter(story =>
    story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    story.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    story.relatedMembers.some(member => 
      member.familyMember?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.familyMember?.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCreateStory = () => {
    setEditingStory(null);
    setIsEditorOpen(true);
  };

  const handleEditStory = (story: FamilyStory) => {
    setEditingStory(story);
    setIsEditorOpen(true);
  };

  const handleStorySave = (story: FamilyStory) => {
    onStoryUpdate(story);
    setIsEditorOpen(false);
    setEditingStory(null);
  };

  const handleDeleteStory = async (storyId: string) => {
    if (window.confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      onStoryDelete(storyId);
    }
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Family Stories
          </h2>
          <p className="text-gray-600 mt-1">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} in your family archive
          </p>
        </div>
        {showCreateCTA && (
          <Button onClick={handleCreateStory} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search stories by title, content, or family members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Stories List */}
      {filteredStories.length === 0 ? (
        <Card className="shadow-sm border-heritage-purple/10">
          <CardContent className="text-center py-16">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No stories found' : 'No stories yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start building your family story collection'
              }
            </p>
            {!searchTerm && showCreateCTA && (
              <Button onClick={handleCreateStory} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Story
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredStories.map(story => (
            <Card key={story.id} className="group hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer shadow-sm border-heritage-purple/10" onClick={() => setSelectedStory(story)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 group-hover:text-heritage-purple transition-colors">{story.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {story.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {getYearRange(story.date)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {story.relatedMembers.length} {story.relatedMembers.length === 1 ? 'person' : 'people'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStory(story);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStory(story);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStory(story.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4 line-clamp-3">
                  {story.content}
                </p>
                
                {/* Related Members */}
                {story.relatedMembers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">People in this story:</h4>
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
                  </div>
                )}

                {/* Media */}
                {story.media && story.media.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Media ({story.media.length})
                    </h4>
                    <div className="flex gap-2">
                      {story.media.slice(0, 3).map(media => (
                        <div
                          key={media.id}
                          className="w-12 h-12 bg-gray-200 rounded border overflow-hidden flex items-center justify-center"
                        >
                          {media.media_type === 'image' && media.url ? (
                            <img
                              src={media.url}
                              alt={media.caption || 'Story media'}
                              className="w-full h-full object-cover"
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
                            className="w-full h-full flex items-center justify-center"
                            style={{ display: media.media_type === 'image' && media.url ? 'none' : 'flex' }}
                          >
                            <span className="text-xs text-gray-600">
                              {media.media_type === 'image' ? '🖼️' : '📎'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {story.media.length > 3 && (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                          <span className="text-xs text-gray-600">+{story.media.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Story Editor */}
      <StoryEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingStory(null);
        }}
        onSave={handleStorySave}
        familyMembers={familyMembers}
        existingStory={editingStory}
      />

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedStory.title}</CardTitle>
                  {selectedStory.date && (
                    <p className="text-gray-600 mt-1">
                      {getYearRange(selectedStory.date)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStory(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{selectedStory.content}</p>
              </div>
              
              {selectedStory.relatedMembers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">People in this story:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStory.relatedMembers.map(member => (
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
                </div>
              )}

              {/* Media in detail view */}
              {selectedStory.media && selectedStory.media.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Media ({selectedStory.media.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedStory.media.map(media => (
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StoryList;
