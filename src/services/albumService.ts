import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Album, StoryCategory, CreateAlbumRequest, UpdateAlbumRequest, AlbumFilters } from '@/types/albums';
import type { MediaItem } from './mediaService';

class AlbumService {
  /**
   * Get all albums for the current user
   */
  async getAllAlbums(filters?: AlbumFilters): Promise<Album[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If filters are provided, get matching album IDs first
      let albumIds: string[] | null = null;

      if (filters?.familyGroupId) {
        const { data } = await supabase
          .from('album_family_groups')
          .select('album_id')
          .eq('family_group_id', filters.familyGroupId);
        albumIds = data?.map(a => a.album_id) || [];
        if (albumIds.length === 0) return [];
      }

      if (filters?.familyMemberId) {
        const { data } = await supabase
          .from('album_family_members')
          .select('album_id')
          .eq('family_member_id', filters.familyMemberId);
        const memberAlbumIds = data?.map(a => a.album_id) || [];
        if (memberAlbumIds.length === 0) return [];
        // Intersect with existing filter if any
        albumIds = albumIds ? albumIds.filter(id => memberAlbumIds.includes(id)) : memberAlbumIds;
        if (albumIds.length === 0) return [];
      }

      if (filters?.storyCategoryId) {
        const { data } = await supabase
          .from('album_story_categories')
          .select('album_id')
          .eq('story_category_id', filters.storyCategoryId);
        const categoryAlbumIds = data?.map(a => a.album_id) || [];
        if (categoryAlbumIds.length === 0) return [];
        // Intersect with existing filter if any
        albumIds = albumIds ? albumIds.filter(id => categoryAlbumIds.includes(id)) : categoryAlbumIds;
        if (albumIds.length === 0) return [];
      }

      // Build base query
      let query = supabase
        .from('albums')
        .select(`
          *,
          cover_media:media!albums_cover_media_id_fkey(id, url, media_type),
          album_family_groups(
            family_groups(id, name, description)
          ),
          album_family_members(
            family_members(id, first_name, last_name)
          ),
          album_story_categories(
            story_categories(id, name, description)
          ),
          album_media(media_id)
        `)
        .eq('user_id', user.id);

      // Apply album ID filter if we have one
      if (albumIds && albumIds.length > 0) {
        query = query.in('id', albumIds);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Album interface
      return (data || []).map(album => ({
        id: album.id,
        name: album.name,
        description: album.description,
        coverMediaId: album.cover_media_id,
        coverMedia: album.cover_media ? {
          id: album.cover_media.id,
          url: album.cover_media.url,
          media_type: album.cover_media.media_type
        } : undefined,
        userId: album.user_id,
        createdAt: album.created_at,
        updatedAt: album.updated_at,
        mediaCount: Array.isArray(album.album_media) ? album.album_media.length : 0,
        familyGroups: (album.album_family_groups || []).map((afg: any) => ({
          id: afg.family_groups.id,
          name: afg.family_groups.name,
          description: afg.family_groups.description
        })),
        familyMembers: (album.album_family_members || []).map((afm: any) => ({
          id: afm.family_members.id,
          firstName: afm.family_members.first_name,
          lastName: afm.family_members.last_name
        })),
        storyCategories: (album.album_story_categories || []).map((asc: any) => ({
          id: asc.story_categories.id,
          name: asc.story_categories.name,
          description: asc.story_categories.description
        }))
      }));
    } catch (error) {
      console.error('Error fetching albums:', error);
      toast({
        title: "Error",
        description: "Could not load albums.",
        variant: "destructive"
      });
      return [];
    }
  }

