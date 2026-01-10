/**
 * Family Relationship Manager
 * 
 * A comprehensive, simplified service for managing family relationships
 * with clear validation rules and user-friendly error handling.
 */

import { supabase } from '@/integrations/supabase/client';
import { FamilyMember } from '@/types';
import { toast } from 'sonner';

export type RelationshipType = 'parent' | 'child' | 'spouse' | 'sibling';

export interface RelationshipValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface CreateRelationshipRequest {
  fromMemberId: string;
  toMemberId: string;
  relationshipType: RelationshipType;
  metadata?: {
    marriageDate?: string;
    divorceDate?: string;
    notes?: string;
  };
}

export interface FamilyMemberWithRelations extends FamilyMember {
  relations: Array<{
    id: string;
    type: RelationshipType;
    personId: string;
    person: FamilyMember;
    metadata?: {
      marriageDate?: string;
      divorceDate?: string;
      notes?: string;
    };
  }>;
}

export interface RelationshipDirection {
  fromMemberId: string;
  toMemberId: string;
  relationshipType: RelationshipType;
  currentMemberRole: RelationshipType;
  selectedMemberRole: RelationshipType;
}

/**
 * Determine the correct direction for creating a relationship when the user selects
 * how another family member relates to the currently focused member.
 */
export const resolveRelationshipDirection = (
  currentMemberId: string,
  selectedMemberId: string,
  relationshipType: RelationshipType
): RelationshipDirection => {
  switch (relationshipType) {
    case 'parent':
      return {
        fromMemberId: selectedMemberId,
        toMemberId: currentMemberId,
        relationshipType: 'parent',
        currentMemberRole: 'child',
        selectedMemberRole: 'parent'
      };
    case 'child':
      return {
        fromMemberId: selectedMemberId,
        toMemberId: currentMemberId,
        relationshipType: 'child',
        currentMemberRole: 'parent',
        selectedMemberRole: 'child'
      };
    case 'spouse':
      return {
        fromMemberId: currentMemberId,
        toMemberId: selectedMemberId,
        relationshipType: 'spouse',
        currentMemberRole: 'spouse',
        selectedMemberRole: 'spouse'
      };
    case 'sibling':
      return {
        fromMemberId: currentMemberId,
        toMemberId: selectedMemberId,
        relationshipType: 'sibling',
        currentMemberRole: 'sibling',
        selectedMemberRole: 'sibling'
      };
  }
};

class FamilyRelationshipManager {
  private static instance: FamilyRelationshipManager;
  private metadataColumnSupported: boolean | null = null;

  public static getInstance(): FamilyRelationshipManager {
    if (!FamilyRelationshipManager.instance) {
      FamilyRelationshipManager.instance = new FamilyRelationshipManager();
    }
    return FamilyRelationshipManager.instance;
  }

  private async supportsMetadataColumn(): Promise<boolean> {
    if (this.metadataColumnSupported !== null) {
      return this.metadataColumnSupported;
    }

    try {
      const { error } = await supabase
        .from('relations')
        .select('metadata')
        .limit(1);

      if (error) {
        const message = error.message?.toLowerCase() ?? '';
        if (message.includes('metadata') && message.includes('column')) {
          this.metadataColumnSupported = false;
          return false;
        }

        console.warn('Unable to verify metadata column support:', error);
        this.metadataColumnSupported = false;
        return false;
      }

      this.metadataColumnSupported = true;
      return true;
    } catch (error) {
      console.warn('Error while checking metadata column support:', error);
      this.metadataColumnSupported = false;
      return false;
    }
  }

  private isMetadataColumnMissingError(error: { message?: string }): boolean {
    const message = error?.message?.toLowerCase() ?? '';
    return message.includes('metadata') && message.includes('column');
  }

  /**
   * Validate a potential relationship before creating it
   */
  async validateRelationship(request: CreateRelationshipRequest): Promise<RelationshipValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Get both members
      const { data: members, error } = await supabase
        .from('family_members')
        .select('*')
        .in('id', [request.fromMemberId, request.toMemberId]);

