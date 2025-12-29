import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Music, 
  Video, 
  Trash2, 
  Edit3, 
  Download,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { MediaItem, MediaUpload, uploadMedia, getUserMedia, deleteMedia, updateMediaCaption } from '@/services/mediaService';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface MediaManagerProps {
  onSelectMedia?: (media: MediaItem) => void;
  selectedMediaId?: string;
  showUploadButton?: boolean;
  filterByType?: 'image' | 'document' | 'audio' | 'video';
}

const MediaManager: React.FC<MediaManagerProps> = ({
  onSelectMedia,
  selectedMediaId,
  showUploadButton = true,
  filterByType
}) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load media items
  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const media = await getUserMedia();
      setMediaItems(media);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load media on component mount
  React.useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Validate file sizes before uploading
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles: string[] = [];
    
    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        invalidFiles.push(`${file.name} (${fileSizeMB}MB)`);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'File too large',
        description: `The following files exceed the 5MB limit: ${invalidFiles.join(', ')}. Please compress or resize them.`,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    const uploadPromises: Promise<MediaItem | null>[] = [];

    Array.from(files).forEach(file => {
      // Determine media type based on file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      let mediaType: 'image' | 'document' | 'audio' | 'video' = 'document';
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
        mediaType = 'image';
      } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')) {
        mediaType = 'audio';
      } else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension || '')) {
        mediaType = 'video';
      }

      const upload: MediaUpload = {
        file,
        mediaType,
        caption: file.name
      };

      uploadPromises.push(uploadMedia(upload));
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((item): item is MediaItem => item !== null);
      
      if (successfulUploads.length > 0) {
        setMediaItems(prev => [...successfulUploads, ...prev]);
        toast({
          title: "Success",
          description: `${successfulUploads.length} file(s) uploaded successfully.`
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    handleFileUpload(event.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Handle media deletion
  const handleDeleteMedia = async (mediaId: string) => {
    const success = await deleteMedia(mediaId);
    if (success) {
      setMediaItems(prev => prev.filter(item => item.id !== mediaId));
    }
  };

  // Handle caption editing
  const handleEditCaption = async () => {
    if (!editingMedia) return;

    const success = await updateMediaCaption(editingMedia.id, editCaption);
    if (success) {
      setMediaItems(prev => prev.map(item => 
        item.id === editingMedia.id 
          ? { ...item, caption: editCaption }
          : item
      ));
      setEditingMedia(null);
      setEditCaption('');
    }
  };

  // Filter media items
  const filteredMedia = mediaItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || item.mediaType === selectedType;
    const matchesFilter = !filterByType || item.mediaType === filterByType;
    
    return matchesSearch && matchesType && matchesFilter;
  });

  // Get media type icon
  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Media Library</h2>
        {showUploadButton && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
          <option value="audio">Audio</option>
          <option value="video">Videos</option>
        </select>
      </div>

      {/* Upload Drop Zone */}
      {showUploadButton && (
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center mb-4 hover:border-muted-foreground/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click "Upload Media" to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports images, videos, audio, and documents (max 5MB per file)
          </p>
        </div>
      )}

      {/* Media Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No media found</p>
            {showUploadButton && (
              <p className="text-sm">Upload some files to get started</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedMediaId === item.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelectMedia?.(item)}
              >
                <CardContent className="p-3">
                  <div className="aspect-square mb-2 bg-muted rounded-md overflow-hidden relative">
                    {item.mediaType === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.caption || item.fileName || 'Media'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getMediaTypeIcon(item.mediaType)}
                      </div>
                    )}
                    
                    {/* Media type badge */}
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs"
                    >
                      {item.mediaType}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium truncate">
                      {item.caption || item.fileName || 'Untitled'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    {item.fileSize && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.fileSize)}
                      </p>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMedia(item);
                          setEditCaption(item.caption || '');
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Media</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this media item? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteMedia(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.url, '_blank');
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Caption Dialog */}
      <Dialog open={!!editingMedia} onOpenChange={() => setEditingMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              placeholder="Enter caption..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingMedia(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditCaption}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaManager;
