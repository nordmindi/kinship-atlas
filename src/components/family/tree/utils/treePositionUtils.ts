
import { FamilyMember } from '@/types';

/**
 * Helper functions to calculate positions
 */
export const calculateNodePosition = (
  memberIdToIndexMap: Map<string, number>, 
  generation: number,
  positionInGeneration: number,
  generations: Map<number, string[]>,
  horizontalSpacing: number = 200,
  verticalSpacing: number = 150
) => {
  const generationSize = generations.get(generation)?.length || 1;
  const centerOffset = (generationSize - 1) * horizontalSpacing / 2;
  return { 
    x: (positionInGeneration * horizontalSpacing) - centerOffset, 
    y: generation * verticalSpacing 
  };
};

/**
 * Creates a map of family members by ID for easy access
 */
export const createMemberMap = (members: FamilyMember[]): Map<string, FamilyMember> => {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach(member => memberMap.set(member.id, member));
  return memberMap;
};

/**
 * Finds the root member based on provided parameters
 */
export const findRootMember = (
  members: FamilyMember[], 
  rootMemberId?: string, 
  currentUserId?: string
): FamilyMember | null => {
  if (members.length === 0) return null;
  
  if (rootMemberId) {
    const rootMember = members.find(m => m.id === rootMemberId);
    if (rootMember) return rootMember;
  }
  
  if (currentUserId) {
    const currentUserMember = members.find(m => m.id === currentUserId);
    if (currentUserMember) return currentUserMember;
  }
  
  return members[0];
};
