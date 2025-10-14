
import { FamilyMember } from "@/types";
import { TreeNodeData } from "./types";

// Get relationship label based on relation type
export const getRelationshipLabel = (relationType: string): string => {
  switch (relationType) {
    case 'parent':
      return 'Parent';
    case 'child':
      return 'Child';
    case 'spouse':
      return 'Spouse';
    case 'sibling':
      return 'Sibling';
    default:
      return '';
  }
};

// Determine relationship between two family members
export const determineRelationship = (member: FamilyMember, relativeTo: FamilyMember | null): string => {
  if (!relativeTo) return '';
  
  // Check if the member has a direct relationship with relativeTo
  const directRelation = member.relations.find(rel => rel.personId === relativeTo.id);
  if (directRelation) {
    return getRelationshipLabel(directRelation.type);
  }
  
  // Check if relativeTo has a direct relationship with the member
  const reverseRelation = relativeTo.relations.find(rel => rel.personId === member.id);
  if (reverseRelation) {
    // Inverse relationship
    switch (reverseRelation.type) {
      case 'parent': return 'Child';
      case 'child': return 'Parent';
      case 'spouse': return 'Spouse';
      case 'sibling': return 'Sibling';
      default: return '';
    }
  }
  
  return '';
};

// Build tree data recursively with proper grouping by relationship type
export const buildTreeData = (
  member: FamilyMember,
  members: FamilyMember[],
  currentUser: FamilyMember | null,
  processedIds: Set<string> = new Set(),
  depth: number = 0
): TreeNodeData => {
  // Mark this member as processed to avoid circular references
  processedIds.add(member.id);

  // Create separate arrays for different relationship types
  const parents: TreeNodeData[] = [];
  const spouses: TreeNodeData[] = [];
  const siblings: TreeNodeData[] = [];
  const children: TreeNodeData[] = [];

  // Helper function to add nodes based on relationship type
  const addNodesToGroup = (memberId: string, relationType: string) => {
    const relatedMember = members.find(m => m.id === memberId);
    if (!relatedMember) return;

    // Check if we've already processed this member to avoid circular references
    if (processedIds.has(relatedMember.id)) {
      // Create a reference node for already processed members
      const relationship = determineRelationship(relatedMember, currentUser);
      const referenceNode: TreeNodeData = {
        id: relatedMember.id,
        name: `${relatedMember.firstName} ${relatedMember.lastName}`,
        firstName: relatedMember.firstName,
        lastName: relatedMember.lastName,
        birthDate: relatedMember.birthDate,
        deathDate: relatedMember.deathDate,
        avatar: relatedMember.avatar,
        gender: relatedMember.gender,
        relationship: relationship,
        children: [],
        isReference: true
      };
      
      switch (relationType) {
        case 'parent': parents.push(referenceNode); break;
        case 'spouse': spouses.push(referenceNode); break;
        case 'sibling': siblings.push(referenceNode); break;
        case 'child': children.push(referenceNode); break;
      }
    } else {
      // Create a new processed ID set for recursive calls to avoid sharing state
      const newProcessed = new Set(processedIds);
      const nodeDepth = relationType === 'parent' ? depth - 1 : depth + 1;
      
      // Recursively build tree data for this related member
      const nodeData = buildTreeData(relatedMember, members, currentUser, newProcessed, nodeDepth);
      
      switch (relationType) {
        case 'parent': parents.push(nodeData); break;
        case 'spouse': spouses.push(nodeData); break;
        case 'sibling': siblings.push(nodeData); break;
        case 'child': children.push(nodeData); break;
      }
    }
  };

  // Process each relation type separately
  member.relations.forEach(relation => {
    addNodesToGroup(relation.personId, relation.type);
  });
  
  // Build the main node
  const treeNode: TreeNodeData = {
    id: member.id,
    name: `${member.firstName} ${member.lastName}`,
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: member.birthDate,
    deathDate: member.deathDate,
    avatar: member.avatar,
    gender: member.gender,
    relationship: determineRelationship(member, currentUser),
    children: [],
    isReference: false
  };

  // Structure the children array based on relationship types
  // For a family tree, we'll place:
  // 1. Parents above the main node
  // 2. Siblings at same level, but in a specific group
  // 3. Spouses beside the main node
  // 4. Children below the main node
  
  // Assign relationships in the right order for proper tree visualization
  if (treeNode.id === currentUser?.id) {
    // When main node is the current user, use a specific structure
    treeNode.children = [...parents, ...siblings, ...spouses, ...children];
  } else {
    // For other nodes, organize by relationship type with respect to the node itself
    treeNode.children = [...parents, ...spouses, ...siblings, ...children];
  }
  
  return treeNode;
};
