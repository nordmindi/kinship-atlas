import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, User, Users, Edit, Trash2, Eye, Package, FileText, Image as ImageIcon, BookOpen, Tag, Download, MapPin, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { storyService } from "@/services/storyService";
import { getUserProfile } from "@/services/userService";
import { usePermissions } from "@/hooks/usePermissions";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useStory } from "@/hooks/useStories";
import { FamilyStory } from "@/types/stories";
import { getYearRange } from "@/utils/dateUtils";
import { sanitizeHtml } from "@/utils/sanitize";
import { getAccessibleStorageUrl } from "@/utils/storageUrl";
import StoryEditor from "@/components/stories/StoryEditor";

// Media thumbnail component
const MediaThumbnail: React.FC<{
  media: any;
  index: number;
  imageUrls: Record<string, string>;
  loadingImages: Set<string>;
  onImageUrlLoaded: (mediaId: string, url: string) => void;
  onLoadingChange: (mediaId: string, loading: boolean) => void;
  onClick: () => void;
}> = ({ media, imageUrls, loadingImages, onImageUrlLoaded, onLoadingChange, onClick }) => {
  const mediaId = media.id;
  const isImage = media.media_type === 'image';
  const isLoading = loadingImages.has(mediaId);
  const imageUrl = imageUrls[mediaId] || media.url;

  useEffect(() => {
    if (isImage && media.url && !imageUrls[mediaId]) {
      onLoadingChange(mediaId, true);
      getAccessibleStorageUrl(media.url)
        .then(url => {
          if (url) {
            onImageUrlLoaded(mediaId, url);
          }
          onLoadingChange(mediaId, false);
        })
        .catch(() => {
          onLoadingChange(mediaId, false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId, media.url, isImage]);

  return (
    <div
      className="relative group aspect-square border rounded-lg overflow-hidden cursor-pointer bg-gray-50 hover:shadow-lg transition-all duration-200"
      onClick={onClick}
    >
      {isImage && imageUrl ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-heritage-purple" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={media.caption || media.file_name || 'Story media'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={async (e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (media.url && imageUrl !== media.url) {
                try {
                  const signedUrl = await getAccessibleStorageUrl(media.url);
                  if (signedUrl && signedUrl !== imageUrl) {
                    target.src = signedUrl;
                    onImageUrlLoaded(mediaId, signedUrl);
                    return;
                  }
                } catch (error) {
                  console.error('Error getting signed URL:', error);
                }
              }
              target.style.display = 'none';
            }}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mb-2" />
          {media.file_name && (
            <span className="text-xs text-gray-600 px-2 text-center truncate w-full">
              {media.file_name}
            </span>
          )}
        </div>
      )}
      
      {/* Overlay with caption on hover */}
      {(media.caption || media.file_name) && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-end">
          <div className="w-full p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <p className="text-white text-xs font-medium truncate">
              {media.caption || media.file_name}
            </p>
          </div>
        </div>
      )}

      {/* Image indicator badge */}
      {isImage && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ImageIcon className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
};

const StoryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { canEditStory } = usePermissions();
  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: story, isLoading: storyLoading, error: storyError, refetch: refetchStory } = useStory(id || null);
  const [authorName, setAuthorName] = useState<string>("Unknown");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; caption?: string; fileName?: string; media_type: string; id?: string } | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAuthorName = async () => {
      if (!story || !user) return;
      
      // Check if author is the current user
      if (story.authorId === user.id) {
        setAuthorName(user.email?.split('@')[0] || 'You');
      } else {
        // For other users, try to get profile or show generic name
        const profile = await getUserProfile(story.authorId);
        if (profile) {
          setAuthorName(`User ${story.authorId.substring(0, 8)}`);
        } else {
          setAuthorName("Unknown");
        }
      }
    };
    
    loadAuthorName();
  }, [story, user]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleStoryUpdated = (updatedStory: FamilyStory) => {
    // Refetch the story to get the latest data
    refetchStory();
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
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

  const isLoading = storyLoading;

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-heritage-purple">Loading story...</div>
        </div>
      </MobileLayout>
    );
  }

  if (storyError) {
    console.error('Error loading story:', storyError);
    console.error('Story ID:', id);
  }

  if (!story && !storyLoading) {
    return (
      <MobileLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-heritage-dark mb-4">Story Not Found</h1>
            <p className="text-muted-foreground mb-2">The story you're looking for doesn't exist or has been removed.</p>
            {id && (
              <p className="text-sm text-muted-foreground mb-6">Story ID: {id}</p>
            )}
            {storyError && (
              <p className="text-sm text-red-600 mb-6">Error: {storyError.message}</p>
            )}
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
        <StoryEditor
          isOpen={isEditing}
          onClose={handleCancelEdit}
          onSave={handleStoryUpdated}
          familyMembers={familyMembers}
          existingStory={story || undefined}
        />
        {!isEditing && (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
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
                        By {authorName}
                      </div>
                    </div>
                  </div>
                </div>
                {canEditStory(story.authorId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Story
                  </Button>
                )}
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
                <div 
                  className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(story.content) }}
                />
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
                  {story.relatedMembers.map(member => {
                    const memberName = member.familyMember 
                      ? `${member.familyMember.firstName} ${member.familyMember.lastName}`.trim()
                      : 'Unknown Member';
                    return (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className={getRoleColor(member.role)}
                      >
                        {memberName}
                        <span className="ml-1 text-xs opacity-75">({member.role})</span>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location */}
          {(story.location || (story.lat && story.lng)) && (
            <Card className="shadow-sm border-heritage-purple/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {story.location && (
                    <p className="text-gray-700">{story.location}</p>
                  )}
                  {story.lat && story.lng && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Coordinates:</span> {story.lat.toFixed(6)}, {story.lng.toFixed(6)}
                    </div>
                  )}
                  {story.lat && story.lng && (
                    <div className="mt-3">
                      <a
                        href={`https://www.google.com/maps?q=${story.lat},${story.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-heritage-purple hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-4 w-4" />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media */}
          {story.media && story.media.length > 0 && (
            <Card className="shadow-sm border-heritage-purple/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Media ({story.media.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {story.media.map((media, index) => (
                    <MediaThumbnail
                      key={media.id}
                      media={media}
                      index={index}
                      imageUrls={imageUrls}
                      loadingImages={loadingImages}
                      onImageUrlLoaded={(mediaId, url) => {
                        setImageUrls(prev => ({ ...prev, [mediaId]: url }));
                      }}
                      onLoadingChange={(mediaId, loading) => {
                        setLoadingImages(prev => {
                          const next = new Set(prev);
                          if (loading) {
                            next.add(mediaId);
                          } else {
                            next.delete(mediaId);
                          }
                          return next;
                        });
                      }}
                      onClick={async () => {
                        const accessibleUrl = imageUrls[media.id] || (media.url ? await getAccessibleStorageUrl(media.url) : null);
                        setSelectedMedia({
                          id: media.id,
                          url: accessibleUrl || media.url || '',
                          caption: media.caption,
                          fileName: media.file_name,
                          media_type: media.media_type
                        });
                        setSelectedMediaIndex(index);
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Artifacts */}
          {story.artifacts && story.artifacts.length > 0 && (
            <Card className="shadow-sm border-heritage-purple/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Artifacts ({story.artifacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {story.artifacts.map(artifact => {
                    const getArtifactIcon = () => {
                      switch (artifact.artifactType) {
                        case 'document': return <FileText className="h-5 w-5" />;
                        case 'photo': return <ImageIcon className="h-5 w-5" />;
                        case 'letter': return <BookOpen className="h-5 w-5" />;
                        case 'certificate': return <Tag className="h-5 w-5" />;
                        case 'heirloom': return <Package className="h-5 w-5" />;
                        default: return <Package className="h-5 w-5" />;
                      }
                    };

                    const getArtifactTypeColor = () => {
                      switch (artifact.artifactType) {
                        case 'document': return 'bg-blue-100 text-blue-800 border-blue-200';
                        case 'photo': return 'bg-purple-100 text-purple-800 border-purple-200';
                        case 'letter': return 'bg-green-100 text-green-800 border-green-200';
                        case 'certificate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                        case 'heirloom': return 'bg-orange-100 text-orange-800 border-orange-200';
                        default: return 'bg-gray-100 text-gray-800 border-gray-200';
                      }
                    };

                    return (
                      <div
                        key={artifact.id}
                        className={`border rounded-lg p-4 ${getArtifactTypeColor()}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getArtifactIcon()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base mb-1">{artifact.name}</h4>
                            {artifact.description && (
                              <p className="text-sm opacity-90 mb-2">{artifact.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {artifact.artifactType && (
                                <Badge variant="secondary" className="text-xs">
                                  {artifact.artifactType}
                                </Badge>
                              )}
                              {artifact.dateCreated && (
                                <span className="opacity-75">
                                  Created: {new Date(artifact.dateCreated).toLocaleDateString()}
                                </span>
                              )}
                              {artifact.dateAcquired && (
                                <span className="opacity-75">
                                  Acquired: {new Date(artifact.dateAcquired).toLocaleDateString()}
                                </span>
                              )}
                              {artifact.condition && (
                                <span className="opacity-75">Condition: {artifact.condition}</span>
                              )}
                              {artifact.locationStored && (
                                <span className="opacity-75">Stored: {artifact.locationStored}</span>
                              )}
                            </div>
                            {artifact.media && artifact.media.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium mb-2 opacity-75">Artifact Media:</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {artifact.media.map(media => (
                                    <div
                                      key={media.id}
                                      className="relative border rounded overflow-hidden bg-white"
                                    >
                                      {media.media_type === 'image' && media.url ? (
                                        <img
                                          src={media.url}
                                          alt={media.caption || 'Artifact media'}
                                          className="w-full h-16 object-cover"
                                          onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            const nextElement = target.nextElementSibling as HTMLElement;
                                            target.style.display = 'none';
                                            if (nextElement) nextElement.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div 
                                        className="w-full h-16 flex items-center justify-center bg-gray-50"
                                        style={{ display: media.media_type === 'image' && media.url ? 'none' : 'flex' }}
                                      >
                                        <span className="text-sm">
                                          {media.media_type === 'image' ? '🖼️' : '📎'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
          </>
        )}

        {/* Enhanced Media Viewer Dialog */}
        <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
            {selectedMedia && story.media && (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="truncate">
                        {selectedMedia.caption || selectedMedia.fileName || 'Story Media'}
                      </DialogTitle>
                      {selectedMedia.fileName && (
                        <DialogDescription className="truncate">
                          {selectedMedia.fileName}
                          {story.media.length > 1 && (
                            <span className="ml-2 text-muted-foreground">
                              ({selectedMediaIndex + 1} of {story.media.length})
                            </span>
                          )}
                        </DialogDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedMedia(null)}
                      className="ml-4"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>

                <div className="relative flex items-center justify-center bg-black/5 min-h-[60vh] p-6">
                  {/* Navigation buttons for images */}
                  {selectedMedia.media_type === 'image' && story.media.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-4 z-10 bg-white/90 hover:bg-white shadow-lg"
                        onClick={() => {
                          const prevIndex = selectedMediaIndex > 0 
                            ? selectedMediaIndex - 1 
                            : story.media.length - 1;
                          const prevMedia = story.media[prevIndex];
                          const prevUrl = imageUrls[prevMedia.id] || prevMedia.url;
                          setSelectedMedia({
                            id: prevMedia.id,
                            url: prevUrl,
                            caption: prevMedia.caption,
                            fileName: prevMedia.file_name,
                            media_type: prevMedia.media_type
                          });
                          setSelectedMediaIndex(prevIndex);
                        }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 z-10 bg-white/90 hover:bg-white shadow-lg"
                        onClick={() => {
                          const nextIndex = selectedMediaIndex < story.media.length - 1 
                            ? selectedMediaIndex + 1 
                            : 0;
                          const nextMedia = story.media[nextIndex];
                          const nextUrl = imageUrls[nextMedia.id] || nextMedia.url;
                          setSelectedMedia({
                            id: nextMedia.id,
                            url: nextUrl,
                            caption: nextMedia.caption,
                            fileName: nextMedia.file_name,
                            media_type: nextMedia.media_type
                          });
                          setSelectedMediaIndex(nextIndex);
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  )}

                  {selectedMedia.media_type === 'image' ? (
                    <div className="flex flex-col items-center space-y-4 w-full">
                      <div className="relative w-full flex items-center justify-center">
                        <img
                          src={selectedMedia.url}
                          alt={selectedMedia.caption || selectedMedia.fileName || 'Story media'}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
                          onError={async (e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const signedUrl = await getAccessibleStorageUrl(selectedMedia.url);
                            if (signedUrl && signedUrl !== selectedMedia.url) {
                              target.src = signedUrl;
                            }
                          }}
                        />
                      </div>
                      
                      {selectedMedia.caption && (
                        <div className="w-full text-center">
                          <p className="text-sm text-gray-700 bg-white/80 rounded-lg px-4 py-2 inline-block">
                            {selectedMedia.caption}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedMedia.url) {
                              window.open(selectedMedia.url, '_blank');
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedMedia.url) {
                              const link = document.createElement('a');
                              link.href = selectedMedia.url;
                              link.download = selectedMedia.fileName || 'media';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 w-full">
                      <div className="flex flex-col items-center space-y-4">
                        <FileText className="h-16 w-16 text-gray-400" />
                        <div>
                          <p className="text-lg font-medium mb-2">
                            {selectedMedia.fileName || 'File'}
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Preview not available for this file type
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (selectedMedia.url) {
                                window.open(selectedMedia.url, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Open in New Tab
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (selectedMedia.url) {
                                const link = document.createElement('a');
                                link.href = selectedMedia.url;
                                link.download = selectedMedia.fileName || 'file';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Thumbnail strip for navigation */}
                {story.media.length > 1 && (
                  <div className="px-6 py-4 border-t bg-gray-50">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {story.media.map((media, idx) => {
                        const thumbUrl = imageUrls[media.id] || media.url;
                        const isSelected = idx === selectedMediaIndex;
                        return (
                          <button
                            key={media.id}
                            onClick={() => {
                              setSelectedMedia({
                                id: media.id,
                                url: thumbUrl,
                                caption: media.caption,
                                fileName: media.file_name,
                                media_type: media.media_type
                              });
                              setSelectedMediaIndex(idx);
                            }}
                            className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                              isSelected 
                                ? 'border-heritage-purple ring-2 ring-heritage-purple/20' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {media.media_type === 'image' && thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={media.caption || media.file_name || 'Thumbnail'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <FileText className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default StoryDetailPage;
