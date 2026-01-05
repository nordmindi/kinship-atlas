import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Image, Video, Music, File } from 'lucide-react';
import { MediaItem } from '@/services/mediaService';

interface MediaTabProps {
  media: MediaItem[];
  searchQuery: string;
  editingMedia: MediaItem | null;
  mediaCaption: string;
  onEdit: (mediaItem: MediaItem) => void;
  onDelete: (mediaId: string) => Promise<void>;
  onUpdateCaption: () => Promise<void>;
  onSetEditingMedia: (media: MediaItem | null) => void;
  onSetMediaCaption: (caption: string) => void;
}

/**
 * Get icon for media type
 */
const getMediaIcon = (mediaType: string) => {
  switch (mediaType) {
    case 'image': return <Image className="h-4 w-4" />;
    case 'video': return <Video className="h-4 w-4" />;
    case 'audio': return <Music className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
  }
};

/**
 * Media management tab component
 */
export const MediaTab: React.FC<MediaTabProps> = ({
  media,
  searchQuery,
  editingMedia,
  mediaCaption,
  onEdit,
  onDelete,
  onUpdateCaption,
  onSetEditingMedia,
  onSetMediaCaption,
}) => {
  const filteredMedia = useMemo(() => {
    if (!searchQuery) return media;
    const query = searchQuery.toLowerCase();
    return media.filter(item => 
      (item.caption || '').toLowerCase().includes(query) ||
      (item.fileName || '').toLowerCase().includes(query)
    );
  }, [media, searchQuery]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Media Management</CardTitle>
          <CardDescription>
            View and manage all media items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMedia.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No media items found matching your search.' : 'No media items found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedia.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {getMediaIcon(item.mediaType)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.fileName || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{item.caption || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {item.fileSize ? `${(item.fileSize / 1024).toFixed(2)} KB` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                          aria-label={`Edit media ${item.fileName || item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              aria-label={`Delete media ${item.fileName || item.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Media</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this media item? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(item.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingMedia} onOpenChange={(open) => !open && onSetEditingMedia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update the caption for this media item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={mediaCaption}
                onChange={(e) => onSetMediaCaption(e.target.value)}
                placeholder="Enter caption..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onSetEditingMedia(null)}>
              Cancel
            </Button>
            <Button onClick={onUpdateCaption}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

