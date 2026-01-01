import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import { FamilyMember } from '@/types';
import { getFamilyMembers, updateFamilyMemberAvatar, updateFamilyMember } from '@/services/supabaseService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Edit, 
  Camera, 
  Image as ImageIcon, 
  Save, 
  X, 
  Plus,
  User,
  Heart,
  Baby,
  Users2,
  Trash2,
  Upload,
  RefreshCw,
  Clock,
  Download
} from 'lucide-react';
import { getYearRange } from "@/utils/dateUtils";
import ImageUpload from '@/components/ui/image-upload';
import MediaManager from '@/components/media/MediaManager';
import { MediaItem } from '@/services/mediaService';
import { toast } from '@/hooks/use-toast';
import { getAccessibleStorageUrl } from '@/utils/storageUrl';
import AddRelationshipDialog from '@/components/family/AddRelationshipDialog';
import FamilyMemberActions from '@/components/family/FamilyMemberActions';
import NewFamilyTab from '@/components/family/NewFamilyTab';
import Timeline from '@/components/stories/Timeline';
import { useMemberTimeline } from '@/hooks/useTimeline';

const FamilyMemberDetailPage = () => {
  const { user, isLoading: authLoading, canWrite } = useAuth();
  const { canEditFamilyMember } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [relatedMembers, setRelatedMembers] = useState<{[key: string]: FamilyMember[]}>({
    parents: [],
    children: [],
    siblings: [],
    spouses: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    bio: '',
    currentLocation: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAddRelationshipOpen, setIsAddRelationshipOpen] = useState(false);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<'parent' | 'child' | 'spouse' | 'sibling'>('parent');

  // Timeline functionality
  const { timeline, isLoading: timelineLoading, error: timelineError } = useMemberTimeline(id || '');
  const [activeTab, setActiveTab] = useState('profile');

  // Handle URL hash for timeline tab
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#timeline') {
      setActiveTab('timeline');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        console.log('🔄 Loading member data for ID:', id);
        const allMembers = await getFamilyMembers();
        const currentMember = allMembers.find(m => m.id === id);
        
        if (!currentMember) {
          console.error('❌ Member not found');
          return;
        }
        
        console.log('✅ Member loaded:', {
          id: currentMember.id,
          name: `${currentMember.firstName} ${currentMember.lastName}`,
          avatar: currentMember.avatar || 'no avatar'
        });
        
        setMember(currentMember);
        
        // Populate edit form with current member data
        setEditForm({
          firstName: currentMember.firstName || '',
          lastName: currentMember.lastName || '',
          birthDate: currentMember.birthDate || '',
          deathDate: currentMember.deathDate || '',
          birthPlace: currentMember.birthPlace || '',
          bio: currentMember.bio || '',
          currentLocation: currentMember.currentLocation?.description || ''
        });
        
        // Get related members by relation type
        const parents: FamilyMember[] = [];
        const children: FamilyMember[] = [];
        const siblings: FamilyMember[] = [];
        const spouses: FamilyMember[] = [];
        
        currentMember.relations.forEach(relation => {
          const relatedMember = allMembers.find(m => m.id === relation.personId);
          if (relatedMember) {
            switch(relation.type) {
              case 'parent':
                parents.push(relatedMember);
                break;
              case 'child':
                children.push(relatedMember);
                break;
              case 'sibling':
                siblings.push(relatedMember);
                break;
              case 'spouse':
                spouses.push(relatedMember);
                break;
            }
          }
        });
        
        setRelatedMembers({
          parents,
          children,
          siblings,
          spouses
        });
        
      } catch (error) {
        console.error('Error loading member data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      loadData();
    }
  }, [id, user]);

  // Refresh data when page comes back into focus (e.g., after navigating away and back)
  // Only refresh if data might be stale (avoid unnecessary refreshes)
  useEffect(() => {
    let lastRefreshTime = Date.now();
    const STALE_THRESHOLD = 1000 * 60 * 2; // 2 minutes - only refresh if data is older than this

    const handleFocus = () => {
      // Only refresh if we have a member and enough time has passed since last refresh
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      if (id && user && member && timeSinceLastRefresh > STALE_THRESHOLD) {
        console.log('🔄 Page focused, refreshing member data...');
        const refreshData = async () => {
          try {
            // Don't set loading state - just update in background
            const allMembers = await getFamilyMembers();
            const currentMember = allMembers.find(m => m.id === id);
            if (currentMember) {
              console.log('✅ Refreshed member data:', {
                id: currentMember.id,
                avatar: currentMember.avatar || 'no avatar'
              });
              setMember(currentMember);
              lastRefreshTime = Date.now();
            }
          } catch (error) {
            console.error('Error refreshing data on focus:', error);
            // Don't show error to user - this is a background refresh
          }
        };
        refreshData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id, user, member]);
  
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

  const handleEditClick = () => {
    if (member) {
      navigate(`/edit-family-member/${member.id}`);
    }
  };

  const handleAddRelation = (type: 'parent' | 'child' | 'spouse' | 'sibling') => {
    setSelectedRelationshipType(type);
    setIsAddRelationshipOpen(true);
  };

  // Map plural relationship types to singular for database
  const mapPluralToSingular = (pluralType: string): 'parent' | 'child' | 'spouse' | 'sibling' => {
    switch (pluralType) {
      case 'parents': return 'parent';
      case 'children': return 'child';
      case 'spouses': return 'spouse';
      case 'siblings': return 'sibling';
      default: return 'parent'; // fallback
    }
  };

  const handleRelationshipAdded = async () => {
    // Reload the member data to show the new relationship
    if (id) {
      try {
        console.log('🔄 Reloading member data after relationship addition...');
        
        // Force a fresh fetch by adding a timestamp to bypass any caching
        const allMembers = await getFamilyMembers();
        console.log('📊 All members loaded:', allMembers.length);
        
        const updatedMember = allMembers.find(m => m.id === id);
        console.log('👤 Updated member found:', updatedMember?.firstName, updatedMember?.lastName);
        console.log('🔗 Member relations:', updatedMember?.relations);
        
        if (updatedMember) {
          setMember(updatedMember);
          
          // Update related members
          const parents: FamilyMember[] = [];
          const children: FamilyMember[] = [];
          const siblings: FamilyMember[] = [];
          const spouses: FamilyMember[] = [];
          
          updatedMember.relations.forEach(relation => {
            const relatedMember = allMembers.find(m => m.id === relation.personId);
            console.log(`🔍 Processing relation: ${relation.type} -> ${relatedMember?.firstName} ${relatedMember?.lastName}`);
            if (relatedMember) {
              switch(relation.type) {
                case 'parent':
                  parents.push(relatedMember);
                  break;
                case 'child':
                  children.push(relatedMember);
                  break;
                case 'sibling':
                  siblings.push(relatedMember);
                  break;
                case 'spouse':
                  spouses.push(relatedMember);
                  break;
              }
            }
          });
          
          console.log('👨‍👩‍👧‍👦 Updated related members:', { parents: parents.length, children: children.length, siblings: siblings.length, spouses: spouses.length });
          
          setRelatedMembers({
            parents,
            children,
            siblings,
            spouses
          });
          
          // Show success message
          toast({
            title: "Family Updated",
            description: `Relationships refreshed. Found ${parents.length} parents, ${children.length} children, ${siblings.length} siblings, ${spouses.length} spouses.`,
          });
        } else {
          console.error('❌ Updated member not found!');
          toast({
            title: "Error",
            description: "Could not find updated member data.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error reloading member data:', error);
        toast({
          title: "Error",
          description: "Failed to refresh family data. Please refresh the page.",
          variant: "destructive"
        });
      }
    }
  };

  const handleMemberDeleted = async () => {
    console.log('🔄 Reloading member data after member deletion...');
    await handleRelationshipAdded(); // Reuse the same logic
  };

  const handleRelationshipRemoved = async () => {
    console.log('🔄 Reloading member data after relationship removal...');
    await handleRelationshipAdded(); // Reuse the same logic
  };

  const handleImageUpload = async (imageUrl: string) => {
    if (!member || !id) return;
    
    console.log('📸 Handling image upload for member:', member.id, 'URL:', imageUrl);
    
    if (!imageUrl) {
      console.warn('⚠️  Empty image URL provided, clearing avatar');
      const success = await updateFamilyMemberAvatar(member.id, '');
      if (success) {
        setMember(prev => prev ? { ...prev, avatar: '' } : null);
      }
      return;
    }
    
    const success = await updateFamilyMemberAvatar(member.id, imageUrl);
    if (success) {
      console.log('✅ Avatar update successful, updating local state with URL:', imageUrl);
      // Update local state immediately for instant feedback
      setMember(prev => prev ? { ...prev, avatar: imageUrl } : null);
      
      // Also refresh data from database to ensure consistency
      try {
        console.log('🔄 Refreshing member data after avatar update...');
        const allMembers = await getFamilyMembers();
        const updatedMember = allMembers.find(m => m.id === id);
        
        if (updatedMember) {
          console.log('✅ Updated member data - avatar URL:', updatedMember.avatar);
          console.log('   Member ID:', updatedMember.id);
          console.log('   Avatar matches:', updatedMember.avatar === imageUrl);
          setMember(updatedMember);
        } else {
          console.warn('⚠️  Updated member not found in fresh data');
        }
      } catch (error) {
        console.error('❌ Error refreshing member data:', error);
        // Don't fail the upload if refresh fails - we already updated local state
      }
    } else {
      console.error('❌ Avatar update failed');
    }
  };

  const handleMediaSelect = (media: MediaItem) => {
    setSelectedMedia(media);
    // Just select the media - don't automatically set as avatar
    // User can explicitly choose to set it as avatar via the viewer dialog
  };

  const handleSetAsAvatar = async () => {
    if (!selectedMedia || selectedMedia.mediaType !== 'image') return;
    await handleImageUpload(selectedMedia.url);
    setSelectedMedia(null); // Close the dialog after setting avatar
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing && member) {
      // Populate form with current data when starting to edit
      setEditForm({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        birthDate: member.birthDate || '',
        deathDate: member.deathDate || '',
        birthPlace: member.birthPlace || '',
        bio: member.bio || '',
        currentLocation: member.currentLocation?.description || ''
      });
    }
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!member) return;
    
    setIsSaving(true);
    try {
      const memberData = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        birthDate: editForm.birthDate || undefined,
        deathDate: editForm.deathDate || undefined,
        birthPlace: editForm.birthPlace || undefined,
        bio: editForm.bio || undefined,
        gender: member.gender,
      };

      const location = editForm.currentLocation ? {
        description: editForm.currentLocation,
        lat: member.currentLocation?.lat || 0,
        lng: member.currentLocation?.lng || 0,
      } : undefined;

      const updatedMember = await updateFamilyMember(member.id, memberData, location);
      
      if (updatedMember) {
        setMember(updatedMember);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Family member updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: "Error",
        description: "Failed to update family member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    if (member) {
      setEditForm({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        birthDate: member.birthDate || '',
        deathDate: member.deathDate || '',
        birthPlace: member.birthPlace || '',
        bio: member.bio || '',
        currentLocation: member.currentLocation?.description || ''
      });
    }
  };

  return (
    <MobileLayout 
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || '' 
      }}
      showBackButton
      title={member ? `${member.firstName} ${member.lastName}` : 'Family Member'}
    >
      {isLoading ? (
        <div className="flex h-[60vh] items-center justify-center">
          <div className="animate-pulse text-heritage-purple">Loading...</div>
        </div>
      ) : member ? (
        <div className="h-full flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-auto">
              <TabsTrigger value="profile" className="text-sm py-2 px-4">Profile</TabsTrigger>
              <TabsTrigger value="family" className="text-sm py-2 px-4">Family</TabsTrigger>
              <TabsTrigger value="timeline" className="text-sm py-2 px-4 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="media" className="text-sm py-2 px-4">Media</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="flex-1 overflow-auto">
              <div className="p-6 pb-20 space-y-8">
                {/* Header with Avatar and Basic Info */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ImageUpload
                      key={`${member.id}-${member.avatar || 'no-avatar'}`} // Force remount when member or avatar changes
                      currentImage={member.avatar}
                      onImageUploaded={handleImageUpload}
                      size="lg"
                      className="mb-4"
                    />
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={() => {/* Focus on image upload */}}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="w-full max-w-sm space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editForm.firstName}
                          onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                          placeholder="First name"
                          className="text-center font-semibold"
                        />
                        <Input
                          value={editForm.lastName}
                          onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                          placeholder="Last name"
                          className="text-center font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <h1 className="text-2xl font-serif font-semibold">
                      {member.firstName} {member.lastName}
                    </h1>
                  )}
                  
                  <div className="flex items-center text-sm text-heritage-neutral mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={editForm.birthDate}
                          onChange={(e) => handleEditFormChange('birthDate', e.target.value)}
                          className="text-xs w-32"
                        />
                        <span>-</span>
                        <Input
                          type="date"
                          value={editForm.deathDate}
                          onChange={(e) => handleEditFormChange('deathDate', e.target.value)}
                          className="text-xs w-32"
                        />
                      </div>
                    ) : (
                      <span>{getYearRange(member.birthDate, member.deathDate)}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-heritage-neutral mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {isEditing ? (
                      <Input
                        value={editForm.currentLocation}
                        onChange={(e) => handleEditFormChange('currentLocation', e.target.value)}
                        placeholder="Current location"
                        className="text-xs w-48"
                      />
                    ) : (
                      <span>{member.currentLocation?.description || 'No location set'}</span>
                    )}
                  </div>
                  
                  {/* Edit Controls */}
                  {canWrite && (
                    <div className="flex gap-2 mt-4">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditToggle}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Biography Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Biography
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editForm.bio}
                        onChange={(e) => handleEditFormChange('bio', e.target.value)}
                        placeholder="Tell us about this person's life, achievements, and story..."
                        className="min-h-[120px] resize-none"
                      />
                    ) : (
                      <p className="text-sm text-heritage-dark">
                        {member.bio || 'No biography available. Click "Edit Details" to add one.'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-heritage-dark">Birth Place</label>
                      {isEditing ? (
                        <Input
                          value={editForm.birthPlace}
                          onChange={(e) => handleEditFormChange('birthPlace', e.target.value)}
                          placeholder="City, Country"
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm text-heritage-neutral mt-1">
                          {member.birthPlace || 'Not specified'}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {member.gender}
                      </Badge>
                      {member.deathDate && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Deceased
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* View Family Tree Button */}
                <Button 
                  className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
                  onClick={() => navigate('/family-tree')}
                >
                  View Family Tree
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="family" className="flex-1 overflow-auto">
              <div className="p-6">
                <NewFamilyTab 
                  currentMember={member!}
                  onMemberChanged={handleRelationshipAdded}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="flex-1 overflow-auto">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-heritage-dark mb-2">
                    {member.firstName} {member.lastName}'s Timeline
                  </h2>
                  <p className="text-muted-foreground">
                    Stories, events, and milestones in chronological order
                  </p>
                </div>
                
                {timelineError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">
                      Error loading timeline: {timelineError}
                    </p>
                  </div>
                )}
                
                <Timeline
                  timeline={timeline || []}
                  isLoading={timelineLoading}
                  onItemClick={(item) => {
                    console.log('Timeline item clicked:', item);
                    // You can add navigation to story detail or other actions here
                  }}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="flex-1 flex flex-col">
              <div className="p-6 flex-1">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Photos & Media
                    </h2>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {/* Open media upload */}}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  <p className="text-sm text-heritage-neutral">
                    Manage photos and documents for {member.firstName} {member.lastName}
                  </p>
                </div>
                
                <MediaManager 
                  onSelectMedia={handleMediaSelect}
                  selectedMediaId={selectedMedia?.id}
                  filterByType="image"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-heritage-neutral">Family member not found</p>
          <Button 
            className="mt-4 bg-heritage-purple hover:bg-heritage-purple-medium"
            onClick={() => navigate('/family-tree')}
          >
            Go to Family Tree
          </Button>
        </div>
      )}

      {/* Add Relationship Dialog */}
      {member && (
        <AddRelationshipDialog
          isOpen={isAddRelationshipOpen}
          onClose={() => setIsAddRelationshipOpen(false)}
          currentMember={member}
          relationshipType={selectedRelationshipType}
          onRelationshipAdded={handleRelationshipAdded}
        />
      )}

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMedia?.caption || selectedMedia?.fileName || 'Media'}
            </DialogTitle>
            {selectedMedia?.caption && (
              <DialogDescription>
                {selectedMedia.fileName}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              {selectedMedia.mediaType === 'image' ? (
                <div className="flex flex-col items-center space-y-4">
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.caption || selectedMedia.fileName || 'Media'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    onError={async (e) => {
                      // Try to get signed URL if public URL fails
                      const signedUrl = await getAccessibleStorageUrl(selectedMedia.url);
                      if (signedUrl && signedUrl !== selectedMedia.url) {
                        (e.currentTarget as HTMLImageElement).src = signedUrl;
                      }
                    }}
                  />
                  <div className="flex gap-2 w-full justify-center">
                    <Button
                      onClick={handleSetAsAvatar}
                      className="bg-heritage-purple hover:bg-heritage-purple-medium"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Set as Profile Image
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedMedia.url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Preview not available for this media type</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.open(selectedMedia.url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
              {selectedMedia.fileSize && (
                <p className="text-sm text-muted-foreground text-center">
                  Size: {(selectedMedia.fileSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default FamilyMemberDetailPage;
