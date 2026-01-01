import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canUserEditFamilyMember } from '@/services/userService';
import { hasPermission, canEditResource } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

export const usePermissions = () => {
  const { user, userProfile, isAdmin, isEditor, isViewer, canWrite, canDelete, canManageUsers, role } = useAuth();
  const [canEditCache, setCanEditCache] = useState<Map<string, boolean>>(new Map());

  const canEditFamilyMember = async (memberId: string): Promise<boolean> => {
    // Check cache first
    if (canEditCache.has(memberId)) {
      return canEditCache.get(memberId) || false;
    }

    // If no user, can't edit
    if (!user || !role) {
      setCanEditCache(prev => new Map(prev).set(memberId, false));
      return false;
    }

    // If admin, can edit everything
    if (isAdmin) {
      setCanEditCache(prev => new Map(prev).set(memberId, true));
      return true;
    }

    // Editors can edit members they created or in their branch
    if (isEditor) {
      try {
        const canEdit = await canUserEditFamilyMember(memberId);
        setCanEditCache(prev => new Map(prev).set(memberId, canEdit));
        return canEdit;
      } catch (error) {
        console.error('Error checking edit permission:', error);
        setCanEditCache(prev => new Map(prev).set(memberId, false));
        return false;
      }
    }

    // Viewers cannot edit
    setCanEditCache(prev => new Map(prev).set(memberId, false));
    return false;
  };

  const canAddFamilyMember = (): boolean => {
    return canWrite; // Admins and editors can add family members
  };

  const canDeleteFamilyMember = (): boolean => {
    return canDelete; // Only admins can delete
  };

  const canCreateStory = (): boolean => {
    return canWrite; // Admins and editors can create stories
  };

  const canEditStory = (storyAuthorId?: string): boolean => {
    if (!user || !role) return false;
    return canEditResource(role, storyAuthorId, user.id);
  };

  const canDeleteStory = (): boolean => {
    return canDelete; // Only admins can delete stories
  };

  const canUploadMedia = (): boolean => {
    return canWrite; // Admins and editors can upload media
  };

  const canEditMedia = (mediaUserId?: string): boolean => {
    if (!user || !role) return false;
    return canEditResource(role, mediaUserId, user.id);
  };

  const canDeleteMedia = (): boolean => {
    return canDelete; // Only admins can delete media
  };

  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(role, permission);
  };

  const clearCache = () => {
    setCanEditCache(new Map());
  };

  return {
    canEditFamilyMember,
    canAddFamilyMember,
    canDeleteFamilyMember,
    canCreateStory,
    canEditStory,
    canDeleteStory,
    canUploadMedia,
    canEditMedia,
    canDeleteMedia,
    canManageUsers,
    checkPermission,
    clearCache,
    isAdmin,
    isEditor,
    isViewer,
    canWrite,
    canDelete,
    isAuthenticated: !!user,
    role,
  };
};
