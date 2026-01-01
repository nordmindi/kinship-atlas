/**
 * Permission utilities for role-based access control
 * 
 * Roles:
 * - admin: Full access to all features
 * - editor: Can manage families, add/edit/update members, add stories and media, manage families and family members they've added
 * - viewer: Read-only access - can view families, family members, media, and stories
 */

import { UserRole } from '@/types';

export type Permission = 
  | 'view.families'
  | 'view.members'
  | 'view.stories'
  | 'view.media'
  | 'create.families'
  | 'create.members'
  | 'create.stories'
  | 'create.media'
  | 'edit.families'
  | 'edit.members'
  | 'edit.stories'
  | 'edit.media'
  | 'delete.families'
  | 'delete.members'
  | 'delete.stories'
  | 'delete.media'
  | 'manage.users';

/**
 * Permission matrix: maps roles to their allowed permissions
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view.families',
    'view.members',
    'view.stories',
    'view.media',
    'create.families',
    'create.members',
    'create.stories',
    'create.media',
    'edit.families',
    'edit.members',
    'edit.stories',
    'edit.media',
    'delete.families',
    'delete.members',
    'delete.stories',
    'delete.media',
    'manage.users',
  ],
  editor: [
    'view.families',
    'view.members',
    'view.stories',
    'view.media',
    'create.families',
    'create.members',
    'create.stories',
    'create.media',
    'edit.families',
    'edit.members',
    'edit.stories',
    'edit.media',
  ],
  viewer: [
    'view.families',
    'view.members',
    'view.stories',
    'view.media',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role can perform write operations (create, edit, delete)
 */
export function canWrite(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'editor';
}

/**
 * Check if a role can perform delete operations
 */
export function canDelete(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === 'admin';
}

/**
 * Check if a role can manage users
 */
export function canManageUsers(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === 'admin';
}

/**
 * Check if a role is admin
 */
export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === 'admin';
}

/**
 * Check if a role is editor
 */
export function isEditor(role: UserRole | undefined | null): boolean {
  return role === 'editor';
}

/**
 * Check if a role is viewer
 */
export function isViewer(role: UserRole | undefined | null): boolean {
  return role === 'viewer';
}

/**
 * Check if a role can edit a resource created by a specific user
 * Editors can only edit resources they created, admins can edit anything
 */
export function canEditResource(
  role: UserRole | undefined | null,
  resourceCreatorId: string | undefined | null,
  currentUserId: string | undefined | null
): boolean {
  if (!role || !currentUserId) return false;
  
  // Admins can edit anything
  if (role === 'admin') return true;
  
  // Editors can only edit resources they created
  if (role === 'editor') {
    return resourceCreatorId === currentUserId;
  }
  
  // Viewers cannot edit
  return false;
}

