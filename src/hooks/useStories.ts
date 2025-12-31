import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyService } from '@/services/storyService';
import { FamilyStory, CreateStoryRequest, UpdateStoryRequest } from '@/types/stories';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to fetch all stories
 */
export const useStories = () => {
  return useQuery({
    queryKey: queryKeys.stories.list(),
    queryFn: () => storyService.getAllStories(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch a single story by ID
 */
export const useStory = (storyId: string | null) => {
  return useQuery({
    queryKey: queryKeys.stories.detail(storyId || ''),
    queryFn: () => {
      if (!storyId) throw new Error('Story ID is required');
      return storyService.getStory(storyId);
    },
    enabled: !!storyId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch stories for a specific family member
 */
export const useMemberStories = (memberId: string | null) => {
  return useQuery({
    queryKey: queryKeys.stories.member(memberId || ''),
    queryFn: () => {
      if (!memberId) throw new Error('Member ID is required');
      return storyService.getStoriesForMember(memberId);
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to create a new story
 */
export const useCreateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateStoryRequest) => storyService.createStory(request),
    onSuccess: (result) => {
      if (result.success && result.story) {
        // Invalidate stories list to refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.stories.lists() });
        
        // If story has related members, invalidate their stories too
        if (result.story.relatedMembers && result.story.relatedMembers.length > 0) {
          result.story.relatedMembers.forEach(member => {
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.stories.member(member.familyMemberId) 
            });
          });
        }
      }
    },
  });
};

/**
 * Hook to update an existing story
 */
export const useUpdateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateStoryRequest) => storyService.updateStory(request),
    onSuccess: (result, variables) => {
      if (result.success && result.story) {
        // Invalidate the specific story
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.stories.detail(variables.id) 
        });
        
        // Invalidate stories list
        queryClient.invalidateQueries({ queryKey: queryKeys.stories.lists() });
        
        // Invalidate member stories if members changed
        if (result.story.relatedMembers && result.story.relatedMembers.length > 0) {
          result.story.relatedMembers.forEach(member => {
            queryClient.invalidateQueries({ 
              queryKey: queryKeys.stories.member(member.familyMemberId) 
            });
          });
        }
      }
    },
  });
};

/**
 * Hook to delete a story
 */
export const useDeleteStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => storyService.deleteStory(storyId),
    onSuccess: (result, storyId) => {
      if (result.success) {
        // Remove from cache
        queryClient.removeQueries({ 
          queryKey: queryKeys.stories.detail(storyId) 
        });
        
        // Invalidate stories list
        queryClient.invalidateQueries({ queryKey: queryKeys.stories.lists() });
        
        // Invalidate all member stories (since we don't know which members were affected)
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.stories.all 
        });
      }
    },
  });
};
