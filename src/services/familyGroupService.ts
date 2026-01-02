/**
 * Family Group Service
 * 
 * Service for managing family groups (e.g., "Mother's Side", "Father's Side", "In-Laws")
 */

import { supabase } from '@/integrations/supabase/client';
import { FamilyGroup, FamilyMember } from '@/types';

export interface CreateFamilyGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateFamilyGroupRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface AssignMemberToGroupRequest {
  familyMemberId: string;
  familyGroupId: string;
}

class FamilyGroupService {
  private static instance: FamilyGroupService;

  public static getInstance(): FamilyGroupService {
    if (!FamilyGroupService.instance) {
      FamilyGroupService.instance = new FamilyGroupService();
    }
    return FamilyGroupService.instance;
  }

  /**
   * Get all family groups for the current user
   */
  async getAllFamilyGroups(): Promise<FamilyGroup[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('family_groups')
        .select(`
          *,
          family_member_groups(count)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching family groups:', error);
        return [];
      }

      return (data || []).map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        userId: group.user_id,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        memberCount: group.family_member_groups?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('Error fetching family groups:', error);
      return [];
    }
  }

  /**
   * Get a single family group by ID
   */
  async getFamilyGroup(id: string): Promise<FamilyGroup | null> {
    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select(`
          *,
          family_member_groups(count)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching family group:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        memberCount: data.family_member_groups?.[0]?.count || 0
      };
    } catch (error) {
      console.error('Error fetching family group:', error);
      return null;
    }
  }

  /**
   * Create a new family group
   */
  async createFamilyGroup(request: CreateFamilyGroupRequest): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to create family groups'
        };
      }

      // Validate name
      if (!request.name || request.name.trim().length === 0) {
        return {
          success: false,
          error: 'Family group name is required'
        };
      }

      const { data, error } = await supabase
        .from('family_groups')
        .insert({
          name: request.name.trim(),
          description: request.description?.trim() || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating family group:', error);
        return {
          success: false,
          error: error.message || 'Failed to create family group'
        };
      }

      return {
        success: true,
        group: {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          userId: data.user_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          memberCount: 0
        }
      };
    } catch (error) {
      console.error('Error creating family group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a family group
   */
  async updateFamilyGroup(request: UpdateFamilyGroupRequest): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to update family groups'
        };
      }

      const updates: any = {};
      if (request.name !== undefined) {
        if (!request.name || request.name.trim().length === 0) {
          return {
            success: false,
            error: 'Family group name cannot be empty'
          };
        }
        updates.name = request.name.trim();
      }
      if (request.description !== undefined) {
        updates.description = request.description?.trim() || null;
      }

      const { data, error } = await supabase
        .from('family_groups')
        .update(updates)
        .eq('id', request.id)
        .eq('user_id', user.id) // Ensure user owns this group
        .select()
        .single();

      if (error) {
        console.error('Error updating family group:', error);
        return {
          success: false,
          error: error.message || 'Failed to update family group'
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Family group not found or you do not have permission to update it'
        };
      }

      return {
        success: true,
        group: {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          userId: data.user_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (error) {
      console.error('Error updating family group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a family group
   */
  async deleteFamilyGroup(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to delete family groups'
        };
      }

      const { error } = await supabase
        .from('family_groups')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user owns this group

      if (error) {
        console.error('Error deleting family group:', error);
        return {
          success: false,
          error: error.message || 'Failed to delete family group'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting family group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Assign a family member to a group
   */
  async assignMemberToGroup(request: AssignMemberToGroupRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to assign members to groups'
        };
      }

      // Verify the member and group belong to the user
      // First check if member exists, then verify ownership
      const memberCheck = await supabase
        .from('family_members')
        .select('id, user_id, created_by')
        .eq('id', request.familyMemberId)
        .maybeSingle();

      if (memberCheck.error || !memberCheck.data) {
        return {
          success: false,
          error: 'Family member not found'
        };
      }

      // Check ownership - member must have user_id or created_by matching current user
      // If both are null, allow assignment if user owns the group (RLS will enforce security)
      const member = memberCheck.data;
      const isOwner = member.user_id === user.id || member.created_by === user.id;
      const hasNoOwner = member.user_id === null && member.created_by === null;
      
      // If member has no owner but user owns the group, allow assignment
      // The RLS policy on family_member_groups will provide additional security
      if (!isOwner && !hasNoOwner) {
        return {
          success: false,
          error: 'You do not have permission to assign this member to groups'
        };
      }

      // Verify the group belongs to the user
      const groupCheck = await supabase
        .from('family_groups')
        .select('id')
        .eq('id', request.familyGroupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (groupCheck.error || !groupCheck.data) {
        return {
          success: false,
          error: 'Family group not found or you do not have permission'
        };
      }

      const { error } = await supabase
        .from('family_member_groups')
        .insert({
          family_member_id: request.familyMemberId,
          family_group_id: request.familyGroupId
        });

      if (error) {
        // If it's a unique constraint violation, the member is already in the group
        if (error.code === '23505') {
          return {
            success: true // Already assigned, treat as success
          };
        }
        console.error('Error assigning member to group:', error);
        return {
          success: false,
          error: error.message || 'Failed to assign member to group'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning member to group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Remove a family member from a group
   */
  async removeMemberFromGroup(request: AssignMemberToGroupRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to remove members from groups'
        };
      }

      // Verify the group belongs to the user
      const { data: groupData, error: groupError } = await supabase
        .from('family_groups')
        .select('id')
        .eq('id', request.familyGroupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (groupError || !groupData) {
        return {
          success: false,
          error: 'Family group not found or you do not have permission'
        };
      }

      const { error } = await supabase
        .from('family_member_groups')
        .delete()
        .eq('family_member_id', request.familyMemberId)
        .eq('family_group_id', request.familyGroupId);

      if (error) {
        console.error('Error removing member from group:', error);
        return {
          success: false,
          error: error.message || 'Failed to remove member from group'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing member from group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all members in a specific family group
   */
  async getMembersInGroup(groupId: string): Promise<FamilyMember[]> {
    try {
      const { data, error } = await supabase
        .from('family_member_groups')
        .select(`
          family_member_id,
          family_members:family_member_id(*)
        `)
        .eq('family_group_id', groupId);

      if (error) {
        console.error('Error fetching members in group:', error);
        return [];
      }

      // Transform the data to FamilyMember format
      return (data || [])
        .map((item: any) => {
          const member = item.family_members;
          if (!member) return null;
          
          return {
            id: member.id,
            firstName: member.first_name,
            lastName: member.last_name,
            birthDate: member.birth_date || undefined,
            deathDate: member.death_date || undefined,
            birthPlace: member.birth_place || undefined,
            bio: member.bio || undefined,
            avatar: member.avatar_url || undefined,
            gender: member.gender || 'other',
            relations: [],
            createdBy: member.created_by || undefined,
            branchRoot: member.branch_root || undefined,
            isRootMember: member.is_root_member || false
          } as FamilyMember;
        })
        .filter((member: FamilyMember | null): member is FamilyMember => member !== null);
    } catch (error) {
      console.error('Error fetching members in group:', error);
      return [];
    }
  }

  /**
   * Get all groups that a family member belongs to
   */
  async getGroupsForMember(memberId: string): Promise<FamilyGroup[]> {
    try {
      const { data, error } = await supabase
        .from('family_member_groups')
        .select(`
          family_group_id,
          family_groups:family_group_id(*)
        `)
        .eq('family_member_id', memberId);

      if (error) {
        console.error('Error fetching groups for member:', error);
        return [];
      }

      return (data || [])
        .map((item: any) => {
          const group = item.family_groups;
          if (!group) return null;
          
          return {
            id: group.id,
            name: group.name,
            description: group.description || undefined,
            userId: group.user_id,
            createdAt: group.created_at,
            updatedAt: group.updated_at
          } as FamilyGroup;
        })
        .filter((group: FamilyGroup | null): group is FamilyGroup => group !== null);
    } catch (error) {
      console.error('Error fetching groups for member:', error);
      return [];
    }
  }

  /**
   * Filter family members by group IDs
   * Returns member IDs that belong to at least one of the specified groups
   */
  async filterMembersByGroups(groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('family_member_groups')
        .select('family_member_id')
        .in('family_group_id', groupIds);

      if (error) {
        console.error('Error filtering members by groups:', error);
        return [];
      }

      // Return unique member IDs
      return Array.from(new Set((data || []).map((item: any) => item.family_member_id)));
    } catch (error) {
      console.error('Error filtering members by groups:', error);
      return [];
    }
  }
}

export const familyGroupService = FamilyGroupService.getInstance();

