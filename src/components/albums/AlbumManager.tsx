import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Image as ImageIcon, 
  Users, 
  User, 
  BookOpen,
  Trash2,
  Edit3,
  Folder,
  FolderOpen
} from 'lucide-react';
import { albumService } from '@/services/albumService';
import { familyGroupService } from '@/services/familyGroupService';
import { getFamilyMembers } from '@/services/supabaseService';
import type { Album, CreateAlbumRequest, StoryCategory } from '@/types/albums';
import type { FamilyGroup } from '@/types';
import type { FamilyMember } from '@/types';
import { toast } from '@/hooks/use-toast';
import AlbumCard from './AlbumCard';
import AlbumForm from './AlbumForm';

const AlbumManager: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<Album | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'family' | 'member' | 'category'>('all');
  const [selectedFamilyGroupId, setSelectedFamilyGroupId] = useState<string | null>(null);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [selectedStoryCategoryId, setSelectedStoryCategoryId] = useState<string | null>(null);
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [storyCategories, setStoryCategories] = useState<StoryCategory[]>([]);

  // Load data
  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedFamilyGroupId) filters.familyGroupId = selectedFamilyGroupId;
      if (selectedFamilyMemberId) filters.familyMemberId = selectedFamilyMemberId;
      if (selectedStoryCategoryId) filters.storyCategoryId = selectedStoryCategoryId;
      
      const loadedAlbums = await albumService.getAllAlbums(filters);
      setAlbums(loadedAlbums);
    } catch (error) {
      console.error('Error loading albums:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFamilyGroupId, selectedFamilyMemberId, selectedStoryCategoryId]);

  const loadFamilyGroups = useCallback(async () => {
    try {
      const groups = await familyGroupService.getAllFamilyGroups();
      setFamilyGroups(groups);
    } catch (error) {
      console.error('Error loading family groups:', error);
    }
  }, []);

  const loadFamilyMembers = useCallback(async () => {
    try {
      const members = await getFamilyMembers();
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  }, []);

  const loadStoryCategories = useCallback(async () => {
    try {
      const categories = await albumService.getStoryCategories();
      setStoryCategories(categories);
    } catch (error) {
      console.error('Error loading story categories:', error);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
    loadFamilyGroups();
    loadFamilyMembers();
    loadStoryCategories();
  }, [loadAlbums, loadFamilyGroups, loadFamilyMembers, loadStoryCategories]);

  const handleCreateAlbum = async (request: CreateAlbumRequest) => {
    const album = await albumService.createAlbum(request);
    if (album) {
      setIsCreateDialogOpen(false);
      await loadAlbums();
    }
  };

  const handleUpdateAlbum = async (request: any) => {
    const album = await albumService.updateAlbum(request);
    if (album) {
      setEditingAlbum(null);
      await loadAlbums();
    }
  };

  const handleDeleteAlbum = async () => {
    if (deletingAlbum) {
      const success = await albumService.deleteAlbum(deletingAlbum.id);
      if (success) {
        setDeletingAlbum(null);
        await loadAlbums();
      }
    }
  };

  // Filter albums by active tab
  const filteredAlbums = albums.filter(album => {
    if (activeTab === 'all') return true;
    if (activeTab === 'family') return album.familyGroups && album.familyGroups.length > 0;
    if (activeTab === 'member') return album.familyMembers && album.familyMembers.length > 0;
    if (activeTab === 'category') return album.storyCategories && album.storyCategories.length > 0;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Albums</h2>
          <p className="text-sm text-muted-foreground">
            Organize your media by family, family member, or story category
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Album
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Album</DialogTitle>
            </DialogHeader>
            <AlbumForm
              onSubmit={handleCreateAlbum}
              onCancel={() => setIsCreateDialogOpen(false)}
              familyGroups={familyGroups}
              familyMembers={familyMembers}
              storyCategories={storyCategories}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for organization type */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All Albums</TabsTrigger>
          <TabsTrigger value="family">
            <Users className="h-4 w-4 mr-2" />
            By Family
          </TabsTrigger>
          <TabsTrigger value="member">
            <User className="h-4 w-4 mr-2" />
            By Member
          </TabsTrigger>
          <TabsTrigger value="category">
            <BookOpen className="h-4 w-4 mr-2" />
            By Category
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AlbumGrid
            albums={filteredAlbums}
            onEdit={setEditingAlbum}
            onDelete={setDeletingAlbum}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="family" className="mt-4">
          <div className="space-y-6">
            {familyGroups.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No family groups found. Create a family group to organize albums.</p>
                </CardContent>
              </Card>
            ) : (
              familyGroups.map(group => {
                const groupAlbums = albums.filter(album => 
                  album.familyGroups?.some(fg => fg.id === group.id)
                );
                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-heritage-purple" />
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                      <Badge variant="secondary">{groupAlbums.length} albums</Badge>
                    </div>
                    {groupAlbums.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupAlbums.map(album => (
                          <AlbumCard
                            key={album.id}
                            album={album}
                            onEdit={setEditingAlbum}
                            onDelete={setDeletingAlbum}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-4 text-center text-sm text-muted-foreground">
                          No albums in this family group yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="member" className="mt-4">
          <div className="space-y-6">
            {familyMembers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No family members found. Add family members to organize albums.</p>
                </CardContent>
              </Card>
            ) : (
              familyMembers.map(member => {
                const memberAlbums = albums.filter(album => 
                  album.familyMembers?.some(fm => fm.id === member.id)
                );
                return (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-heritage-purple" />
                      <h3 className="text-lg font-semibold">
                        {member.firstName} {member.lastName}
                      </h3>
                      <Badge variant="secondary">{memberAlbums.length} albums</Badge>
                    </div>
                    {memberAlbums.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {memberAlbums.map(album => (
                          <AlbumCard
                            key={album.id}
                            album={album}
                            onEdit={setEditingAlbum}
                            onDelete={setDeletingAlbum}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-4 text-center text-sm text-muted-foreground">
                          No albums for this family member yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <div className="space-y-6">
            {storyCategories.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No story categories found.</p>
                </CardContent>
              </Card>
            ) : (
              storyCategories.map(category => {
                const categoryAlbums = albums.filter(album => 
                  album.storyCategories?.some(sc => sc.id === category.id)
                );
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-heritage-purple" />
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      {category.description && (
                        <span className="text-sm text-muted-foreground">
                          {category.description}
                        </span>
                      )}
                      <Badge variant="secondary">{categoryAlbums.length} albums</Badge>
                    </div>
                    {categoryAlbums.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryAlbums.map(album => (
                          <AlbumCard
                            key={album.id}
                            album={album}
                            onEdit={setEditingAlbum}
                            onDelete={setDeletingAlbum}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-4 text-center text-sm text-muted-foreground">
                          No albums in this category yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingAlbum && (
        <Dialog open={!!editingAlbum} onOpenChange={(open) => !open && setEditingAlbum(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Album</DialogTitle>
            </DialogHeader>
            <AlbumForm
              album={editingAlbum}
              onSubmit={handleUpdateAlbum}
              onCancel={() => setEditingAlbum(null)}
              familyGroups={familyGroups}
              familyMembers={familyMembers}
              storyCategories={storyCategories}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingAlbum && (
        <AlertDialog open={!!deletingAlbum} onOpenChange={(open) => !open && setDeletingAlbum(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Album</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingAlbum.name}"? This action cannot be undone.
                The media items in this album will not be deleted, only the album organization will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAlbum} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

interface AlbumGridProps {
  albums: Album[];
  onEdit: (album: Album) => void;
  onDelete: (album: Album) => void;
  loading: boolean;
}

const AlbumGrid: React.FC<AlbumGridProps> = ({ albums, onEdit, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading albums...</p>
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No albums found. Create your first album to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {albums.map(album => (
        <AlbumCard
          key={album.id}
          album={album}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default AlbumManager;

