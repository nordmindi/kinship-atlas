
import { useState, useEffect } from 'react';
import { FamilyMember } from '@/types';
import { FamilyTreeData } from '../components/family/tree/types';
import { findRootMember, createMemberMap } from '../components/family/tree/utils/treePositionUtils';
import { buildGenerations } from '../components/family/tree/utils/generationBuilder';
import { buildTreeNodes, buildTreeEdges } from '../components/family/tree/utils/treeDataBuilder';

export const useTreeData = (
  members: FamilyMember[], 
  rootMemberId?: string, 
  currentUserId?: string
) => {
  const [treeData, setTreeData] = useState<FamilyTreeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedMembers, setProcessedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (members.length === 0) {
      setTreeData(null);
      return;
    }

    try {
      // Find root member
      const rootMember = findRootMember(members, rootMemberId, currentUserId);
      
      if (!rootMember) {
        setTreeData(null);
        setError("No family members available");
        return;
      }

      const memberMap = createMemberMap(members);
      
      // Build generations
      const { generations, memberGenerations, processed } = buildGenerations(rootMember, memberMap);
      
      // Sort generations and calculate positions
      const sortedGenerations = Array.from(generations.keys()).sort((a, b) => a - b);
      const minGeneration = sortedGenerations[0];
      
      // Create a map of member ID to their position in their generation for horizontal spacing
      const memberPositions = new Map<string, number>();
      
      sortedGenerations.forEach(gen => {
        const membersInGen = generations.get(gen) || [];
        membersInGen.forEach((memberId, index) => {
          memberPositions.set(memberId, index);
        });
      });
      
      // Build nodes and edges
      const nodes = buildTreeNodes(
        members, 
        generations, 
        memberGenerations, 
        memberPositions, 
        minGeneration, 
        currentUserId
      );
      
      const edges = buildTreeEdges(members, memberGenerations, processed);
      
      setTreeData({ nodes, edges });
      setProcessedMembers(processed);
      setError(null);
    } catch (err: any) {
      console.error("Error building tree data:", err);
      setError(`Failed to build family tree: ${err.message}`);
      setTreeData(null);
    }
  }, [members, rootMemberId, currentUserId]);

  return { treeData, error, processedMembers };
};
