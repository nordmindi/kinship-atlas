import { useState, useEffect, useCallback } from 'react';
import { timelineService } from '@/services/timelineService';
import { TimelineItem } from '@/types/stories';

export const useMemberTimeline = (memberId: string) => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!memberId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedTimeline = await timelineService.getMemberTimeline(memberId);
      setTimeline(fetchedTimeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    timeline,
    isLoading,
    error,
    fetchTimeline
  };
};

export const useFamilyTimeline = (familyMemberIds: string[]) => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (familyMemberIds.length === 0) {
      setTimeline([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedTimeline = await timelineService.getFamilyTimeline(familyMemberIds);
      setTimeline(fetchedTimeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch family timeline');
    } finally {
      setIsLoading(false);
    }
  }, [familyMemberIds]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    timeline,
    isLoading,
    error,
    fetchTimeline
  };
};

export const useTimelineSearch = () => {
  const [searchResults, setSearchResults] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeline = useCallback(async (query: string, memberIds?: string[]) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const results = await timelineService.searchTimeline(query, memberIds);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search timeline');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchTimeline,
    clearSearch
  };
};

export const useTimelineStats = (memberId: string) => {
  const [stats, setStats] = useState<{
    totalStories: number;
    totalEvents: number;
    dateRange: { earliest: string | null; latest: string | null };
    locations: Array<{ location: string; count: number }>;
  }>({
    totalStories: 0,
    totalEvents: 0,
    dateRange: { earliest: null, latest: null },
    locations: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!memberId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedStats = await timelineService.getTimelineStats(memberId);
      setStats(fetchedStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timeline stats');
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    fetchStats
  };
};
