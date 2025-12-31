
import { Node as ReactFlowNode, Edge, Position } from '@xyflow/react';
import { FamilyMember } from '@/types';

export interface FamilyTreeGraphProps {
  members?: FamilyMember[];
  onSelectMember?: (memberId: string) => void;
  rootMemberId?: string;
  currentUserId?: string;
}

// Define FamilyMemberNode with proper type inheritance
export interface FamilyMemberNode extends ReactFlowNode {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    deathDate?: string;
    birthPlace?: string;
    deathPlace?: string;
    avatar?: string;
    gender: string;
    isCurrentUser?: boolean;
    relationshipType?: string;
    marriageDate?: string;
    spouseName?: string;
    bio?: string;
    currentLocation?: {
      description: string;
      lat?: number;
      lng?: number;
    };
    isRoot?: boolean;
    generation?: number;
    relationship?: string;
    isMergeNode?: boolean;
    relations?: Array<{
      id: string;
      type: 'parent' | 'child' | 'spouse' | 'sibling';
      personId: string;
    }>;
  };
  onEdit?: (memberId: string) => void;
  onViewProfile?: (memberId: string) => void;
  onAddRelation?: (memberId: string) => void;
  onViewTimeline?: (memberId: string) => void;
  isDragging?: boolean;
  isBeingDragged?: boolean;
}

export interface FamilyRelationshipEdge extends Edge {
  data?: {
    relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
  };
}

export interface FamilyTreeData {
  nodes: FamilyMemberNode[];
  edges: FamilyRelationshipEdge[];
}

// TreeNodeData interface for react-d3-tree
export interface TreeNodeData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  avatar?: string;
  gender: string;
  relationship?: string;
  children: TreeNodeData[];
  isReference?: boolean;
}
