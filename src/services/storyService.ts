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
  EventWithPeople,
  Artifact,
  CreateArtifactRequest,
  UpdateArtifactRequest,
  Media
} from '@/types/stories';
import { isCurrentUserAdmin } from './userService';

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

      // Create the story - use .select() without .single() to handle RLS edge cases
      const insertResult = await supabase
        .from('family_stories')
        .insert({
          title: request.title,
          content: request.content,
          date: request.date || null,
          location: request.location || null,
          lat: request.lat || null,
          lng: request.lng || null,
          author_id: user.id
        })
        .select('id');

      if (insertResult.error) {
        console.error('Error creating story:', insertResult.error);
        return { 
          success: false, 
          error: `Failed to create story in database: ${insertResult.error.message}` 
        };
      }

      // Handle case where RLS might block the select
      let storyId: string | null = null;
      if (insertResult.data && insertResult.data.length > 0) {
        storyId = insertResult.data[0].id;
      } else {
        // If select was blocked by RLS, try to get the story ID by querying for the most recent story by this author
        // This is a fallback in case RLS blocks the select after insert
        const { data: recentStories } = await supabase
          .from('family_stories')
          .select('id')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (recentStories && recentStories.length > 0) {
          storyId = recentStories[0].id;
          console.log('Retrieved story ID via fallback query:', storyId);
        }
      }

      if (!storyId) {
        console.error('Story insert may have succeeded but could not retrieve story ID');
        return { 
          success: false, 
          error: 'Story was created but could not be retrieved. Please refresh the page to see your story.' 
        };
      }

      const storyData = { id: storyId };

      // Add story members
      if (request.relatedMembers && request.relatedMembers.length > 0) {
        const { error: membersError } = await supabase
          .from('story_members')
          .insert(
            request.relatedMembers.map(member => ({
              story_id: storyId,
              family_member_id: member.familyMemberId
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
              story_id: storyId,
              media_id: mediaId
            }))
          );

        if (mediaError) {
          console.error('Error adding story media:', mediaError);
        }
      }

      // Add artifacts if provided
      if (request.artifactIds && request.artifactIds.length > 0) {
        const { error: artifactsError } = await (supabase as any)
          .from('story_artifacts')
          .insert(
            request.artifactIds.map(artifactId => ({
              story_id: storyId,
              artifact_id: artifactId
            }))
          );

        if (artifactsError) {
          console.error('Error adding story artifacts:', artifactsError);
        }
      }

      // Add groups if provided
      if (request.groupIds && request.groupIds.length > 0) {
        const { error: groupsError } = await (supabase as any)
          .from('story_groups')
          .insert(
            request.groupIds.map(groupId => ({
              story_id: storyId,
              family_group_id: groupId
            }))
          );

        if (groupsError) {
          console.error('Error adding story groups:', groupsError);
        }
      }

      // Fetch the complete story
      const completeStory = await this.getStory(storyId);
      if (!completeStory) {
        console.error('Story was created but could not be fetched. Story ID:', storyData.id);
        // Return a basic story object with the data we have
        return {
          success: true,
          story: {
            id: storyId,
            title: request.title,
            content: request.content,
            date: request.date || undefined,
            authorId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            location: request.location,
            lat: request.lat,
            lng: request.lng,
            relatedMembers: request.relatedMembers?.map(m => ({
              id: '',
              storyId: storyId,
              familyMemberId: m.familyMemberId,
              role: m.role || 'participant'
            })) || [],
            media: [],
            artifacts: []
          } as FamilyStory
        };
      }
      return { success: true, story: completeStory };
    } catch (error) {
      console.error('Error creating story:', error);
      return { success: false, error: 'An unexpected error occurred while creating the story' };
    }
  }

  async getStory(storyId: string): Promise<FamilyStory | null> {
    try {
      if (!storyId) {
        console.error('getStory: storyId is required');
        return null;
      }

      console.log('getStory: Fetching story with ID:', storyId);
      
      // First, fetch the story with members and media (matching getAllStories structure)
      let { data, error } = await supabase
        .from('family_stories')
        .select(`
          *,
          story_members (
            id,
            family_member_id,
            role,
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
        .maybeSingle();

      // If no data returned, check if it's a permissions/RLS issue
      if (!data && !error) {
        console.error('getStory: No data returned and no error. This may be an RLS policy issue. Story ID:', storyId);
        return null;
      }

      // If error is about missing location columns, retry with explicit columns
      if (error && (error.message?.includes("'location' column") || 
                    error.message?.includes("'lat' column") || 
                    error.message?.includes("'lng' column"))) {
        console.warn('getStory: Location columns not available in schema cache, fetching without them');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('family_stories')
          .select(`
            id,
            title,
            content,
            date,
            author_id,
            created_at,
            updated_at,
            attrs,
            story_members (
              id,
              family_member_id,
              role,
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
          .maybeSingle();
        
        if (fallbackError) {
          console.error('Error fetching story (fallback):', fallbackError);
          return null;
        }
        
        if (!fallbackData) {
          console.error('Story not found after fallback query. Story ID:', storyId);
          return null;
        }
        // Set location fields to undefined since they don't exist
        if (fallbackData) {
          data = fallbackData as any;
          (data as any).location = undefined;
          (data as any).lat = undefined;
          (data as any).lng = undefined;
        }
        error = null;
      } else if (error) {
        console.error('Error fetching story:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      if (!data) {
        console.warn('getStory: No data returned for story ID:', storyId);
        return null;
      }

      // Fetch artifacts separately to avoid PostgREST schema cache issues
      let artifacts: Artifact[] = [];
      try {
        // First, get artifact IDs from story_artifacts
        const { data: storyArtifactsData, error: storyArtifactsError } = await (supabase as any)
          .from('story_artifacts')
          .select('artifact_id')
          .eq('story_id', storyId);

        // If story_artifacts table doesn't exist in PostgREST schema cache, skip artifacts
        if (storyArtifactsError) {
          if (storyArtifactsError.code === '42P01' || 
              storyArtifactsError.message?.includes('does not exist') ||
              storyArtifactsError.message?.includes('relation') ||
              storyArtifactsError.status === 404 ||
              storyArtifactsError.statusCode === 404) {
            console.warn('getStory: story_artifacts table not available in PostgREST schema cache. Skipping artifacts.');
            artifacts = [];
          } else {
            // Other errors - log but continue
            console.warn('getStory: Error fetching story_artifacts:', storyArtifactsError);
            artifacts = [];
          }
        } else if (storyArtifactsData && storyArtifactsData.length > 0) {
          const artifactIds = storyArtifactsData.map((sa: any) => sa.artifact_id).filter(Boolean);
          
          // Fetch artifacts
          const { data: artifactsData, error: artifactsError } = await (supabase as any)
            .from('artifacts')
            .select('*')
            .in('id', artifactIds);

          // If artifacts table doesn't exist, skip artifacts
          if (artifactsError) {
            if (artifactsError.code === '42P01' || 
                artifactsError.message?.includes('does not exist') ||
                artifactsError.message?.includes('relation') ||
                artifactsError.status === 404 ||
                artifactsError.statusCode === 404) {
              console.warn('getStory: artifacts table not available in PostgREST schema cache. Skipping artifacts.');
              artifacts = [];
            } else {
              // Other errors - log but continue
              console.warn('getStory: Error fetching artifacts:', artifactsError);
              artifacts = [];
            }
          } else if (artifactsData && artifactsData.length > 0) {
            // Fetch media for all artifacts separately
            const mediaMap: Record<string, Media[]> = {};
            try {
              // First get artifact_media relationships
              const { data: artifactMediaData, error: artifactMediaError } = await (supabase as any)
                .from('artifact_media')
                .select('artifact_id, media_id')
                .in('artifact_id', artifactIds);

              // If artifact_media table doesn't exist, continue without media
              if (artifactMediaError) {
                if (artifactMediaError.code === '42P01' || 
                    artifactMediaError.message?.includes('does not exist') ||
                    artifactMediaError.message?.includes('relation') ||
                    artifactMediaError.status === 404 ||
                    artifactMediaError.statusCode === 404) {
                  console.warn('getStory: artifact_media table not available. Continuing without artifact media.');
                  // Continue without media - artifacts will still be returned
                } else {
                  console.warn('getStory: Error fetching artifact_media:', artifactMediaError);
                }
              } else if (artifactMediaData && artifactMediaData.length > 0) {
                const mediaIds = artifactMediaData.map((am: any) => am.media_id).filter(Boolean);
                
                // Then fetch the actual media
                if (mediaIds.length > 0) {
                  const { data: mediaData, error: mediaError } = await (supabase as any)
                    .from('media')
                    .select('*')
                    .in('id', mediaIds);

                  if (!mediaError && mediaData) {
                    // Create a map of media_id to media
                    const mediaById: Record<string, Media> = {};
                    mediaData.forEach((m: any) => {
                      mediaById[m.id] = m;
                    });

                    // Group media by artifact_id
                    artifactMediaData.forEach((am: any) => {
                      if (am.artifact_id && am.media_id && mediaById[am.media_id]) {
                        if (!mediaMap[am.artifact_id]) {
                          mediaMap[am.artifact_id] = [];
                        }
                        mediaMap[am.artifact_id].push(mediaById[am.media_id]);
                      }
                    });
                  }
                }
              }
            } catch (mediaErr) {
              console.warn('getStory: Could not fetch artifact media:', mediaErr);
            }

            // Transform artifacts and add media
            artifacts = artifactsData
              .map((artifactData: any) => {
                const artifact = this.transformArtifactData(artifactData);
                if (artifact) {
                  artifact.media = mediaMap[artifact.id] || [];
                }
                return artifact;
              })
              .filter(Boolean);
          } else {
            artifacts = [];
          }
        }
      } catch (artifactsErr: any) {
        // If it's a "table doesn't exist" error, that's okay - artifacts feature may not be available
        if (artifactsErr?.code === '42P01' || 
            artifactsErr?.message?.includes('does not exist') ||
            artifactsErr?.message?.includes('relation') ||
            artifactsErr?.status === 404 ||
            artifactsErr?.statusCode === 404) {
          console.warn('getStory: Artifacts tables not available in PostgREST schema cache. Continuing without artifacts.');
          artifacts = [];
        } else {
          console.warn('getStory: Could not fetch artifacts, continuing without them:', artifactsErr);
          artifacts = [];
        }
        // Continue without artifacts - not critical for story display
      }

      // Fetch groups separately
      let groups: Array<{ id: string; name: string; description?: string }> = [];
      try {
        const { data: storyGroupsData, error: storyGroupsError } = await (supabase as any)
          .from('story_groups')
          .select(`
            family_group_id,
            family_groups:family_group_id (
              id,
              name,
              description
            )
          `)
          .eq('story_id', storyId);

        if (!storyGroupsError && storyGroupsData) {
          groups = storyGroupsData
            .map((sg: any) => {
              const group = sg.family_groups;
              if (!group) return null;
              return {
                id: group.id,
                name: group.name,
                description: group.description || undefined
              };
            })
            .filter((g: any): g is { id: string; name: string; description?: string } => g !== null);
        }
      } catch (groupsErr) {
        console.warn('getStory: Could not fetch groups, continuing without them:', groupsErr);
      }

      console.log('getStory: Successfully fetched story:', data.id);
      const story = this.transformStoryData(data);
      // Add artifacts and groups to the story
      if (story) {
        story.artifacts = artifacts;
        story.groups = groups;
      }
      return story;
    } catch (error) {
      console.error('Error fetching story (exception):', error);
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
            family_member_id,
            role,
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

  /**
   * Update an existing story
   * IMPORTANT: This function should NOT create any timeline events.
   * Only new stories (createStory) should appear in the timeline.
   * Story updates should not add new events to the timeline.
   */
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

      // Check if user is admin - admins can edit any story
      const isAdmin = await isCurrentUserAdmin();
      
      // Update the story
      const updateData: any = {};
      if (request.title !== undefined) updateData.title = request.title;
      if (request.content !== undefined) updateData.content = request.content;
      if (request.date !== undefined) updateData.date = request.date;
      if (request.location !== undefined) updateData.location = request.location;
      
      // Only include lat/lng if they are valid numbers (not null, undefined, or NaN)
      // This prevents errors if the columns don't exist in the schema cache
      if (request.lat !== undefined && request.lat !== null && !isNaN(request.lat)) {
        updateData.lat = request.lat;
      }
      if (request.lng !== undefined && request.lng !== null && !isNaN(request.lng)) {
        updateData.lng = request.lng;
      }
      // attrs may not exist on some DBs; avoid updating it for compatibility

      // Build the query - admins can update any story, others can only update their own
      let updateQuery = supabase
        .from('family_stories')
        .update(updateData)
        .eq('id', request.id);
      
      // Only enforce author_id check if user is not admin
      // RLS policies will handle the actual permission enforcement
      if (!isAdmin) {
        updateQuery = updateQuery.eq('author_id', user.id);
      }

      const { error: storyError } = await updateQuery;

      if (storyError) {
        // If the error is about missing location columns, try updating without them
        if (storyError.message?.includes("'location' column") || 
            storyError.message?.includes("'lat' column") || 
            storyError.message?.includes("'lng' column")) {
          console.warn('Location columns not available in schema cache, updating without location data');
          const fallbackData = { ...updateData };
          delete fallbackData.location;
          delete fallbackData.lat;
          delete fallbackData.lng;
          
          let fallbackQuery = supabase
            .from('family_stories')
            .update(fallbackData)
            .eq('id', request.id);
          
          if (!isAdmin) {
            fallbackQuery = fallbackQuery.eq('author_id', user.id);
          }
          
          const { error: fallbackError } = await fallbackQuery;
          if (fallbackError) {
            return { success: false, error: 'Failed to update story in database' };
          }
        } else {
          return { success: false, error: 'Failed to update story in database' };
        }
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
                family_member_id: member.familyMemberId
              }))
            );

          if (membersError) {
            console.error('Error updating story members:', membersError);
          }
        }
      }

      // Update media if provided
      if (request.mediaIds !== undefined) {
        try {
          // Delete existing media
          const { error: deleteMediaError } = await supabase
            .from('story_media')
            .delete()
            .eq('story_id', request.id);

          if (deleteMediaError) {
            console.error('Error deleting story media:', deleteMediaError);
          }

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
        } catch (mediaErr) {
          console.error('Error updating story media:', mediaErr);
        }
      }

      // Update groups if provided
      if (request.groupIds !== undefined) {
        try {
          // Delete existing groups
          const { error: deleteGroupsError } = await (supabase as any)
            .from('story_groups')
            .delete()
            .eq('story_id', request.id);

          if (deleteGroupsError) {
            console.error('Error deleting story groups:', deleteGroupsError);
          }

          // Add new groups
          if (request.groupIds.length > 0) {
            const { error: groupsError } = await (supabase as any)
              .from('story_groups')
              .insert(
                request.groupIds.map(groupId => ({
                  story_id: request.id,
                  family_group_id: groupId
                }))
              );

            if (groupsError) {
              console.error('Error updating story groups:', groupsError);
            }
          }
        } catch (groupsErr) {
          console.error('Error updating story groups:', groupsErr);
        }
      }

      // Update artifacts if provided
      if (request.artifactIds !== undefined) {
        try {
          // Add timeout to prevent hanging - wrap the entire operation
          const artifactUpdatePromise = (async () => {
            // Delete existing artifacts
            const { error: deleteError } = await (supabase as any)
              .from('story_artifacts')
              .delete()
              .eq('story_id', request.id);

            // If table doesn't exist, skip artifact updates
            if (deleteError) {
              if (deleteError.code === '42P01' || 
                  deleteError.code === 'PGRST204' ||
                  deleteError.message?.includes('does not exist') ||
                  deleteError.message?.includes('relation') ||
                  deleteError.message?.includes("'story_artifacts'") ||
                  deleteError.status === 404 ||
                  deleteError.statusCode === 404) {
                console.warn('updateStory: story_artifacts table not available in PostgREST schema cache. Skipping artifact updates.');
                return; // Exit early if table doesn't exist
              } else {
                console.error('Error deleting story artifacts:', deleteError);
                return; // Exit early on other errors
              }
            }

            // Add new artifacts only if delete succeeded
            if (request.artifactIds.length > 0) {
              const { error: artifactsError } = await (supabase as any)
                .from('story_artifacts')
                .insert(
                  request.artifactIds.map(artifactId => ({
                    story_id: request.id,
                    artifact_id: artifactId
                  }))
                );

              if (artifactsError) {
                if (artifactsError.code === 'PGRST204' ||
                    artifactsError.message?.includes("'story_artifacts'")) {
                  console.warn('updateStory: story_artifacts insert failed. Continuing without artifacts.');
                } else {
                  console.error('Error updating story artifacts:', artifactsError);
                }
              }
            }
          })();

          // Race against timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Artifact update timeout after 5 seconds')), 5000)
          );

          await Promise.race([artifactUpdatePromise, timeoutPromise]);
        } catch (artifactsErr: any) {
          // If it's a "table doesn't exist" error or timeout, that's okay - artifacts feature may not be available
          if (artifactsErr?.code === '42P01' || 
              artifactsErr?.code === 'PGRST204' ||
              artifactsErr?.message?.includes('does not exist') ||
              artifactsErr?.message?.includes('relation') ||
              artifactsErr?.message?.includes('timeout') ||
              artifactsErr?.message?.includes("'story_artifacts'") ||
              artifactsErr?.status === 404 ||
              artifactsErr?.statusCode === 404) {
            console.warn('updateStory: story_artifacts table not available or timeout. Skipping artifact updates.');
          } else {
            console.error('Error updating story artifacts:', artifactsErr);
          }
        }
      }

      // Fetch the updated story with timeout
      try {
        const getStoryPromise = this.getStory(request.id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getStory timeout after 10 seconds')), 10000)
        );

        const updatedStory = await Promise.race([getStoryPromise, timeoutPromise]) as FamilyStory | null;
        if (!updatedStory) {
          console.warn('updateStory: getStory returned null, but update succeeded');
          // Still return success since the update worked
          return { success: true, error: 'Story updated but could not fetch updated data' };
        }
        return { success: true, story: updatedStory };
      } catch (getStoryError) {
        console.error('Error fetching updated story:', getStoryError);
        // Still return success since the update worked
        return { success: true, error: 'Story updated but could not fetch updated data' };
      }
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

      // Check if user is admin - admins can delete any story
      const isAdmin = await isCurrentUserAdmin();
      
      // Build the delete query - admins can delete any story, others can only delete their own
      let deleteQuery = supabase
        .from('family_stories')
        .delete()
        .eq('id', storyId);
      
      // Only enforce author_id check if user is not admin
      // RLS policies will handle the actual permission enforcement
      if (!isAdmin) {
        deleteQuery = deleteQuery.eq('author_id', user.id);
      }

      const { error } = await deleteQuery;

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
              family_member_id: participant.familyMemberId
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
      // Note: This RPC function may not exist yet - using view instead
      const { data, error } = await (supabase as any)
        .from('v_member_timeline')
        .select('*')
        .eq('member_id', memberId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching member timeline:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        memberId: item.member_id,
        itemType: item.item_type,
        itemId: item.item_id,
        title: item.title,
        date: item.date,
        location: item.location,
        lat: item.lat,
        lng: item.lng,
        description: item.description,
        content: item.content
      }));
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

  // Artifact Management
  async createArtifact(request: CreateArtifactRequest): Promise<{ success: boolean; artifact?: Artifact; error?: string }> {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData.session?.user ?? null;
      }
      if (!user) {
        return { success: false, error: 'You must be logged in to create artifacts' };
      }

      const { data: artifactData, error: artifactError } = await (supabase as any)
        .from('artifacts')
        .insert({
          name: request.name,
          description: request.description,
          artifact_type: request.artifactType,
          date_created: request.dateCreated || null,
          date_acquired: request.dateAcquired || null,
          condition: request.condition,
          location_stored: request.locationStored,
          owner_id: user.id
        })
        .select('id')
        .single();

      if (artifactError) {
        // Check if it's a "table doesn't exist" error (PostgREST schema cache issue)
        if (artifactError.code === '42P01' || 
            artifactError.message?.includes('does not exist') ||
            artifactError.message?.includes('relation') ||
            artifactError.status === 404 ||
            artifactError.statusCode === 404 ||
            (artifactError as any)?.code === 'PGRST200') {
          console.error('createArtifact: artifacts table not available in PostgREST schema cache:', artifactError);
          return { 
            success: false, 
            error: 'Artifacts feature is not available. The artifacts table exists but PostgREST cannot see it. Please restart Supabase (supabase stop && supabase start) to refresh the schema cache.' 
          };
        }
        console.error('createArtifact: Error creating artifact:', artifactError);
        return { 
          success: false, 
          error: artifactError.message || 'Failed to create artifact' 
        };
      }

      // Add media if provided
      if (request.mediaIds && request.mediaIds.length > 0) {
        const { error: mediaError } = await (supabase as any)
          .from('artifact_media')
          .insert(
            request.mediaIds.map(mediaId => ({
              artifact_id: artifactData.id,
              media_id: mediaId
            }))
          );

        if (mediaError) {
          console.error('Error adding artifact media:', mediaError);
        }
      }

      const artifact = await this.getArtifact(artifactData.id);
      return { success: true, artifact: artifact || undefined };
    } catch (error) {
      console.error('Error creating artifact:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getArtifact(artifactId: string): Promise<Artifact | null> {
    try {
      // Fetch artifact first
      const { data, error } = await (supabase as any)
        .from('artifacts')
        .select('*')
        .eq('id', artifactId)
        .single();

      if (error) {
        // If table doesn't exist (PostgREST schema cache issue), return null
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('getArtifact: artifacts table not available in PostgREST schema cache.');
          return null;
        }
        console.error('Error fetching artifact:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Fetch artifact media separately
      let media: Media[] = [];
      try {
        // First get artifact_media relationships
        const { data: artifactMediaData, error: artifactMediaError } = await (supabase as any)
          .from('artifact_media')
          .select('media_id')
          .eq('artifact_id', artifactId);

        // If artifact_media table doesn't exist, continue without media
        if (artifactMediaError && (artifactMediaError.code === '42P01' || artifactMediaError.message?.includes('does not exist'))) {
          console.warn('getArtifact: artifact_media table not available. Continuing without media.');
          media = [];
        } else if (!artifactMediaError && artifactMediaData && artifactMediaData.length > 0) {
          const mediaIds = artifactMediaData.map((am: any) => am.media_id).filter(Boolean);
          
          // Then fetch the actual media
          if (mediaIds.length > 0) {
            const { data: mediaData, error: mediaError } = await (supabase as any)
              .from('media')
              .select('*')
              .in('id', mediaIds);

            if (!mediaError && mediaData) {
              media = mediaData;
            }
          }
        }
      } catch (mediaErr) {
        console.warn('getArtifact: Could not fetch artifact media:', mediaErr);
      }

      const artifact = this.transformArtifactData(data);
      if (artifact) {
        artifact.media = media;
      }
      return artifact;
    } catch (error) {
      console.error('Error fetching artifact:', error);
      return null;
    }
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    try {
      // Fetch artifacts first
      const { data, error } = await (supabase as any)
        .from('artifacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching artifacts:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Fetch artifact media separately for all artifacts
      const artifactIds = data.map((a: any) => a.id);
      const mediaMap: Record<string, Media[]> = {};

      try {
        // First get artifact_media relationships
        const { data: artifactMediaData, error: artifactMediaError } = await (supabase as any)
          .from('artifact_media')
          .select('artifact_id, media_id')
          .in('artifact_id', artifactIds);

        if (!artifactMediaError && artifactMediaData && artifactMediaData.length > 0) {
          const mediaIds = artifactMediaData.map((am: any) => am.media_id).filter(Boolean);
          
          // Then fetch the actual media
          if (mediaIds.length > 0) {
            const { data: mediaData, error: mediaError } = await (supabase as any)
              .from('media')
              .select('*')
              .in('id', mediaIds);

            if (!mediaError && mediaData) {
              // Create a map of media_id to media
              const mediaById: Record<string, Media> = {};
              mediaData.forEach((m: any) => {
                mediaById[m.id] = m;
              });

              // Group media by artifact_id
              artifactMediaData.forEach((am: any) => {
                if (am.artifact_id && am.media_id && mediaById[am.media_id]) {
                  if (!mediaMap[am.artifact_id]) {
                    mediaMap[am.artifact_id] = [];
                  }
                  mediaMap[am.artifact_id].push(mediaById[am.media_id]);
                }
              });
            }
          }
        }
      } catch (mediaErr) {
        console.warn('getAllArtifacts: Could not fetch artifact media:', mediaErr);
      }

      // Transform artifacts and add media
      return data.map((artifactData: any) => {
        const artifact = this.transformArtifactData(artifactData);
        if (artifact) {
          artifact.media = mediaMap[artifact.id] || [];
        }
        return artifact;
      });
    } catch (error) {
      console.error('Error fetching artifacts:', error);
      return [];
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
      location: data.location,
      lat: data.lat,
      lng: data.lng,
      relatedMembers: data.story_members?.map((sm: any) => ({
        id: sm.id,
        storyId: sm.story_id,
        familyMemberId: sm.family_member_id,
        role: sm.role || 'participant',
        familyMember: sm.family_members ? {
          id: sm.family_members.id,
          firstName: sm.family_members.first_name,
          lastName: sm.family_members.last_name
        } : undefined
      })) || [],
      media: data.story_media?.map((sm: any) => sm.media).filter(Boolean) || [],
      artifacts: data.story_artifacts?.map((sa: any) => this.transformArtifactData(sa.artifacts)).filter(Boolean) || []
    };
  }

  private transformArtifactData(data: any): Artifact {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      artifactType: data.artifact_type,
      dateCreated: data.date_created,
      dateAcquired: data.date_acquired,
      condition: data.condition,
      locationStored: data.location_stored,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      attrs: data.attrs,
      media: data.artifact_media?.map((am: any) => am.media).filter(Boolean) || []
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
        role: ep.role || 'participant',
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
