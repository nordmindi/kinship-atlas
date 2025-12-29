import { supabase } from '@/integrations/supabase/client';
import { 
  FamilyStory, 
  FamilyEvent, 
  CreateStoryRequest, 
  UpdateStoryRequest,
  CreateEventRequest,
  UpdateEventRequest,
  UploadMediaRequest,
  TimelineItem,
  StoryWithPeople,
  EventWithPeople
} from '@/types/stories';

class StoryService {
  // Story Management
  async createStory(request: CreateStoryRequest): Promise<{ success: boolean; story?: FamilyStory; error?: string }> {
    try {
      // Be resilient in fetching the authenticated user; fall back to session
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) {
        console.error('createStory aborted: no authenticated user present');
        return { success: false, error: 'You must be logged in to create stories' };
      }

      // Create the story
      const { data: storyData, error: storyError } = await supabase
        .from('family_stories')
        .insert({
          title: request.title,
          content: request.content,
          date: request.date || null,
          author_id: user.id
        })
        .select('id')
        .single();

      if (storyError) {
        return { success: false, error: 'Failed to create story in database' };
      }

      // Add story members
      if (request.relatedMembers.length > 0) {
        const { error: membersError } = await supabase
          .from('story_members')
          .insert(
            request.relatedMembers.map(member => ({
              story_id: storyData.id,
              family_member_id: member.familyMemberId,
              role: member.role
            }))
          );

        if (membersError) {
          console.error('Error adding story members:', membersError);
        }
      }

      // Add media if provided
      if (request.mediaIds && request.mediaIds.length > 0) {
        const { error: mediaError } = await supabase
          .from('story_media')
          .insert(
            request.mediaIds.map(mediaId => ({
              story_id: storyData.id,
              media_id: mediaId
            }))
          );

        if (mediaError) {
          console.error('Error adding story media:', mediaError);
        }
      }

      // Fetch the complete story
      const completeStory = await this.getStory(storyData.id);
      return { success: true, story: completeStory };
    } catch (error) {
      console.error('Error creating story:', error);
      return { success: false, error: 'An unexpected error occurred while creating the story' };
    }
  }

  async getStory(storyId: string): Promise<FamilyStory | null> {
    try {
      const { data, error } = await supabase
        .from('family_stories')
        .select(`
          *,
          story_members (
            id,
            role,
            family_member_id,
            family_members (
              id,
              first_name,
              last_name
            )
          ),
          story_media (
            media_id,
            media (
              *
            )
          )
        `)
        .eq('id', storyId)
        .single();

      if (error) {
        console.error('Error fetching story:', error);
        return null;
      }

      return this.transformStoryData(data);
    } catch (error) {
      console.error('Error fetching story:', error);
      return null;
    }
  }

  async getStoriesForMember(memberId: string): Promise<FamilyStory[]> {
    try {
      const { data, error } = await supabase
        .from('family_stories')
        .select(`
          *,
          story_members (
            id,
            role,
            family_member_id,
            family_members (
              id,
              first_name,
              last_name
            )
          ),
          story_media (
            media_id,
            media (
              *
            )
          )
        `)
        .eq('story_members.family_member_id', memberId)
        .order('date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching stories for member:', error);
        return [];
      }

      return data.map(this.transformStoryData);
    } catch (error) {
      console.error('Error fetching stories for member:', error);
      return [];
    }
  }

  async getAllStories(): Promise<FamilyStory[]> {
    try {
      const { data, error } = await supabase
        .from('family_stories')
        .select(`
          *,
          story_members (
            id,
            role,
            family_member_id,
            family_members (
              id,
              first_name,
              last_name
            )
          ),
          story_media (
            media_id,
            media (
              *
            )
          )
        `)
        .order('date', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching all stories:', error);
        return [];
      }

      return data.map(this.transformStoryData);
    } catch (error) {
      console.error('Error fetching all stories:', error);
      return [];
    }
  }

  async updateStory(request: UpdateStoryRequest): Promise<{ success: boolean; story?: FamilyStory; error?: string }> {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) {
        console.error('updateStory aborted: no authenticated user present');
        return { success: false, error: 'You must be logged in to update stories' };
      }

      // Update the story
      const updateData: any = {};
      if (request.title !== undefined) updateData.title = request.title;
      if (request.content !== undefined) updateData.content = request.content;
      if (request.date !== undefined) updateData.date = request.date;
      // attrs may not exist on some DBs; avoid updating it for compatibility

      const { error: storyError } = await supabase
        .from('family_stories')
        .update(updateData)
        .eq('id', request.id)
        .eq('author_id', user.id);

      if (storyError) {
        return { success: false, error: 'Failed to update story in database' };
      }

      // Update story members if provided
      if (request.relatedMembers) {
        // Delete existing members
        await supabase
          .from('story_members')
          .delete()
          .eq('story_id', request.id);

        // Add new members
        if (request.relatedMembers.length > 0) {
          const { error: membersError } = await supabase
            .from('story_members')
            .insert(
              request.relatedMembers.map(member => ({
                story_id: request.id,
                family_member_id: member.familyMemberId,
                role: member.role
              }))
            );

          if (membersError) {
            console.error('Error updating story members:', membersError);
          }
        }
      }

      // Update media if provided
      if (request.mediaIds) {
        // Delete existing media
        await supabase
          .from('story_media')
          .delete()
          .eq('story_id', request.id);

        // Add new media
        if (request.mediaIds.length > 0) {
          const { error: mediaError } = await supabase
            .from('story_media')
            .insert(
              request.mediaIds.map(mediaId => ({
                story_id: request.id,
                media_id: mediaId
              }))
            );

          if (mediaError) {
            console.error('Error updating story media:', mediaError);
          }
        }
      }

      // Fetch the updated story
      const updatedStory = await this.getStory(request.id);
      return { success: true, story: updatedStory };
    } catch (error) {
      console.error('Error updating story:', error);
      return { success: false, error: 'An unexpected error occurred while updating the story' };
    }
  }

  async deleteStory(storyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) {
        console.error('deleteStory aborted: no authenticated user present');
        return { success: false, error: 'You must be logged in to delete stories' };
      }

      const { error } = await supabase
        .from('family_stories')
        .delete()
        .eq('id', storyId)
        .eq('author_id', user.id);

      if (error) {
        return { success: false, error: 'Failed to delete story from database' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting story:', error);
      return { success: false, error: 'An unexpected error occurred while deleting the story' };
    }
  }

  // Event Management
  async createEvent(request: CreateEventRequest): Promise<{ success: boolean; event?: FamilyEvent; error?: string }> {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) {
        console.error('createEvent aborted: no authenticated user present');
        return { success: false, error: 'You must be logged in to create events' };
      }

      // Create the event
      const { data: eventData, error: eventError } = await supabase
        .from('family_events')
        .insert({
          title: request.title,
          description: request.description,
          event_date: request.eventDate,
          location: request.location,
          lat: request.lat,
          lng: request.lng,
          creator_id: user.id
        })
        .select('id')
        .single();

      if (eventError) {
        return { success: false, error: 'Failed to create event in database' };
      }

      // Add event participants
      if (request.participants.length > 0) {
        const { error: participantsError } = await supabase
          .from('event_participants')
          .insert(
            request.participants.map(participant => ({
              event_id: eventData.id,
              family_member_id: participant.familyMemberId,
              role: participant.role
            }))
          );

        if (participantsError) {
          console.error('Error adding event participants:', participantsError);
        }
      }

      // Add media if provided
      if (request.mediaIds && request.mediaIds.length > 0) {
        const { error: mediaError } = await supabase
          .from('event_media')
          .insert(
            request.mediaIds.map(mediaId => ({
              event_id: eventData.id,
              media_id: mediaId
            }))
          );

        if (mediaError) {
          console.error('Error adding event media:', mediaError);
        }
      }

      // Fetch the complete event
      const completeEvent = await this.getEvent(eventData.id);
      return { success: true, event: completeEvent };
    } catch (error) {
      console.error('Error creating event:', error);
      return { success: false, error: 'An unexpected error occurred while creating the event' };
    }
  }

  async getEvent(eventId: string): Promise<FamilyEvent | null> {
    try {
      const { data, error } = await supabase
        .from('family_events')
        .select(`
          *,
          event_participants (
            id,
            role,
            family_member_id,
            family_members (
              id,
              first_name,
              last_name
            )
          ),
          event_media (
            media_id,
            media (
              *
            )
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        return null;
      }

      return this.transformEventData(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  async getEventsForMember(memberId: string): Promise<FamilyEvent[]> {
    try {
      const { data, error } = await supabase
        .from('family_events')
        .select(`
          *,
          event_participants (
            id,
            role,
            family_member_id,
            family_members (
              id,
              first_name,
              last_name
            )
          ),
          event_media (
            media_id,
            media (
              *
            )
          )
        `)
        .eq('event_participants.family_member_id', memberId)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error fetching events for member:', error);
        return [];
      }

      return data.map(this.transformEventData);
    } catch (error) {
      console.error('Error fetching events for member:', error);
      return [];
    }
  }

  // Timeline Management
  async getMemberTimeline(memberId: string): Promise<TimelineItem[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_member_timeline', { member_id: memberId });

      if (error) {
        console.error('Error fetching member timeline:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching member timeline:', error);
      return [];
    }
  }

  // Media Management
  async uploadMedia(request: UploadMediaRequest): Promise<{ success: boolean; media?: any; error?: string }> {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) {
        console.error('uploadMedia aborted: no authenticated user present');
        return { success: false, error: 'You must be logged in to upload media' };
      }

      // Upload file to storage
      const fileExt = request.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('family-media')
        .upload(filePath, request.file);

      if (uploadError) {
        return { success: false, error: 'Failed to upload file to storage' };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('family-media')
        .getPublicUrl(filePath);

      // Create media record aligned with existing schema
      const mediaType = request.file.type.startsWith('image/')
        ? 'image'
        : request.file.type.startsWith('audio/')
          ? 'audio'
          : request.file.type.startsWith('video/')
            ? 'video'
            : 'document';

      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          url: publicUrl,
          user_id: user.id,
          media_type: mediaType,
          caption: request.altText,
          file_name: request.file.name,
          file_size: request.file.size
        })
        .select()
        .single();

      if (mediaError) {
        return { success: false, error: 'Failed to create media record' };
      }

      return { success: true, media: { ...mediaData, url: publicUrl } };
    } catch (error) {
      console.error('Error uploading media:', error);
      return { success: false, error: 'An unexpected error occurred while uploading media' };
    }
  }

  // Helper methods
  private transformStoryData(data: any): FamilyStory {
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      date: data.date,
      authorId: data.author_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      attrs: data.attrs,
      relatedMembers: data.story_members?.map((sm: any) => ({
        id: sm.id,
        storyId: sm.story_id,
        familyMemberId: sm.family_member_id,
        role: sm.role,
        familyMember: sm.family_members ? {
          id: sm.family_members.id,
          firstName: sm.family_members.first_name,
          lastName: sm.family_members.last_name
        } : undefined
      })) || [],
      media: data.story_media?.map((sm: any) => sm.media).filter(Boolean) || []
    };
  }

  private transformEventData(data: any): FamilyEvent {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      eventDate: data.event_date,
      location: data.location,
      lat: data.lat,
      lng: data.lng,
      createdBy: data.creator_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      attrs: data.attrs,
      participants: data.event_participants?.map((ep: any) => ({
        id: ep.id,
        eventId: ep.event_id,
        familyMemberId: ep.family_member_id,
        role: ep.role,
        familyMember: ep.family_members ? {
          id: ep.family_members.id,
          firstName: ep.family_members.first_name,
          lastName: ep.family_members.last_name
        } : undefined
      })) || [],
      media: data.event_media?.map((em: any) => em.media).filter(Boolean) || []
    };
  }
}

export const storyService = new StoryService();
