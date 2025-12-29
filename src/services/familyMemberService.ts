/**
 * Family Member Service
 * 
 * A simplified service for managing family members with proper validation
 * and error handling.
 */

import { supabase } from '@/integrations/supabase/client';
import { FamilyMember, GeoLocation } from '@/types';
import { toast } from 'sonner';

export interface CreateFamilyMemberRequest {
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  bio?: string;
  gender: 'male' | 'female' | 'other';
  location?: GeoLocation;
}

export interface UpdateFamilyMemberRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  location?: GeoLocation;
}

class FamilyMemberService {
  private static instance: FamilyMemberService;

  public static getInstance(): FamilyMemberService {
    if (!FamilyMemberService.instance) {
      FamilyMemberService.instance = new FamilyMemberService();
    }
    return FamilyMemberService.instance;
  }

  /**
   * Create a new family member
   */
  async createFamilyMember(request: CreateFamilyMemberRequest): Promise<{ success: boolean; member?: FamilyMember; error?: string }> {
    try {
      console.log('🔍 createFamilyMember called with:', {
        firstName: request.firstName,
        lastName: request.lastName,
        birthDate: request.birthDate,
        birthDateType: typeof request.birthDate
      });

      // Validate the request
      const validation = this.validateCreateRequest(request);
      console.log('🔍 Validation result:', validation);
      
      if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors);
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Check for duplicates
      const duplicateCheck = await this.checkForDuplicate(request);
      if (!duplicateCheck.isValid) {
        return {
          success: false,
          error: duplicateCheck.error
        };
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          error: 'You must be logged in to create family members'
        };
      }

      // Create the family member
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert({
          first_name: request.firstName,
          last_name: request.lastName,
          birth_date: request.birthDate || null,
          death_date: request.deathDate || null,
          birth_place: request.birthPlace || null,
          bio: request.bio || null,
          gender: request.gender,
          created_by: user.id,
          branch_root: null, // Will be set after creation
          is_root_member: false
        })
        .select('id')
        .single();

      if (memberError) {
        console.error('Error creating family member:', memberError);
        return {
          success: false,
          error: 'Failed to create family member in database'
        };
      }

      // Set branch root
      await this.setBranchRoot(memberData.id, user.id);

      // Add location if provided
      if (request.location) {
        await this.addLocation(memberData.id, request.location);
      }

      // Fetch the complete member data
      const completeMember = await this.getFamilyMember(memberData.id);
      
      if (completeMember) {
        toast.success('Family member created successfully', {
          description: `${request.firstName} ${request.lastName} has been added to your family tree`
        });
      }

