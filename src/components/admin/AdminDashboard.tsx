import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Database, Crown, Search, Download, Upload, Home } from 'lucide-react';
import { UserProfile, FamilyMember, UserRole } from '@/types';
import { FamilyStory } from '@/types/stories';
import { MediaItem } from '@/services/mediaService';
import { getAllUsers, updateUserRole, deleteUser, createUser, changeUserPassword, updateUserDisplayName } from '@/services/userService';
import { getFamilyMembers } from '@/services/supabaseService';
import { familyMemberService } from '@/services/familyMemberService';
import { storyService } from '@/services/storyService';
import { getAllMedia, deleteMediaAsAdmin, updateMediaCaption } from '@/services/mediaService';
import { familyRelationshipManager, RelationshipType } from '@/services/familyRelationshipManager';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AdminStatsCards } from './AdminStatsCards';
import { UserManagementTab } from './UserManagementTab';
import { FamilyMembersTab } from './FamilyMembersTab';
import { StoriesTab } from './StoriesTab';
import { MediaTab } from './MediaTab';
import { ConnectionsTab, AdminRelation } from './ConnectionsTab';

/**
 * Admin Dashboard Component
 * 
 * Provides comprehensive administration interface for managing:
 * - Users and their roles
 * - Family members
 * - Stories
 * - Media items
 * - Family relationships
 */
