/**
 * Query Keys Factory
 * Centralized query key management for TanStack Query
 * Ensures consistent cache key structure across the app
 */

export const queryKeys = {
  // Family Members
  familyMembers: {
    all: ['familyMembers'] as const,
    lists: () => [...queryKeys.familyMembers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.familyMembers.lists(), filters] as const,
    details: () => [...queryKeys.familyMembers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.familyMembers.details(), id] as const,
    relations: (memberId: string) => 
      [...queryKeys.familyMembers.detail(memberId), 'relations'] as const,
  },

  // Stories
  stories: {
    all: ['stories'] as const,
    lists: () => [...queryKeys.stories.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.stories.lists(), filters] as const,
    details: () => [...queryKeys.stories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.stories.details(), id] as const,
    member: (memberId: string) => 
      [...queryKeys.stories.all, 'member', memberId] as const,
  },

  // Media
  media: {
    all: ['media'] as const,
    lists: () => [...queryKeys.media.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.media.lists(), filters] as const,
    details: () => [...queryKeys.media.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.media.details(), id] as const,
    member: (memberId: string) => 
      [...queryKeys.media.all, 'member', memberId] as const,
  },

  // User Profile
  userProfile: {
    all: ['userProfile'] as const,
    detail: (userId: string) => [...queryKeys.userProfile.all, userId] as const,
  },

  // Timeline
  timeline: {
    all: ['timeline'] as const,
    member: (memberId: string) => 
      [...queryKeys.timeline.all, 'member', memberId] as const,
  },

  // Permissions
  permissions: {
    all: ['permissions'] as const,
    canEdit: (memberId: string) => 
      [...queryKeys.permissions.all, 'canEdit', memberId] as const,
  },
};