  /**
   * Get a single album by ID with all media
   */
  async getAlbumById(albumId: string): Promise<Album | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          cover_media:media!albums_cover_media_id_fkey(id, url, media_type),
          album_family_groups(
            family_groups(id, name, description)
          ),
          album_family_members(
            family_members(id, first_name, last_name)
          ),
          album_story_categories(
            story_categories(id, name, description)
          ),
          album_media(
            media(id, url, media_type, caption, file_name),
            display_order
          )
        `)
        .eq('id', albumId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        coverMediaId: data.cover_media_id,
        coverMedia: data.cover_media ? {
          id: data.cover_media.id,
          url: data.cover_media.url,
          media_type: data.cover_media.media_type
        } : undefined,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        mediaCount: (data.album_media || []).length,
        familyGroups: (data.album_family_groups || []).map((afg: any) => ({
          id: afg.family_groups.id,
          name: afg.family_groups.name,
          description: afg.family_groups.description
        })),
        familyMembers: (data.album_family_members || []).map((afm: any) => ({
          id: afm.family_members.id,
          firstName: afm.family_members.first_name,
          lastName: afm.family_members.last_name
        })),
        storyCategories: (data.album_story_categories || []).map((asc: any) => ({
          id: asc.story_categories.id,
          name: asc.story_categories.name,
          description: asc.story_categories.description
        })),
        media: (data.album_media || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((am: any) => ({
            id: am.media.id,
            url: am.media.url,
            media_type: am.media.media_type,
            caption: am.media.caption,
            file_name: am.media.file_name,
            display_order: am.display_order
          }))
      };
    } catch (error) {
      console.error('Error fetching album:', error);
      toast({
        title: "Error",
        description: "Could not load album.",
        variant: "destructive"
      });
      return null;
    }
  }

  /**
   * Create a new album
   */
  async createAlbum(request: CreateAlbumRequest): Promise<Album | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create the album
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .insert({
          name: request.name,
          description: request.description,
          cover_media_id: request.coverMediaId,
          user_id: user.id
        })
        .select()
        .single();

      if (albumError) throw albumError;

      const albumId = albumData.id;

      // Add relationships
      if (request.familyGroupIds && request.familyGroupIds.length > 0) {
        const { error: groupsError } = await supabase
          .from('album_family_groups')
          .insert(
            request.familyGroupIds.map(groupId => ({
              album_id: albumId,
              family_group_id: groupId
            }))
          );

        if (groupsError) throw groupsError;
      }

      if (request.familyMemberIds && request.familyMemberIds.length > 0) {
        const { error: membersError } = await supabase
          .from('album_family_members')
          .insert(
            request.familyMemberIds.map(memberId => ({
              album_id: albumId,
              family_member_id: memberId
            }))
          );

        if (membersError) throw membersError;
      }

      if (request.storyCategoryIds && request.storyCategoryIds.length > 0) {
        const { error: categoriesError } = await supabase
          .from('album_story_categories')
          .insert(
            request.storyCategoryIds.map(categoryId => ({
              album_id: albumId,
              story_category_id: categoryId
            }))
          );

        if (categoriesError) throw categoriesError;
      }

      if (request.mediaIds && request.mediaIds.length > 0) {
        const { error: mediaError } = await supabase
          .from('album_media')
          .insert(
            request.mediaIds.map((mediaId, index) => ({
              album_id: albumId,
              media_id: mediaId,
              display_order: index
            }))
          );

        if (mediaError) throw mediaError;
      }

      toast({
        title: "Success",
        description: "Album created successfully."
      });

      // Return the created album
      return await this.getAlbumById(albumId);
    } catch (error) {
      console.error('Error creating album:', error);
      toast({
        title: "Error",
        description: "Could not create album.",
        variant: "destructive"
      });
      return null;
    }
  }

  /**
   * Update an existing album
   */
  async updateAlbum(request: UpdateAlbumRequest): Promise<Album | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update the album
      const updateData: any = {};
      if (request.name !== undefined) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.coverMediaId !== undefined) updateData.cover_media_id = request.coverMediaId;

      if (Object.keys(updateData).length > 0) {
        const { error: albumError } = await supabase
          .from('albums')
          .update(updateData)
          .eq('id', request.id)
          .eq('user_id', user.id);

        if (albumError) throw albumError;
      }

      // Update relationships if provided
      if (request.familyGroupIds !== undefined) {
        // Delete existing relationships
        await supabase
          .from('album_family_groups')
          .delete()
          .eq('album_id', request.id);

        // Insert new relationships
        if (request.familyGroupIds.length > 0) {
          const { error: groupsError } = await supabase
            .from('album_family_groups')
            .insert(
              request.familyGroupIds.map(groupId => ({
                album_id: request.id,
                family_group_id: groupId
              }))
            );

          if (groupsError) throw groupsError;
        }
      }

      if (request.familyMemberIds !== undefined) {
        await supabase
          .from('album_family_members')
          .delete()
          .eq('album_id', request.id);

        if (request.familyMemberIds.length > 0) {
          const { error: membersError } = await supabase
            .from('album_family_members')
            .insert(
              request.familyMemberIds.map(memberId => ({
                album_id: request.id,
                family_member_id: memberId
              }))
            );

          if (membersError) throw membersError;
        }
      }

      if (request.storyCategoryIds !== undefined) {
        await supabase
          .from('album_story_categories')
          .delete()
          .eq('album_id', request.id);

        if (request.storyCategoryIds.length > 0) {
          const { error: categoriesError } = await supabase
            .from('album_story_categories')
            .insert(
              request.storyCategoryIds.map(categoryId => ({
                album_id: request.id,
                story_category_id: categoryId
              }))
            );

          if (categoriesError) throw categoriesError;
        }
      }

      if (request.mediaIds !== undefined) {
        await supabase
          .from('album_media')
          .delete()
          .eq('album_id', request.id);

        if (request.mediaIds.length > 0) {
          const { error: mediaError } = await supabase
            .from('album_media')
            .insert(
              request.mediaIds.map((mediaId, index) => ({
                album_id: request.id,
                media_id: mediaId,
                display_order: index
              }))
            );

          if (mediaError) throw mediaError;
        }
      }

      toast({
        title: "Success",
        description: "Album updated successfully."
      });

      return await this.getAlbumById(request.id);
    } catch (error) {
      console.error('Error updating album:', error);
      toast({
        title: "Error",
        description: "Could not update album.",
        variant: "destructive"
      });
      return null;
    }
  }

  /**
   * Delete an album
   */
  async deleteAlbum(albumId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Album deleted successfully."
      });

      return true;
    } catch (error) {
      console.error('Error deleting album:', error);
      toast({
        title: "Error",
        description: "Could not delete album.",
        variant: "destructive"
      });
      return false;
    }
  }

  /**
   * Add media to an album
   */
  async addMediaToAlbum(albumId: string, mediaIds: string[]): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify album ownership
      const { data: album } = await supabase
        .from('albums')
        .select('id')
        .eq('id', albumId)
        .eq('user_id', user.id)
        .single();

      if (!album) {
        throw new Error('Album not found or access denied');
      }

      // Get current max display_order
      const { data: existingMedia } = await supabase
        .from('album_media')
        .select('display_order')
        .eq('album_id', albumId)
        .order('display_order', { ascending: false })
        .limit(1);

      let nextOrder = 0;
      if (existingMedia && existingMedia.length > 0) {
        nextOrder = (existingMedia[0].display_order || 0) + 1;
      }

      // Insert new media
      const { error } = await supabase
        .from('album_media')
        .insert(
          mediaIds.map((mediaId, index) => ({
            album_id: albumId,
            media_id: mediaId,
            display_order: nextOrder + index
          }))
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media added to album."
      });

      return true;
    } catch (error) {
      console.error('Error adding media to album:', error);
      toast({
        title: "Error",
        description: "Could not add media to album.",
        variant: "destructive"
      });
      return false;
    }
  }

  /**
   * Remove media from an album
   */
  async removeMediaFromAlbum(albumId: string, mediaId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify album ownership
      const { data: album } = await supabase
        .from('albums')
        .select('id')
        .eq('id', albumId)
        .eq('user_id', user.id)
        .single();

      if (!album) {
        throw new Error('Album not found or access denied');
      }

      const { error } = await supabase
        .from('album_media')
        .delete()
        .eq('album_id', albumId)
        .eq('media_id', mediaId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media removed from album."
      });

      return true;
    } catch (error) {
      console.error('Error removing media from album:', error);
      toast({
        title: "Error",
        description: "Could not remove media from album.",
        variant: "destructive"
      });
      return false;
    }
  }

  /**
   * Get all story categories
   */
  async getStoryCategories(): Promise<StoryCategory[]> {
    try {
      const { data, error } = await supabase
        .from('story_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        createdAt: category.created_at
      }));
    } catch (error) {
      console.error('Error fetching story categories:', error);
      return [];
    }
  }

  /**
   * Get albums by family group
   */
  async getAlbumsByFamilyGroup(familyGroupId: string): Promise<Album[]> {
    return this.getAllAlbums({ familyGroupId });
  }

  /**
   * Get albums by family member
   */
  async getAlbumsByFamilyMember(familyMemberId: string): Promise<Album[]> {
    return this.getAllAlbums({ familyMemberId });
  }

  /**
   * Get albums by story category
   */
  async getAlbumsByStoryCategory(storyCategoryId: string): Promise<Album[]> {
    return this.getAllAlbums({ storyCategoryId });
  }
}

export const albumService = new AlbumService();