      if (error || !members || members.length !== 2) {
        errors.push('Could not find both family members');
        return { isValid: false, errors, warnings, suggestions };
      }

      const fromMember = members.find(m => m.id === request.fromMemberId);
      const toMember = members.find(m => m.id === request.toMemberId);

      if (!fromMember || !toMember) {
        errors.push('One or both family members not found');
        return { isValid: false, errors, warnings, suggestions };
      }

      // Check if relationship already exists
      const existingRelationship = await this.checkExistingRelationship(
        request.fromMemberId,
        request.toMemberId
      );

      if (existingRelationship) {
        errors.push(`Relationship already exists: ${fromMember.first_name} ${fromMember.last_name} is already ${existingRelationship.type} of ${toMember.first_name} ${toMember.last_name}`);
        return { isValid: false, errors, warnings, suggestions };
      }

      // Validate based on relationship type
      switch (request.relationshipType) {
        case 'parent':
        case 'child':
          this.validateParentChildRelationship(fromMember, toMember, request.relationshipType, errors, warnings, suggestions);
          break;
        case 'spouse':
          this.validateSpouseRelationship(fromMember, toMember, errors, warnings, suggestions);
          break;
        case 'sibling':
          this.validateSiblingRelationship(fromMember, toMember, errors, warnings, suggestions);
          break;
      }