const AdminDashboard: React.FC = () => {
  const { user: currentUser, isAdmin: currentUserIsAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [relations, setRelations] = useState<AdminRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  
  // User management dialogs
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  
  // Media editing
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, membersData, storiesData, mediaData, relationsData] = await Promise.all([
        getAllUsers(),
        getFamilyMembers(),
        storyService.getAllStories(),
        getAllMedia(),
        familyRelationshipManager.getAllRelations()
      ]);
      setUsers(usersData);
      setFamilyMembers(membersData);
      setStories(storiesData);
      setMedia(mediaData);
      setRelations(relationsData as AdminRelation[]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    setUpdatingRole(userId);
    try {
      const success = await updateUserRole(userId, newRole);
      if (success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        toast({
          title: "Success",
          description: `User role updated to ${newRole}.`,
        });
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive"
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast({
          title: "Success",
          description: `User ${displayName} has been deleted.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFamilyMember = async (memberId: string, memberName: string) => {
    try {
      const result = await familyMemberService.deleteFamilyMember(memberId);
      if (result.success) {
        setFamilyMembers(prev => prev.filter(m => m.id !== memberId));
        toast({
          title: "Success",
          description: `Family member ${memberName} has been deleted.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete family member.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting family member:', error);
      toast({
        title: "Error",
        description: "Failed to delete family member.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteStory = async (storyId: string, storyTitle: string) => {
    try {
      const result = await storyService.deleteStory(storyId);
      if (result.success) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        toast({
          title: "Success",
          description: `Story "${storyTitle}" has been deleted.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete story.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: "Error",
        description: "Failed to delete story.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      const success = await deleteMediaAsAdmin(mediaId);
      if (success) {
        setMedia(prev => prev.filter(m => m.id !== mediaId));
        toast({
          title: "Success",
          description: "Media has been deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete media.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      const result = await familyRelationshipManager.deleteRelationship(relationId);
      if (result.success) {
        setRelations(prev => prev.filter(r => r.id !== relationId));
        toast({
          title: "Success",
          description: "Relationship has been deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete relationship.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting relationship:', error);
      toast({
        title: "Error",
        description: "Failed to delete relationship.",
        variant: "destructive"
      });
    }
  };

  const handleEditMedia = async () => {
    if (!editingMedia) return;
    try {
      const success = await updateMediaCaption(editingMedia.id, mediaCaption);
      if (success) {
        setMedia(prev => prev.map(m => 
          m.id === editingMedia.id ? { ...m, caption: mediaCaption } : m
        ));
        setEditingMedia(null);
        setMediaCaption('');
        toast({
          title: "Success",
          description: "Media caption updated.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update media caption.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating media:', error);
      toast({
        title: "Error",
        description: "Failed to update media caption.",
        variant: "destructive"
      });
    }
  };

  const openEditMedia = (mediaItem: MediaItem) => {
    setEditingMedia(mediaItem);
    setMediaCaption(mediaItem.caption || '');
  };

  const handleCreateUser = async () => {
    if (!currentUserIsAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can create users.",
        variant: "destructive"
      });
      return;
    }

    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Error",
        description: "Email and password are required.",
        variant: "destructive"
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      const result = await createUser(
        newUserEmail,
        newUserPassword,
        newUserRole,
        newUserDisplayName || undefined
      );

      if (result.success) {
        toast({
          title: "Success",
          description: `User ${newUserEmail} has been created successfully.`,
        });
        setIsUserDialogOpen(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserDisplayName('');
        setNewUserRole('viewer');
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create user.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleChangePassword = async () => {
    if (!changingPasswordUserId || !newPassword) {
      toast({
        title: "Error",
        description: "Password is required.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changeUserPassword(changingPasswordUserId, newPassword);

      if (result.success) {
        toast({
          title: "Success",
          description: "Password has been changed successfully.",
        });
        setIsPasswordDialogOpen(false);
        setChangingPasswordUserId(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password.",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!editingUser) return;

    setIsUpdatingDisplayName(true);
    try {
      const result = await updateUserDisplayName(editingUser.id, editingDisplayName);

      if (result.success) {
        toast({
          title: "Success",
          description: "Display name updated successfully.",
        });
        setIsEditUserDialogOpen(false);
        setEditingUser(null);
        setEditingDisplayName('');
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update display name.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: "Error",
        description: "Failed to update display name.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Database className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            aria-label="Back to home"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/import-family-data')}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Data
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/export-family-data')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <AdminStatsCards
        users={users}
        totalMembers={familyMembers.length}
        totalStories={stories.length}
        totalMedia={media.length}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="members">Family Members</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64"
                aria-label="Search admin dashboard"
              />
            </div>
          </div>
        </div>

        <TabsContent value="users" className="space-y-4">
          <UserManagementTab
            users={users}
            currentUserId={currentUser?.id}
            searchQuery={searchQuery}
            updatingRole={updatingRole}
            isUserDialogOpen={isUserDialogOpen}
            isEditUserDialogOpen={isEditUserDialogOpen}
            isPasswordDialogOpen={isPasswordDialogOpen}
            editingUser={editingUser}
            newUserEmail={newUserEmail}
            newUserPassword={newUserPassword}
            newUserDisplayName={newUserDisplayName}
            newUserRole={newUserRole}
            editingDisplayName={editingDisplayName}
            changingPasswordUserId={changingPasswordUserId}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            isCreatingUser={isCreatingUser}
            isChangingPassword={isChangingPassword}
            isUpdatingDisplayName={isUpdatingDisplayName}
            onSetIsUserDialogOpen={setIsUserDialogOpen}
            onSetIsEditUserDialogOpen={setIsEditUserDialogOpen}
            onSetIsPasswordDialogOpen={setIsPasswordDialogOpen}
            onSetEditingUser={setEditingUser}
            onSetNewUserEmail={setNewUserEmail}
            onSetNewUserPassword={setNewUserPassword}
            onSetNewUserDisplayName={setNewUserDisplayName}
            onSetNewUserRole={setNewUserRole}
            onSetEditingDisplayName={setEditingDisplayName}
            onSetChangingPasswordUserId={setChangingPasswordUserId}
            onSetNewPassword={setNewPassword}
            onSetConfirmPassword={setConfirmPassword}
            onRoleUpdate={handleRoleUpdate}
            onDeleteUser={handleDeleteUser}
            onCreateUser={handleCreateUser}
            onUpdateDisplayName={handleUpdateDisplayName}
            onChangePassword={handleChangePassword}
          />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <FamilyMembersTab
            members={familyMembers}
            users={users}
            searchQuery={searchQuery}
            onDelete={handleDeleteFamilyMember}
          />
        </TabsContent>

        <TabsContent value="stories" className="space-y-4">
          <StoriesTab
            stories={stories}
            users={users}
            searchQuery={searchQuery}
            onDelete={handleDeleteStory}
          />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <MediaTab
            media={media}
            searchQuery={searchQuery}
            editingMedia={editingMedia}
            mediaCaption={mediaCaption}
            onEdit={openEditMedia}
            onDelete={handleDeleteMedia}
            onUpdateCaption={handleEditMedia}
            onSetEditingMedia={setEditingMedia}
            onSetMediaCaption={setMediaCaption}
          />
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <ConnectionsTab
            relations={relations}
            searchQuery={searchQuery}
            onDelete={handleDeleteRelation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
