import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canUserEditFamilyMember } from '@/services/userService';

export const usePermissions = () => {
  const { user, isAdmin } = useAuth();
  const [canEditCache, setCanEditCache] = useState<Map<string, boolean>>(new Map());

  const canEditFamilyMember = async (memberId: string): Promise<boolean> => {
    // Check cache first
    if (canEditCache.has(memberId)) {
      return canEditCache.get(memberId) || false;
    }

    // If no user, can't edit
    if (!user) {
      setCanEditCache(prev => new Map(prev).set(memberId, false));
      return false;
    }

    // If admin, can edit everything
    if (isAdmin) {
      setCanEditCache(prev => new Map(prev).set(memberId, true));
      return true;
    }

    // Check specific permissions
    try {
      const canEdit = await canUserEditFamilyMember(memberId);
      setCanEditCache(prev => new Map(prev).set(memberId, canEdit));
      return canEdit;
    } catch (error) {
      console.error('Error checking edit permission:', error);
      setCanEditCache(prev => new Map(prev).set(memberId, false));
      return false;
    }
  };

  const canAddFamilyMember = (): boolean => {
    return !!user; // Any authenticated user can add family members
  };

  const canDeleteFamilyMember = (): boolean => {
    return isAdmin; // Only admins can delete
  };

  const canManageUsers = (): boolean => {
    return isAdmin; // Only admins can manage users
  };

  const clearCache = () => {
    setCanEditCache(new Map());
  };

  return {
    canEditFamilyMember,
    canAddFamilyMember,
    canDeleteFamilyMember,
    canManageUsers,
    clearCache,
    isAdmin,
    isAuthenticated: !!user
  };
};
