
import { FamilyMember } from '@/types';
import { FamilyMemberNode, FamilyRelationshipEdge, FamilyTreeData } from '../types';
import { Edge, MarkerType, Node } from '@xyflow/react';
import { calculateNodePosition } from './treePositionUtils';

/**
 * Builds the nodes for the tree from family members
 */
export const buildTreeNodes = (
  members: FamilyMember[],
  generations: Map<number, string[]>,
  memberGenerations: Map<string, number>,
  memberPositions: Map<string, number>,
  minGeneration: number,
  currentUserId?: string,
  onEdit?: (memberId: string) => void,
  onViewProfile?: (memberId: string) => void,
  onAddRelation?: (memberId: string) => void,
  draggedNodeId?: string | null,
  relatedMembers?: string[]
): FamilyMemberNode[] => {
  const nodes: FamilyMemberNode[] = [];
  const memberMap = new Map<string, FamilyMember>();
  
  // Map all members by ID for easy access
  members.forEach(member => memberMap.set(member.id, member));
  
  
  memberMap.forEach((member, memberId) => {
    if (memberGenerations.has(memberId)) {
      const generation = memberGenerations.get(memberId)!;
      const positionInGeneration = memberPositions.get(memberId) || 0;
      const pos = calculateNodePosition(
        memberPositions, 
        generation - minGeneration, 
        positionInGeneration, 
        generations
      );
      
      // Find spouse information
      const spouseRelation = member.relations.find(rel => rel.type === 'spouse');
      const spouseName = spouseRelation ? 
        members.find(m => m.id === spouseRelation.personId)?.firstName + ' ' + 
        members.find(m => m.id === spouseRelation.personId)?.lastName : undefined;
      
      // Create node
      const memberNode: FamilyMemberNode = {
        id: memberId,
        type: 'familyMember',
        position: pos,
        data: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          birthDate: member.birthDate,
          deathDate: member.deathDate,
          birthPlace: member.birthPlace,
          deathPlace: member.deathPlace,
          avatar: member.avatar,
          gender: member.gender,
          isCurrentUser: memberId === currentUserId,
          marriageDate: spouseRelation?.date,
          spouseName: spouseName,
          currentLocation: member.currentLocation,
          generation: generation - minGeneration,
        },
        onEdit,
        onViewProfile,
        onAddRelation,
        isDragging: memberId === draggedNodeId,
        isBeingDragged: relatedMembers?.includes(memberId) || false,
      };
      
      nodes.push(memberNode);
    }
  });
  
  
  return nodes;
};

/**
 * Builds the edges for the tree from family relationships
 */
export const buildTreeEdges = (
  members: FamilyMember[],
  memberGenerations: Map<string, number>,
  processed: Set<string>
): FamilyRelationshipEdge[] => {
  const edges: FamilyRelationshipEdge[] = [];
  const memberMap = new Map<string, FamilyMember>();
  
  // Map all members by ID for easy access
  members.forEach(member => memberMap.set(member.id, member));
  
  memberMap.forEach((member, memberId) => {
    member.relations.forEach(relation => {
      // Create a consistent edge ID regardless of direction
      const edgeId = memberId < relation.personId 
        ? `${memberId}-${relation.personId}` 
        : `${relation.personId}-${memberId}`;
      
      // Only process relationships where both members are in our node list
      if (processed.has(edgeId)) return;
      processed.add(edgeId);
      
      // Check if both members are in our nodes
      if (memberGenerations.has(memberId) && memberGenerations.has(relation.personId)) {
        
        // Normalise direction for parent/child relationships so every edge
        // goes from the parent (bottom connector) to the child (top connector).
        let relationshipType = relation.type;
        let edgeSource = memberId;
        let edgeTarget = relation.personId;

        if (relation.type === 'parent' || relation.type === 'child') {
          const parentId = relation.type === 'child' ? memberId : relation.personId;
          const childId = relation.type === 'child' ? relation.personId : memberId;

          edgeSource = parentId;
          edgeTarget = childId;
          relationshipType = 'parent';
        }
        let edgeStyle: React.CSSProperties = {};
        let markerEnd: string | undefined = undefined;
        
        // Customize edge based on relationship with flexible styling
        switch (relationshipType) {
          case 'spouse':
            edgeStyle = { 
              stroke: '#dc2626', 
              strokeWidth: 3, 
              strokeDasharray: '8,4',
              strokeLinecap: 'round' as const,
              strokeLinejoin: 'round' as const
            };
            markerEnd = 'url(#arrow-spouse)';
            break;
          case 'parent':
            edgeStyle = { 
              stroke: '#16a34a', 
              strokeWidth: 3,
              strokeLinecap: 'round' as const,
              strokeLinejoin: 'round' as const,
              strokeOpacity: 0.9
            };
            markerEnd = 'url(#arrow-parent)';
            break;
          case 'sibling':
            edgeStyle = { 
              stroke: '#9333ea', 
              strokeWidth: 2.5, 
              strokeDasharray: '6,3',
              strokeLinecap: 'round' as const,
              strokeLinejoin: 'round' as const,
              strokeOpacity: 0.8
            };
            markerEnd = 'url(#arrow-default)';
            break;
          default:
            edgeStyle = { 
              stroke: '#6b7280', 
              strokeWidth: 2.5,
              strokeLinecap: 'round' as const,
              strokeLinejoin: 'round' as const,
              strokeOpacity: 0.7
            };
            markerEnd = 'url(#arrow-default)';
        }
        
        // Determine source and target handles based on relationship type
        // Available handles on nodes: 'parent-target' (target), 'child-source' (source), 'spouse' (source), 'spouse-target' (target)
        let sourceHandle: string | undefined;
        let targetHandle: string | undefined;
        
        switch (relationshipType) {
          case 'parent':
            sourceHandle = 'child-source';
            targetHandle = 'parent-target';
            break;
          case 'spouse':
            // Spouse relationship: bidirectional connection on sides
            sourceHandle = 'spouse'; // One spouse connects to other's spouse handle
            targetHandle = 'spouse-target'; // Other spouse receives from spouse handle
            break;
          case 'sibling':
            // Sibling relationship: use sibling handles for side-to-side connections
            sourceHandle = 'sibling';
            targetHandle = 'sibling-target';
            break;
          default:
            // Default to child/parent handles
            sourceHandle = 'child-source';
            targetHandle = 'parent-target';
        }
        
        // Create edge with proper type and handles
        const relationshipEdge: FamilyRelationshipEdge = {
          id: `e-${edgeId}`,
          source: edgeSource,
          target: edgeTarget,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          type: 'familyRelationship',
          animated: false,
          style: edgeStyle,
          markerEnd,
          data: {
            relationshipType: relationshipType as 'parent' | 'child' | 'spouse' | 'sibling'
          }
        };
        
        edges.push(relationshipEdge);
      }
    });
  });
  
  return edges;
};
