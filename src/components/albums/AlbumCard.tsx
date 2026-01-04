import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Image as ImageIcon, 
  Edit3, 
  Trash2,
  Users,
  User,
  BookOpen
} from 'lucide-react';
import type { Album } from '@/types/albums';
import { getAccessibleStorageUrl } from '@/utils/storageUrl';

interface AlbumCardProps {
  album: Album;
  onEdit: (album: Album) => void;
  onDelete: (album: Album) => void;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, onEdit, onDelete }) => {
  const [coverImageUrl, setCoverImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (album.coverMedia?.url) {
      getAccessibleStorageUrl(album.coverMedia.url).then(setCoverImageUrl).catch(() => {
        setCoverImageUrl(album.coverMedia!.url);
      });
    }
  }, [album.coverMedia]);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={album.name}
            className="w-full h-full object-cover"
            onError={() => setCoverImageUrl(null)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(album);
            }}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(album);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-sm truncate">{album.name}</h3>
        {album.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{album.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {album.familyGroups && album.familyGroups.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {album.familyGroups.length}
              </Badge>
            )}
            {album.familyMembers && album.familyMembers.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                {album.familyMembers.length}
              </Badge>
            )}
            {album.storyCategories && album.storyCategories.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {album.storyCategories.length}
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {album.mediaCount || 0} items
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlbumCard;

