import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Package, 
  Plus, 
  X, 
  FileText, 
  Image as ImageIcon,
  Upload,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { storyService } from '@/services/storyService';
import { Artifact, CreateArtifactRequest } from '@/types/stories';
import { getUserMedia, MediaItem } from '@/services/mediaService';
import MediaManager from '@/components/media/MediaManager';

interface ArtifactManagerProps {
  selectedArtifactIds: string[];
  onArtifactsChange: (artifactIds: string[]) => void;
}

const artifactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  description: z.string().optional(),
  artifactType: z.enum(['document', 'heirloom', 'photo', 'letter', 'certificate', 'other']),
  dateCreated: z.string().optional(),
  dateAcquired: z.string().optional(),
  condition: z.string().optional(),
  locationStored: z.string().optional(),
});

type ArtifactFormValues = z.infer<typeof artifactSchema>;

const ArtifactManager: React.FC<ArtifactManagerProps> = ({
  selectedArtifactIds,
  onArtifactsChange
}) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const form = useForm<ArtifactFormValues>({
    resolver: zodResolver(artifactSchema),
    defaultValues: {
      name: '',
      description: '',
      artifactType: 'document',
      dateCreated: '',
      dateAcquired: '',
      condition: '',
      locationStored: '',
    }
  });

  useEffect(() => {
    loadArtifacts();
  }, []);

  const loadArtifacts = async () => {
    setIsLoading(true);
    try {
      const allArtifacts = await storyService.getAllArtifacts();
      setArtifacts(allArtifacts);
    } catch (error) {
      console.error('Error loading artifacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load artifacts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateArtifact = async (values: ArtifactFormValues) => {
    setIsSubmitting(true);
    try {
      const request: CreateArtifactRequest = {
        name: values.name,
        description: values.description || undefined,
        artifactType: values.artifactType,
        dateCreated: values.dateCreated || undefined,
        dateAcquired: values.dateAcquired || undefined,
        condition: values.condition || undefined,
        locationStored: values.locationStored || undefined,
        mediaIds: selectedMediaIds.length > 0 ? selectedMediaIds : undefined,
      };

      const result = await storyService.createArtifact(request);
      if (result.success && result.artifact) {
        toast({
          title: 'Success',
          description: 'Artifact created successfully'
        });
        form.reset();
        setSelectedMediaIds([]);
        setIsCreateDialogOpen(false);
        await loadArtifacts();
        // Automatically add to selected artifacts
        onArtifactsChange([...selectedArtifactIds, result.artifact.id]);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create artifact',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating artifact:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddArtifact = (artifactId: string) => {
    if (!selectedArtifactIds.includes(artifactId)) {
      onArtifactsChange([...selectedArtifactIds, artifactId]);
    }
  };

  const handleRemoveArtifact = (artifactId: string) => {
    onArtifactsChange(selectedArtifactIds.filter(id => id !== artifactId));
  };

  const selectedArtifacts = artifacts.filter(a => selectedArtifactIds.includes(a.id));
  const availableArtifacts = artifacts.filter(a => !selectedArtifactIds.includes(a.id));

  const getArtifactTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
      case 'certificate':
      case 'letter':
        return <FileText className="h-4 w-4" />;
      case 'photo':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getArtifactTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'heirloom':
        return 'bg-purple-100 text-purple-800';
      case 'photo':
        return 'bg-green-100 text-green-800';
      case 'letter':
        return 'bg-yellow-100 text-yellow-800';
      case 'certificate':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Artifacts (Optional)
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Artifact
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedArtifacts.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selected Artifacts:</Label>
            <div className="space-y-2">
              {selectedArtifacts.map(artifact => (
                <div
                  key={artifact.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getArtifactTypeIcon(artifact.artifactType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{artifact.name}</div>
                      {artifact.description && (
                        <div className="text-xs text-gray-600 truncate">{artifact.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getArtifactTypeColor(artifact.artifactType)}`}>
                          {artifact.artifactType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveArtifact(artifact.id);
                    }}
                    className="ml-2 hover:bg-red-50 hover:text-red-600"
                    title="Remove artifact"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableArtifacts.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Artifacts:</Label>
            <div className="space-y-2">
              {availableArtifacts.map(artifact => (
                <div
                  key={artifact.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getArtifactTypeIcon(artifact.artifactType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{artifact.name}</div>
                      {artifact.description && (
                        <div className="text-xs text-gray-600 truncate">{artifact.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getArtifactTypeColor(artifact.artifactType)}`}>
                          {artifact.artifactType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddArtifact(artifact.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && artifacts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No artifacts yet. Create one to get started.</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Loading artifacts...</p>
          </div>
        )}
      </CardContent>

      {/* Create Artifact Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Artifact</DialogTitle>
            <DialogDescription>
              Add a physical or digital artifact (document, heirloom, photo, etc.) to your collection
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateArtifact)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artifact Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Grandfather's Watch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="artifactType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select artifact type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="heirloom">Heirloom</SelectItem>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the artifact..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateCreated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Created</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateAcquired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Acquired</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Good, Excellent" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationStored"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Attic, Safe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Media Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Media (Optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMediaLibrary(true)}
                    className="flex-1"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Select from Library
                  </Button>
                </div>
                {selectedMediaIds.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      {selectedMediaIds.length} media item{selectedMediaIds.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setSelectedMediaIds([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Artifact'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Media Library Dialog */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Media for Artifact</DialogTitle>
            <DialogDescription>
              Choose existing media to attach to this artifact
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <MediaManager
              onSelectMedia={(media) => {
                if (!selectedMediaIds.includes(media.id)) {
                  setSelectedMediaIds(prev => [...prev, media.id]);
                }
              }}
              selectedMediaIds={selectedMediaIds}
              showUploadButton={false}
              multiSelect={true}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowMediaLibrary(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ArtifactManager;

