import { supabase } from '@/integrations/supabase/client';
import { TimelineItem, FamilyStory, FamilyEvent } from '@/types/stories';

class TimelineService {
  async getMemberTimeline(memberId: string): Promise<TimelineItem[]> {
    try {
      // Get stories for the member
      const { data: stories, error: storiesError } = await supabase
        .from('v_member_timeline')
        .select('*')
        .eq('member_id', memberId)
        .order('date', { ascending: false, nullsFirst: false });

      if (storiesError) {
        console.error('Error fetching member timeline:', storiesError);
        return [];
      }

      return stories || [];
    } catch (error) {
      console.error('Error fetching member timeline:', error);
      return [];
    }
  }

  async getFamilyTimeline(familyMemberIds: string[]): Promise<TimelineItem[]> {
    try {
      if (familyMemberIds.length === 0) return [];

      // Get timeline items for all family members
      const { data, error } = await supabase
        .from('v_member_timeline')
        .select('*')
        .in('member_id', familyMemberIds)
        .order('date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching family timeline:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching family timeline:', error);
      return [];
    }
  }

  async getTimelineByDateRange(startDate: string, endDate: string, memberIds?: string[]): Promise<TimelineItem[]> {
    try {
      let query = supabase
        .from('v_member_timeline')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (memberIds && memberIds.length > 0) {
        query = query.in('member_id', memberIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching timeline by date range:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching timeline by date range:', error);
      return [];
    }
  }

  async getTimelineByLocation(lat: number, lng: number, radius: number = 10): Promise<TimelineItem[]> {
    try {
      // This would require a more complex query with distance calculation
      // For now, we'll get all timeline items with location data
      const { data, error } = await supabase
        .from('v_member_timeline')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching timeline by location:', error);
        return [];
      }

      // Filter by distance (simple implementation)
      const filteredData = data?.filter(item => {
        if (!item.lat || !item.lng) return false;
        
        const distance = this.calculateDistance(lat, lng, item.lat, item.lng);
        return distance <= radius;
      }) || [];

      return filteredData;
    } catch (error) {
      console.error('Error fetching timeline by location:', error);
      return [];
    }
  }

  async getTimelineStats(memberId: string): Promise<{
    totalStories: number;
    totalEvents: number;
    dateRange: { earliest: string | null; latest: string | null };
    locations: Array<{ location: string; count: number }>;
  }> {
    try {
      const timeline = await this.getMemberTimeline(memberId);
      
      const stories = timeline.filter(item => item.itemType === 'story');
      const events = timeline.filter(item => item.itemType === 'event');
      
      const dates = timeline
        .map(item => item.date)
        .filter(Boolean)
        .sort();
      
      const locations = timeline
        .filter(item => item.location)
        .reduce((acc, item) => {
          const location = item.location!;
          acc[location] = (acc[location] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      return {
        totalStories: stories.length,
        totalEvents: events.length,
        dateRange: {
          earliest: dates.length > 0 ? dates[0] : null,
          latest: dates.length > 0 ? dates[dates.length - 1] : null
        },
        locations: Object.entries(locations).map(([location, count]) => ({
          location,
          count
        }))
      };
    } catch (error) {
      console.error('Error getting timeline stats:', error);
      return {
        totalStories: 0,
        totalEvents: 0,
        dateRange: { earliest: null, latest: null },
        locations: []
      };
    }
  }

  async searchTimeline(query: string, memberIds?: string[]): Promise<TimelineItem[]> {
    try {
      // Search in stories and events
      const searchTerm = `%${query}%`;
      
      let storyQuery = supabase
        .from('family_stories')
        .select(`
          id,
          title,
          content,
          date,
          author_id,
          story_members!inner(family_member_id)
        `)
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);

      let eventQuery = supabase
        .from('family_events')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          lat,
          lng,
          created_by,
          event_participants!inner(family_member_id)
        `)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm}`);

      if (memberIds && memberIds.length > 0) {
        storyQuery = storyQuery.in('story_members.family_member_id', memberIds);
        eventQuery = eventQuery.in('event_participants.family_member_id', memberIds);
      }

      const [storiesResult, eventsResult] = await Promise.all([
        storyQuery,
        eventQuery
      ]);

      const stories: TimelineItem[] = (storiesResult.data || []).map(story => ({
        memberId: story.story_members[0]?.family_member_id || '',
        itemType: 'story' as const,
        itemId: story.id,
        title: story.title,
        date: story.date || '',
        content: story.content
      }));

      const events: TimelineItem[] = (eventsResult.data || []).map(event => ({
        memberId: event.event_participants[0]?.family_member_id || '',
        itemType: 'event' as const,
        itemId: event.id,
        title: event.title,
        date: event.event_date,
        location: event.location,
        lat: event.lat,
        lng: event.lng,
        description: event.description
      }));

      return [...stories, ...events].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('Error searching timeline:', error);
      return [];
    }
  }

  // Helper method to calculate distance between two coordinates
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const timelineService = new TimelineService();