      // Check for circular relationships
      await this.checkCircularRelationship(request.fromMemberId, request.toMemberId, request.relationshipType, errors);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };

    } catch (error) {
      console.error('Error validating relationship:', error);
      errors.push('An unexpected error occurred during validation');
      return { isValid: false, errors, warnings, suggestions };
    }
  }

  /**
   * Create a relationship with automatic direction correction
   */
  async createRelationshipSmart(fromMemberId: string, toMemberId: string, desiredRelationshipType: 'parent' | 'child' | 'spouse' | 'sibling'): Promise<{ success: boolean; relationshipId?: string; error?: string; corrected?: boolean; actualRelationshipType?: RelationshipType }> {
    try {
      // First, try to create the relationship as requested
      const result = await this.createRelationship({
        fromMemberId,
        toMemberId,
        relationshipType: desiredRelationshipType
      });

      if (result.success) {
        return result;
      }

      // If it failed due to age validation, try to suggest the correct direction
      if (desiredRelationshipType === 'parent' || desiredRelationshipType === 'child') {
        const suggestion = await this.suggestRelationshipDirection(fromMemberId, toMemberId, desiredRelationshipType);
        
        if (suggestion && suggestion.suggestedType !== desiredRelationshipType) {
          // Try creating the relationship in the suggested direction
          const correctedResult = await this.createRelationship({
            fromMemberId,
            toMemberId,
            relationshipType: suggestion.suggestedType as 'parent' | 'child'
          });

          if (correctedResult.success) {
            return {
              ...correctedResult,
              corrected: true,
              actualRelationshipType: suggestion.suggestedType
            };
          }
        }
      }

      // If all else fails, return the original error
      return result;
    } catch (error) {
      console.error('Error in createRelationshipSmart:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Create a relationship between two family members
   */
  async createRelationship(request: CreateRelationshipRequest): Promise<{ success: boolean; relationshipId?: string; error?: string }> {
    try {
      // Validate the relationship first
      const validation = await this.validateRelationship(request);
      
      if (!validation.isValid) {
        // Provide more helpful error messages
        let errorMessage = validation.errors.join('; ');
        
        // If there are suggestions, include them in the error message
        if (validation.suggestions.length > 0) {
          errorMessage += '\n\nSuggested solution: ' + validation.suggestions.join('; ');
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      // Show warnings if any (but don't block the relationship)
      if (validation.warnings.length > 0) {
        console.log('⚠️ Relationship created with warnings:', validation.warnings);
        // Note: We don't show toast warnings here to avoid interrupting the user flow
        // The warnings are logged for debugging purposes
      }

      // Determine whether the metadata column is available before inserting
      const metadataSupported = Boolean(request.metadata) && await this.supportsMetadataColumn();

      const basePayload = {
        from_member_id: request.fromMemberId,
        to_member_id: request.toMemberId,
        relation_type: request.relationshipType
      };

      const insertPayload = metadataSupported
        ? { ...basePayload, metadata: request.metadata }
        : basePayload;

      const performInsert = async (payload: Record<string, unknown>) => {
        return supabase
          .from('relations')
          .insert(payload)
          .select('id')
          .single();
      };

      let insertResult = await performInsert(insertPayload);

      if (insertResult.error && metadataSupported && this.isMetadataColumnMissingError(insertResult.error)) {
        // Schema doesn't contain metadata column; remember and retry without it
        this.metadataColumnSupported = false;
        insertResult = await performInsert(basePayload);
      }

      const { data: relationship, error } = insertResult;

      if (error) {
        console.error('Error creating relationship:', error);
        return {
          success: false,
          error: 'Failed to create relationship in database'
        };
      }

      // Note: Reciprocal relationships are now automatically created by database triggers

      return {
        success: true,
        relationshipId: relationship.id
      };

    } catch (error) {
      console.error('Error creating relationship:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get all family members with their relationships
   */
  async getFamilyMembersWithRelations(): Promise<FamilyMemberWithRelations[]> {
    try {
      const metadataSupported = await this.supportsMetadataColumn();
      const relationsSelect = metadataSupported
        ? 'id, relation_type, to_member_id, metadata, to_member:family_members!to_member_id(*)'
        : 'id, relation_type, to_member_id, to_member:family_members!to_member_id(*)';

      const { data: members, error } = await supabase
        .from('family_members')
        .select(`
          *,
          relations_from:relations!from_member_id(
            ${relationsSelect}
          )
        `)
        .order('first_name');

      if (error) {
        console.error('Error fetching family members:', error);
        return [];
      }

      return members.map(member => ({
        ...member,
        relations: member.relations_from.map((rel: any) => {
          const relation: any = {
            id: rel.id,
            type: rel.relation_type,
            personId: rel.to_member_id,
            person: rel.to_member
          };

          if (metadataSupported && typeof rel.metadata !== 'undefined') {
            relation.metadata = rel.metadata;
          }

          return relation;
        })
      }));

    } catch (error) {
      console.error('Error fetching family members with relations:', error);
      return [];
    }
  }

  /**
   * Delete a relationship between two family members
   */
  async deleteRelationship(relationshipId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the relationship to find its reciprocal
      const { data: relationship, error: fetchError } = await supabase
        .from('relations')
        .select('*')
        .eq('id', relationshipId)
        .single();

      if (fetchError || !relationship) {
        console.error('❌ Relationship not found:', relationshipId, fetchError);
        return {
          success: false,
          error: 'Relationship not found'
        };
      }

      console.log('🗑️ Deleting relationship:', {
        id: relationshipId,
        from: relationship.from_member_id,
        to: relationship.to_member_id,
        type: relationship.relation_type
      });

      // Delete the relationship
      const { error: deleteError } = await supabase
        .from('relations')
        .delete()
        .eq('id', relationshipId);

      if (deleteError) {
        console.error('❌ Failed to delete relationship:', deleteError);
        return {
          success: false,
          error: 'Failed to delete relationship'
        };
      }

      // Also delete the reciprocal relationship manually (in case DB trigger doesn't work)
      // The reciprocal is where from/to are swapped
      const reciprocalType = this.getReciprocalRelationshipType(relationship.relation_type as RelationshipType);
      
      if (reciprocalType) {
        console.log('🗑️ Deleting reciprocal relationship:', {
          from: relationship.to_member_id,
          to: relationship.from_member_id,
          type: reciprocalType
        });

        const { error: reciprocalDeleteError } = await supabase
          .from('relations')
          .delete()
          .eq('from_member_id', relationship.to_member_id)
          .eq('to_member_id', relationship.from_member_id)
          .eq('relation_type', reciprocalType);

        if (reciprocalDeleteError) {
          // Log but don't fail - the main relationship was deleted
          console.warn('⚠️ Could not delete reciprocal relationship:', reciprocalDeleteError);
        } else {
          console.log('✅ Reciprocal relationship deleted');
        }
      }

      console.log('✅ Relationship deleted successfully');
      return { success: true };

    } catch (error) {
      console.error('Error deleting relationship:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get all relationships (admin only)
   */
  async getAllRelations(): Promise<Array<{
    id: string;
    fromMemberId: string;
    toMemberId: string;
    relationType: RelationshipType;
    fromMember?: { firstName: string; lastName: string };
    toMember?: { firstName: string; lastName: string };
  }>> {
    try {
      const { data, error } = await supabase
        .from('relations')
        .select(`
          id,
          from_member_id,
          to_member_id,
          relation_type,
          from_member:family_members!from_member_id(first_name, last_name),
          to_member:family_members!to_member_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all relations:', error);
        return [];
      }

      return (data || []).map((rel: any) => ({
        id: rel.id,
        fromMemberId: rel.from_member_id,
        toMemberId: rel.to_member_id,
        relationType: rel.relation_type as RelationshipType,
        fromMember: rel.from_member ? {
          firstName: rel.from_member.first_name,
          lastName: rel.from_member.last_name
        } : undefined,
        toMember: rel.to_member ? {
          firstName: rel.to_member.first_name,
          lastName: rel.to_member.last_name
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching all relations:', error);
      return [];
    }
  }

  /**
   * Suggest the correct relationship direction based on birth dates
   */
  async suggestRelationshipDirection(fromMemberId: string, toMemberId: string, desiredRelationshipType: 'parent' | 'child' | 'spouse' | 'sibling'): Promise<{ suggestedType: RelationshipType; reason: string } | null> {
    try {
      const { data: members, error } = await supabase
        .from('family_members')
        .select('*')
        .in('id', [fromMemberId, toMemberId]);

      if (error || !members || members.length !== 2) {
        return null;
      }

      const fromMember = members.find(m => m.id === fromMemberId);
      const toMember = members.find(m => m.id === toMemberId);

      if (!fromMember || !toMember || !fromMember.birth_date || !toMember.birth_date) {
        return null;
      }

      const fromBirth = new Date(fromMember.birth_date);
      const toBirth = new Date(toMember.birth_date);

      if (isNaN(fromBirth.getTime()) || isNaN(toBirth.getTime())) {
        return null;
      }

      // For parent-child relationships, suggest based on age
      if (desiredRelationshipType === 'parent' || desiredRelationshipType === 'child') {
        if (fromBirth < toBirth) {
          // fromMember is older, so they should be the parent
          return {
            suggestedType: 'parent' as RelationshipType,
            reason: `${fromMember.first_name} is older than ${toMember.first_name}, so they should be the parent`
          };
        } else if (fromBirth > toBirth) {
          // fromMember is younger, so they should be the child
          return {
            suggestedType: 'child' as RelationshipType,
            reason: `${fromMember.first_name} is younger than ${toMember.first_name}, so they should be the child`
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error suggesting relationship direction:', error);
      return null;
    }
  }

  /**
   * Get relationship suggestions for a family member
   */
  async getRelationshipSuggestions(memberId: string): Promise<Array<{
    member: FamilyMember;
    suggestedRelationship: RelationshipType;
    confidence: number;
    reason: string;
  }>> {
    try {
      // Fetch member and all other members in parallel
      const [memberResult, allMembersResult, existingRelationsResult] = await Promise.all([
        supabase
          .from('family_members')
          .select('*')
          .eq('id', memberId)
          .single(),
        supabase
          .from('family_members')
          .select('*')
          .neq('id', memberId),
        // Fetch ALL existing relations for this member in ONE query (fixes N+1 problem)
        supabase
          .from('relations')
          .select('from_member_id, to_member_id')
          .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`)
      ]);

      if (memberResult.error || !memberResult.data) {
        return [];
      }

      if (allMembersResult.error || !allMembersResult.data) {
        return [];
      }

      const member = memberResult.data;
      const allMembers = allMembersResult.data;
      const existingRelations = existingRelationsResult.data || [];

      // Build a Set of member IDs that already have a relationship with this member
      const relatedMemberIds = new Set<string>();
      for (const rel of existingRelations) {
        if (rel.from_member_id === memberId) {
          relatedMemberIds.add(rel.to_member_id);
        } else {
          relatedMemberIds.add(rel.from_member_id);
        }
      }

      const suggestions: Array<{
        member: FamilyMember;
        suggestedRelationship: RelationshipType;
        confidence: number;
        reason: string;
      }> = [];

      for (const otherMember of allMembers) {
        // Skip if relationship already exists (using the pre-fetched Set)
        if (relatedMemberIds.has(otherMember.id)) continue;

        // Age-based suggestions
        if (member.birth_date && otherMember.birth_date) {
          const memberAge = new Date().getFullYear() - new Date(member.birth_date).getFullYear();
          const otherAge = new Date().getFullYear() - new Date(otherMember.birth_date).getFullYear();
          const ageDifference = Math.abs(memberAge - otherAge);

          if (ageDifference >= 15 && ageDifference <= 50) {
            if (memberAge > otherAge) {
              suggestions.push({
                member: otherMember,
                suggestedRelationship: 'parent',
                confidence: 0.8,
                reason: `Age difference of ${ageDifference} years suggests parent-child relationship`
              });
            } else {
              suggestions.push({
                member: otherMember,
                suggestedRelationship: 'child',
                confidence: 0.8,
                reason: `Age difference of ${ageDifference} years suggests parent-child relationship`
              });
            }
          } else if (ageDifference <= 10) {
            suggestions.push({
              member: otherMember,
              suggestedRelationship: 'sibling',
              confidence: 0.6,
              reason: `Similar age (${ageDifference} years difference) suggests sibling relationship`
            });
          }
        }
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Error getting relationship suggestions:', error);
      return [];
    }
  }

  // Private helper methods

  private async checkExistingRelationship(fromId: string, toId: string): Promise<{ type: RelationshipType } | null> {
    const { data, error } = await supabase
      .from('relations')
      .select('relation_type')
      .eq('from_member_id', fromId)
      .eq('to_member_id', toId)
      .maybeSingle();

    if (error || !data) return null;
    return { type: data.relation_type as RelationshipType };
  }

  private validateParentChildRelationship(
    fromMember: any,
    toMember: any,
    relationshipType: 'parent' | 'child',
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ) {
    // If no birth dates, allow the relationship but warn
    if (!fromMember.birth_date || !toMember.birth_date) {
      warnings.push('Birth dates are recommended for parent-child relationships to ensure accuracy');
      return;
    }

    const fromBirth = new Date(fromMember.birth_date);
    const toBirth = new Date(toMember.birth_date);
    const ageDifference = Math.abs(fromBirth.getFullYear() - toBirth.getFullYear());

    // Only validate if both dates are valid
    if (isNaN(fromBirth.getTime()) || isNaN(toBirth.getTime())) {
      warnings.push('Invalid birth date format detected');
      return;
    }

    if (relationshipType === 'parent') {
      // fromMember is parent, toMember is child
      if (fromBirth >= toBirth) {
        errors.push(`${fromMember.first_name} ${fromMember.last_name} (born ${fromBirth.getFullYear()}) cannot be the parent of ${toMember.first_name} ${toMember.last_name} (born ${toBirth.getFullYear()}). Parents must be born before their children.`);
        suggestions.push(`Try creating the relationship in the opposite direction: ${toMember.first_name} as parent of ${fromMember.first_name}`);
        return;
      }

      // More lenient age difference warnings
      if (ageDifference < 12) {
        warnings.push(`Age difference of ${ageDifference} years is quite small for a parent-child relationship. Please verify this is correct.`);
      } else if (ageDifference > 80) {
        warnings.push(`Age difference of ${ageDifference} years is quite large for a parent-child relationship. Please verify this is correct.`);
      }
    } else {
      // fromMember is child, toMember is parent
      if (fromBirth <= toBirth) {
        errors.push(`${fromMember.first_name} ${fromMember.last_name} (born ${fromBirth.getFullYear()}) cannot be the child of ${toMember.first_name} ${toMember.last_name} (born ${toBirth.getFullYear()}). Children must be born after their parents.`);
        suggestions.push(`Try creating the relationship in the opposite direction: ${toMember.first_name} as child of ${fromMember.first_name}`);
        return;
      }

      // More lenient age difference warnings
      if (ageDifference < 12) {
        warnings.push(`Age difference of ${ageDifference} years is quite small for a parent-child relationship. Please verify this is correct.`);
      } else if (ageDifference > 80) {
        warnings.push(`Age difference of ${ageDifference} years is quite large for a parent-child relationship. Please verify this is correct.`);
      }
    }
  }

  private validateSpouseRelationship(
    fromMember: any,
    toMember: any,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ) {
    if (!fromMember.birth_date || !toMember.birth_date) {
      warnings.push('Birth dates are recommended for spouse relationships');
      return;
    }

    const fromBirth = new Date(fromMember.birth_date);
    const toBirth = new Date(toMember.birth_date);
    const ageDifference = Math.abs(fromBirth.getFullYear() - toBirth.getFullYear());

    if (ageDifference > 30) {
      warnings.push(`Age difference of ${ageDifference} years is quite large for a spouse relationship`);
    }

    if (fromMember.gender === toMember.gender) {
      warnings.push('Both members have the same gender - this may be intentional for same-sex relationships');
    }
  }

  private validateSiblingRelationship(
    fromMember: any,
    toMember: any,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ) {
    if (!fromMember.birth_date || !toMember.birth_date) {
      warnings.push('Birth dates are recommended for sibling relationships');
      return;
    }

    const fromBirth = new Date(fromMember.birth_date);
    const toBirth = new Date(toMember.birth_date);
    const ageDifference = Math.abs(fromBirth.getFullYear() - toBirth.getFullYear());

    if (ageDifference > 20) {
      warnings.push(`Age difference of ${ageDifference} years is quite large for a sibling relationship`);
    }
  }

  private async checkCircularRelationship(
    fromId: string,
    toId: string,
    relationshipType: RelationshipType,
    errors: string[]
  ) {
    // This is a simplified check - in a real implementation, you'd want to do a more thorough graph traversal
    if (relationshipType === 'parent' || relationshipType === 'child') {
      // Check if this would create a circular parent-child relationship
      const { data: existingRelations } = await supabase
        .from('relations')
        .select('from_member_id, to_member_id, relation_type')
        .or(`from_member_id.eq.${fromId},to_member_id.eq.${fromId},from_member_id.eq.${toId},to_member_id.eq.${toId}`)
        .in('relation_type', ['parent', 'child']);

      if (existingRelations) {
        // Simple check for immediate circular relationship
        const wouldCreateCircular = existingRelations.some(rel => {
          if (relationshipType === 'parent') {
            return (rel.from_member_id === toId && rel.to_member_id === fromId && rel.relation_type === 'parent') ||
                   (rel.from_member_id === fromId && rel.to_member_id === toId && rel.relation_type === 'child');
          } else {
            return (rel.from_member_id === fromId && rel.to_member_id === toId && rel.relation_type === 'parent') ||
                   (rel.from_member_id === toId && rel.to_member_id === fromId && rel.relation_type === 'child');
          }
        });

        if (wouldCreateCircular) {
          errors.push('This relationship would create a circular parent-child relationship');
        }
      }
    }
  }

  private getReciprocalRelationshipType(relationshipType: RelationshipType): RelationshipType | null {
    switch (relationshipType) {
      case 'parent':
        return 'child';
      case 'child':
        return 'parent';
      case 'spouse':
        return 'spouse';
      case 'sibling':
        return 'sibling';
      default:
        return null;
    }
  }
}

export const familyRelationshipManager = FamilyRelationshipManager.getInstance();