      return {
        success: true,
        member: completeMember
      };

    } catch (error) {
      console.error('Error creating family member:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get a family member by ID
   */
  async getFamilyMember(id: string): Promise<FamilyMember | null> {
    try {
      const { data: member, error } = await supabase
        .from('family_members')
        .select(`
          *,
          relations_from:relations!from_member_id(
            id,
            relation_type,
            to_member_id,
            to_member:family_members!to_member_id(*)
          ),
          locations(*)
        `)
        .eq('id', id)
        .single();

      if (error || !member) {
        return null;
      }

      return this.transformMemberData(member);

    } catch (error) {
      console.error('Error fetching family member:', error);
      return null;
    }
  }

  /**
   * Get all family members
   */
  async getAllFamilyMembers(): Promise<FamilyMember[]> {
    try {
      const { data: members, error } = await supabase
        .from('family_members')
        .select(`
          *,
          relations_from:relations!from_member_id(
            id,
            relation_type,
            to_member_id,
            to_member:family_members!to_member_id(*)
          ),
          locations(*)
        `)
        .order('first_name');

      if (error || !members) {
        return [];
      }

      return members.map(member => this.transformMemberData(member));

    } catch (error) {
      console.error('Error fetching family members:', error);
      return [];
    }
  }

  /**
   * Update a family member
   */
  async updateFamilyMember(request: UpdateFamilyMemberRequest): Promise<{ success: boolean; member?: FamilyMember; error?: string }> {
    try {
      // Validate the request
      const validation = this.validateUpdateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Update the family member
      const updateData: any = {};
      if (request.firstName !== undefined) updateData.first_name = request.firstName;
      if (request.lastName !== undefined) updateData.last_name = request.lastName;
      if (request.birthDate !== undefined) updateData.birth_date = request.birthDate || null;
      if (request.deathDate !== undefined) updateData.death_date = request.deathDate || null;
      if (request.birthPlace !== undefined) updateData.birth_place = request.birthPlace || null;
      if (request.bio !== undefined) updateData.bio = request.bio || null;
      if (request.gender !== undefined) updateData.gender = request.gender;

      const { error: updateError } = await supabase
        .from('family_members')
        .update(updateData)
        .eq('id', request.id);

      if (updateError) {
        console.error('Error updating family member:', updateError);
        return {
          success: false,
          error: 'Failed to update family member'
        };
      }

      // Update location if provided
      if (request.location) {
        await this.updateLocation(request.id, request.location);
      }

      // Fetch the updated member
      const updatedMember = await this.getFamilyMember(request.id);
      
      if (updatedMember) {
        toast.success('Family member updated successfully');
      }

      return {
        success: true,
        member: updatedMember
      };

    } catch (error) {
      console.error('Error updating family member:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Delete a family member
   */
  async deleteFamilyMember(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          error: 'You must be logged in to delete family members'
        };
      }

      // Check if user has permission to delete this member
      const { data: member, error: fetchError } = await supabase
        .from('family_members')
        .select('created_by, first_name, last_name')
        .eq('id', id)
        .single();

      if (fetchError || !member) {
        return {
          success: false,
          error: 'Family member not found'
        };
      }

      // For now, allow deletion if user created the member or is admin
      // In a more sophisticated system, you'd check user roles here
      if (member.created_by !== user.id) {
        return {
          success: false,
          error: 'You can only delete family members you created'
        };
      }

      // Delete the family member (this will cascade delete relationships and locations)
      const { error: deleteError } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting family member:', deleteError);
        return {
          success: false,
          error: 'Failed to delete family member'
        };
      }

      toast.success('Family member deleted', {
        description: `${member.first_name} ${member.last_name} has been removed from your family tree`
      });

      return { success: true };

    } catch (error) {
      console.error('Error deleting family member:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  // Private helper methods

  private validateCreateRequest(request: CreateFamilyMemberRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!request.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (request.birthDate && request.deathDate) {
      const birthDate = new Date(request.birthDate);
      const deathDate = new Date(request.deathDate);
      
      if (birthDate >= deathDate) {
        errors.push('Death date must be after birth date');
      }
    }

    if (request.birthDate) {
      const birthDate = new Date(request.birthDate);
      const now = new Date();
      
      console.log('🔍 Birth date validation:', {
        rawBirthDate: request.birthDate,
        parsedBirthDate: birthDate.toString(),
        parsedBirthDateISO: birthDate.toISOString(),
        now: now.toString(),
        nowISO: now.toISOString(),
        isValid: !isNaN(birthDate.getTime()),
        isFuture: birthDate > now,
        timeDifference: birthDate.getTime() - now.getTime(),
        timeDifferenceDays: (birthDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      });
      
      // Check if the date is valid
      if (isNaN(birthDate.getTime())) {
        console.log('❌ Invalid birth date format');
        errors.push('Invalid birth date format');
      } else {
        // Only check if birth date is in the future if it's more than 1 day ahead
        // This accounts for timezone differences and date parsing issues
        const oneDayInMs = 24 * 60 * 60 * 1000;
        const isFutureWithBuffer = birthDate.getTime() > now.getTime() + oneDayInMs;
        console.log('🔍 Future check:', {
          isFutureWithBuffer,
          oneDayInMs,
          birthDateTime: birthDate.getTime(),
          nowTime: now.getTime(),
          nowTimePlusOneDay: now.getTime() + oneDayInMs
        });
        
        if (isFutureWithBuffer) {
          console.log('❌ Birth date is in the future');
          errors.push('Birth date cannot be in the future');
        } else {
          console.log('✅ Birth date validation passed');
        }
      }
    }

    if (request.deathDate) {
      const deathDate = new Date(request.deathDate);
      const now = new Date();
      
      // Check if the date is valid
      if (isNaN(deathDate.getTime())) {
        errors.push('Invalid death date format');
      } else {
        // Only check if death date is in the future if it's more than 1 day ahead
        // This accounts for timezone differences and date parsing issues
        const oneDayInMs = 24 * 60 * 60 * 1000;
        if (deathDate.getTime() > now.getTime() + oneDayInMs) {
          errors.push('Death date cannot be in the future');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateUpdateRequest(request: UpdateFamilyMemberRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (request.firstName !== undefined && !request.firstName?.trim()) {
      errors.push('First name cannot be empty');
    }

    if (request.lastName !== undefined && !request.lastName?.trim()) {
      errors.push('Last name cannot be empty');
    }

    if (request.birthDate && request.deathDate) {
      const birthDate = new Date(request.birthDate);
      const deathDate = new Date(request.deathDate);
      
      if (birthDate >= deathDate) {
        errors.push('Death date must be after birth date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for duplicate family members based on name, birth date, and location
   */
  private async checkForDuplicate(request: CreateFamilyMemberRequest): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Get current user to check only their family members
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { isValid: true }; // Skip duplicate check if user not authenticated
      }

      // Build query to find potential duplicates
      let query = supabase
        .from('family_members')
        .select('id, first_name, last_name, birth_date, birth_place')
        .eq('created_by', user.id)
        .ilike('first_name', request.firstName.trim())
        .ilike('last_name', request.lastName.trim());

      // Add birth date filter if provided
      if (request.birthDate) {
        query = query.eq('birth_date', request.birthDate);
      }

      const { data: existingMembers, error } = await query;

      if (error) {
        console.error('Error checking for duplicates:', error);
        return { isValid: true }; // Skip duplicate check on error
      }

      if (!existingMembers || existingMembers.length === 0) {
        return { isValid: true };
      }

      // Check for exact matches
      for (const existing of existingMembers) {
        const isExactMatch = 
          existing.first_name.toLowerCase().trim() === request.firstName.toLowerCase().trim() &&
          existing.last_name.toLowerCase().trim() === request.lastName.toLowerCase().trim() &&
          (request.birthDate ? existing.birth_date === request.birthDate : true);

        if (isExactMatch) {
          // Check location if provided
          if (request.location) {
            const { data: locationData } = await supabase
              .from('locations')
              .select('lat, lng, description')
              .eq('family_member_id', existing.id)
              .eq('current_residence', true)
              .single();

            if (locationData) {
              const latMatch = Math.abs(locationData.lat - request.location.lat) < 0.001;
              const lngMatch = Math.abs(locationData.lng - request.location.lng) < 0.001;
              
              if (latMatch && lngMatch) {
                return {
                  isValid: false,
                  error: `A family member with the same name (${request.firstName} ${request.lastName}), birth date, and location already exists`
                };
              }
            }
          }

          return {
            isValid: false,
            error: `A family member with the same name (${request.firstName} ${request.lastName}) and birth date already exists`
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error in duplicate check:', error);
      return { isValid: true }; // Skip duplicate check on error
    }
  }

  private async setBranchRoot(memberId: string, userId: string): Promise<void> {
    try {
      // Check if this is the first family member for this user
      const { data: existingMembers } = await supabase
        .from('family_members')
        .select('id, branch_root')
        .eq('created_by', userId)
        .neq('id', memberId);

      let branchRoot = memberId; // Default to self
      let isRootMember = true;

      if (existingMembers && existingMembers.length > 0) {
        // Find the root member of the existing branch
        const rootMember = existingMembers.find(m => m.branch_root === m.id);
        if (rootMember) {
          branchRoot = rootMember.id;
          isRootMember = false;
        }
      }

      // Update the member with the correct branch info
      await supabase
        .from('family_members')
        .update({ 
          branch_root: branchRoot, 
          is_root_member: isRootMember 
        })
        .eq('id', memberId);

    } catch (error) {
      console.error('Error setting branch root:', error);
      // Don't throw here, as the member was created successfully
    }
  }

  private async addLocation(memberId: string, location: GeoLocation): Promise<void> {
    try {
      await supabase
        .from('locations')
        .insert({
          family_member_id: memberId,
          lat: location.lat,
          lng: location.lng,
          description: location.description,
          current_residence: true
        });
    } catch (error) {
      console.error('Error adding location:', error);
      // Don't throw here, as the member was created successfully
    }
  }

  private async updateLocation(memberId: string, location: GeoLocation): Promise<void> {
    try {
      // Delete existing locations for this member
      await supabase
        .from('locations')
        .delete()
        .eq('family_member_id', memberId);

      // Add the new location
      await this.addLocation(memberId, location);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  private transformMemberData(member: any): FamilyMember {
    return {
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      birthDate: member.birth_date,
      deathDate: member.death_date,
      birthPlace: member.birth_place,
      bio: member.bio,
      avatar: member.avatar_url,
      gender: member.gender,
      isRootMember: member.is_root_member,
      branchRoot: member.branch_root,
      createdBy: member.created_by,
      relations: member.relations_from?.map((rel: any) => ({
        id: rel.id,
        type: rel.relation_type,
        personId: rel.to_member_id,
        person: rel.to_member
      })) || [],
      currentLocation: member.locations?.[0] ? {
        description: member.locations[0].description,
        lat: member.locations[0].lat,
        lng: member.locations[0].lng
      } : undefined
    };
  }
}

export const familyMemberService = FamilyMemberService.getInstance();
