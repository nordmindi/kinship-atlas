import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserMedia, 
  uploadMedia, 
  deleteMedia, 
  updateMediaCaption,
  getMemberMedia 
} from '@/services/mediaService';
import { MediaItem, MediaUpload } from '@/services/mediaService';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to fetch all media for the current user
 */
export const useMedia = () => {
  return useQuery({
    queryKey: queryKeys.media.list(),
    queryFn: () => getUserMedia(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch media for a specific family member
 */
export const useMemberMedia = (memberId: string | null) => {
  return useQuery({
    queryKey: queryKeys.media.member(memberId || ''),
    queryFn: () => {
      if (!memberId) throw new Error('Member ID is required');
      return getMemberMedia(memberId);
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to upload new media
 */
export const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (upload: MediaUpload) => uploadMedia(upload),
    onSuccess: (result) => {
      if (result) {
        // Invalidate media list to refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
      }
    },
  });
};

/**
 * Hook to update media caption
 */
export const useUpdateMediaCaption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, caption }: { mediaId: string; caption: string }) => 
      updateMediaCaption(mediaId, caption),
    onSuccess: (result, variables) => {
      if (result) {
        // Invalidate media list
        queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
        
        // Invalidate specific media detail if it exists
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.media.detail(variables.mediaId) 
        });
      }
    },
  });
};

/**
 * Hook to delete media
 */
export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId),
    onSuccess: (result, mediaId) => {
      if (result) {
        // Remove from cache
        queryClient.removeQueries({ 
          queryKey: queryKeys.media.detail(mediaId) 
        });
        
        // Invalidate media list
        queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
        
        // Invalidate all member media (since we don't know which member was affected)
        queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
      }
    },
  });
};

