import { useState, useEffect, useCallback } from 'react';
import { storyService } from '@/services/storyService';
import { FamilyStory, CreateStoryRequest, UpdateStoryRequest } from '@/types/stories';

export const useStories = () => {
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedStories = await storyService.getAllStories();
      setStories(fetchedStories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createStory = useCallback(async (request: CreateStoryRequest) => {
    try {
      setError(null);
      const result = await storyService.createStory(request);
      if (result.success && result.story) {
        setStories(prev => [result.story!, ...prev]);
        return result;
      } else {
        setError(result.error || 'Failed to create story');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create story';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateStory = useCallback(async (request: UpdateStoryRequest) => {
    try {
      setError(null);
      const result = await storyService.updateStory(request);
      if (result.success && result.story) {
        setStories(prev => 
          prev.map(story => 
            story.id === request.id ? result.story! : story
          )
        );
        return result;
      } else {
        setError(result.error || 'Failed to update story');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update story';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const deleteStory = useCallback(async (storyId: string) => {
    try {
      setError(null);
      const result = await storyService.deleteStory(storyId);
      if (result.success) {
        setStories(prev => prev.filter(story => story.id !== storyId));
        return result;
      } else {
        setError(result.error || 'Failed to delete story');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete story';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, []); // Only run once on mount

  return {
    stories,
    isLoading,
    error,
    fetchStories,
    createStory,
    updateStory,
    deleteStory
  };
};

export const useStory = (storyId: string) => {
  const [story, setStory] = useState<FamilyStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(async () => {
    if (!storyId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedStory = await storyService.getStory(storyId);
      setStory(fetchedStory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch story');
    } finally {
      setIsLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  return {
    story,
    isLoading,
    error,
    fetchStory
  };
};

export const useMemberStories = (memberId: string) => {
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberStories = useCallback(async () => {
    if (!memberId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedStories = await storyService.getStoriesForMember(memberId);
      setStories(fetchedStories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch member stories');
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMemberStories();
  }, [fetchMemberStories]);

  return {
    stories,
    isLoading,
    error,
    fetchMemberStories
  };
};
