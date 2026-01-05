import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { FamilyStory } from '@/types/stories';
import { UserProfile } from '@/types';

interface StoriesTabProps {
  stories: FamilyStory[];
  users: UserProfile[];
  searchQuery: string;
  onDelete: (storyId: string, storyTitle: string) => Promise<void>;
}

/**
 * Helper function to get creator display name
 */
const getCreatorName = (authorId: string | undefined, users: UserProfile[]): string => {
  if (!authorId) return 'Unknown';
  const creator = users.find(user => user.id === authorId);
  return creator?.displayName || creator?.id.substring(0, 8) || 'Unknown';
};

/**
 * Stories management tab component
 */
export const StoriesTab: React.FC<StoriesTabProps> = ({
  stories,
  users,
  searchQuery,
  onDelete,
}) => {
  const navigate = useNavigate();

  const filteredStories = useMemo(() => {
    if (!searchQuery) return stories;
    const query = searchQuery.toLowerCase();
    return stories.filter(story => 
      story.title.toLowerCase().includes(query) ||
      story.content?.toLowerCase().includes(query)
    );
  }, [stories, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stories Management</CardTitle>
        <CardDescription>
          View and manage all family stories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredStories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No stories found matching your search.' : 'No stories found.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStories.map((story) => (
                <TableRow key={story.id}>
                  <TableCell>
                    <div className="font-medium">{story.title}</div>
                    {story.content && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {story.content.substring(0, 100)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {story.date ? new Date(story.date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getCreatorName(story.authorId, users)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {story.relatedMembers?.length || 0} members
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/story/${story.id}`)}
                        aria-label={`Edit story ${story.title}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            aria-label={`Delete story ${story.title}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Story</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{story.title}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(story.id, story.title)}
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
  );
};

