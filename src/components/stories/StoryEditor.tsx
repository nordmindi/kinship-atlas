import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, 
  X, 
  Plus, 
  User, 
  Calendar, 
  FileText,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FamilyMember } from '@/types';
import { useFamilyTree } from '@/contexts/FamilyTreeContext';
import { CreateStoryRequest, UpdateStoryRequest, FamilyStory } from '@/types/stories';
import { storyService } from '@/services/storyService';
import LocationPicker from './LocationPicker';
import ArtifactManager from './ArtifactManager';

const storySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  date: z.string().optional()
  // Note: relatedMembers is managed in separate state, not in form
});

type StoryFormValues = z.infer<typeof storySchema>;

interface StoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (story: FamilyStory) => void;
  familyMembers: FamilyMember[];
  existingStory?: FamilyStory;
  createStory?: (request: CreateStoryRequest) => Promise<{ success: boolean; story?: FamilyStory; error?: string }>;
  updateStory?: (request: UpdateStoryRequest) => Promise<{ success: boolean; story?: FamilyStory; error?: string }>;
}

const StoryEditor: React.FC<StoryEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  familyMembers,
  existingStory,
  createStory: hookCreateStory,
  updateStory: hookUpdateStory
}) => {
  // Note: FamilyTreeContext doesn't provide family members, we use the passed prop instead
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Array<{
    familyMemberId: string;
    role: 'protagonist' | 'witness' | 'narrator' | 'participant';
  }>>([]);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [uploadedMediaPreview, setUploadedMediaPreview] = useState<Array<{ id: string; url: string; fileName?: string }>>([]);
  const [showWritingTips, setShowWritingTips] = useState(false);
  const [location, setLocation] = useState<{ location?: string; lat?: number; lng?: number }>({});
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);

  const form = useForm<StoryFormValues>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      title: '',
      content: '',
      date: ''
    }
  });


  useEffect(() => {
    if (isOpen) {
      if (existingStory) {
        form.reset({
          title: existingStory.title,
          content: existingStory.content,
          date: existingStory.date || ''
        });
        setSelectedMembers(existingStory.relatedMembers.map(member => ({
          familyMemberId: member.familyMemberId,
          role: member.role
        })));
        setLocation({
          location: existingStory.location,
          lat: existingStory.lat,
          lng: existingStory.lng
        });
        setSelectedArtifactIds(existingStory.artifacts?.map(a => a.id) || []);
        // Set media previews
        if (existingStory.media && existingStory.media.length > 0) {
          setUploadedMedia(existingStory.media.map(m => m.id));
          setUploadedMediaPreview(existingStory.media.map(m => ({
            id: m.id,
            url: m.url,
            fileName: m.file_name || 'media'
          })));
        }
      } else {
        form.reset({
          title: '',
          content: '',
          date: ''
        });
        setSelectedMembers([]);
        setLocation({});
        setSelectedArtifactIds([]);
        setUploadedMedia([]);
        setUploadedMediaPreview([]);
      }
      // Ensure we have latest members when opening
      const hasMembers = familyMembers && familyMembers.length > 0;
      if (!hasMembers) {
        console.warn('No family members available for story creation');
      }
    }
  }, [isOpen, existingStory, form, familyMembers]);

  const addMember = (memberId: string) => {
    if (!selectedMembers.find(m => m.familyMemberId === memberId)) {
      const newMember = {
        familyMemberId: memberId,
        role: 'participant' as const
      };
      setSelectedMembers(prev => [...prev, newMember]);
    }
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.familyMemberId !== memberId));
  };

  const updateMemberRole = (memberId: string, role: 'protagonist' | 'witness' | 'narrator' | 'participant') => {
    setSelectedMembers(prev => 
      prev.map(m => 
        m.familyMemberId === memberId ? { ...m, role } : m
      )
    );
  };

  const handleFileUpload = async (file: File) => {
    try {
      const result = await storyService.uploadMedia({
        file,
        altText: file.name
      });

      if (result.success && result.media) {
        setUploadedMedia(prev => [...prev, result.media!.id]);
        setUploadedMediaPreview(prev => [
          ...prev,
          { id: result.media!.id, url: result.media!.url, fileName: result.media!.file_name || file.name }
        ]);
        toast({
          title: 'Media uploaded',
          description: 'File uploaded successfully'
        });
      } else {
        toast({
          title: 'Upload failed',
          description: result.error || 'Failed to upload file',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  const removeUploadedMedia = (mediaId: string) => {
    setUploadedMedia(prev => prev.filter(id => id !== mediaId));
    setUploadedMediaPreview(prev => prev.filter(m => m.id !== mediaId));
  };

  const onSubmit = async (values: StoryFormValues) => {
    if (selectedMembers.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one family member',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const request = {
        title: values.title,
        content: values.content,
        date: values.date || undefined,
        location: location.location,
        lat: location.lat,
        lng: location.lng,
        relatedMembers: selectedMembers,
        mediaIds: uploadedMedia,
        artifactIds: selectedArtifactIds.length > 0 ? selectedArtifactIds : undefined
      };

      let result;
      if (existingStory) {
        if (hookUpdateStory) {
          result = await hookUpdateStory({
            id: existingStory.id,
            ...request
          });
        } else {
          result = await storyService.updateStory({
            id: existingStory.id,
            ...request
          });
        }
      } else {
        if (hookCreateStory) {
          result = await hookCreateStory(request);
        } else {
          result = await storyService.createStory(request);
        }
      }

      if (result.success && result.story) {
        toast({
          title: existingStory ? 'Story updated' : 'Story created',
          description: 'Your story has been saved successfully'
        });
        onSave(result.story);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save story',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveMembers: FamilyMember[] = familyMembers || [];
  const availableMembers = effectiveMembers.filter(
    member => !selectedMembers.find(m => m.familyMemberId === member.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {existingStory ? 'Edit Story' : 'Create New Story'}
          </DialogTitle>
          <DialogDescription>
            {existingStory 
              ? 'Update the story details and participants'
              : 'Share a family story, memory, or historical event'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter story title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Story Content</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowWritingTips(!showWritingTips)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <HelpCircle className="h-4 w-4 mr-1" />
                      Writing Tips
                      {showWritingTips ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>
                  
                  {showWritingTips && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-3">Story Writing Guide</h4>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Essential biographical details</h5>
                          <ul className="space-y-1 text-blue-700 ml-4">
                            <li>• <strong>Basic facts:</strong> Birth, death, and burial dates and locations</li>
                            <li>• <strong>Family:</strong> Spouses, children, and siblings</li>
                            <li>• <strong>Education:</strong> Where and what they studied</li>
                            <li>• <strong>Occupation:</strong> Their jobs and other professional roles</li>
                            <li>• <strong>Residence:</strong> Where they lived throughout their life</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Narrative and historical context</h5>
                          <ul className="space-y-1 text-blue-700 ml-4">
                            <li>• <strong>Life story:</strong> Weave a narrative, not just a list of facts. Include personal anecdotes, milestones, and the story of their migration or movements</li>
                            <li>• <strong>Historical backdrop:</strong> Place your ancestor in the context of their time. Mention significant historical events, social conditions, or political circumstances that may have influenced their life</li>
                            <li>• <strong>Personality:</strong> Add details that reveal personality, such as their interests, sense of humor, or unique traits</li>
                          </ul>
                        </div>
                        
                        <div className="text-blue-600 text-xs italic">
                          💡 Tip: Start with the most important or interesting aspects of their life, then fill in the details. Don't worry about perfect grammar - focus on capturing their story authentically.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <FormControl>
                    <Textarea
                      placeholder="Tell your story here..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Family Members Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Family Members
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-6">
                {selectedMembers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Selected Members:</h4>
                    {selectedMembers.map(member => {
                      const familyMember = effectiveMembers.find(fm => fm.id === member.familyMemberId);
                      return (
                        <div key={member.familyMemberId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="flex-1">
                            {familyMember?.firstName} {familyMember?.lastName}
                          </span>
                          <Select
                            value={member.role}
                            onValueChange={(value: 'protagonist' | 'witness' | 'narrator' | 'participant') => 
                              updateMemberRole(member.familyMemberId, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="protagonist">Protagonist</SelectItem>
                              <SelectItem value="witness">Witness</SelectItem>
                              <SelectItem value="narrator">Narrator</SelectItem>
                              <SelectItem value="participant">Participant</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(member.familyMemberId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium">Add Family Members:</h4>
                  {availableMembers.length > 0 ? (
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <Select onValueChange={(val: string) => addMember(val)}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select a member to add" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMembers.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Selecting a person will add them to this story as a participant (role can be changed above).</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No more family members available to add.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Media (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload photos, documents, or other media
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files) {
                        Array.from(e.target.files).forEach(handleFileUpload);
                      }
                    }}
                    className="hidden"
                    id="media-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('media-upload')?.click()}
                  >
                    Choose Files
                  </Button>
                </div>

                {uploadedMediaPreview.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {uploadedMediaPreview.map(m => (
                      <div key={m.id} className="relative group border rounded-md overflow-hidden">
                        <img src={m.url} alt={m.fileName || 'uploaded media'} className="w-full h-24 object-cover" />
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                          <Button type="button" size="icon" variant="destructive" onClick={() => removeUploadedMedia(m.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Picker */}
            <LocationPicker
              location={location.location}
              lat={location.lat}
              lng={location.lng}
              onLocationChange={setLocation}
            />

            {/* Artifact Manager */}
            <ArtifactManager
              selectedArtifactIds={selectedArtifactIds}
              onArtifactsChange={setSelectedArtifactIds}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : (existingStory ? 'Update Story' : 'Create Story')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StoryEditor;
