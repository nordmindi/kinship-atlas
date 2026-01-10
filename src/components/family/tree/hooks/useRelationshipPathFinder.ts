import { useCallback, useMemo } from 'react';
import { FamilyMember } from '@/types';
import { Node, Edge } from '@xyflow/react';

export interface RelationshipPath {
  path: string[]; // Array of member IDs representing the path
  relationshipDescription: string; // e.g., "Second cousin once removed"
  detailedPath: PathStep[]; // Detailed steps with relationship types
  distance: number; // Number of steps in the relationship
  isBloodRelative: boolean; // True if connected by blood, false if through marriage only
  commonAncestor?: string; // ID of common ancestor if applicable
}

export interface PathStep {
  fromId: string;
  toId: string;
  relationType: 'parent' | 'child' | 'spouse' | 'sibling';
  description: string; // e.g., "mother", "son", "husband"
}

/**
 * Get gender-specific relationship term
 */
function getGenderedTerm(
  baseTerm: string,
  gender: string | undefined,
  options?: { possessive?: boolean }
): string {
  const genderMap: Record<string, Record<string, string>> = {
    parent: { male: 'father', female: 'mother', unknown: 'parent' },
    child: { male: 'son', female: 'daughter', unknown: 'child' },
    sibling: { male: 'brother', female: 'sister', unknown: 'sibling' },
    spouse: { male: 'husband', female: 'wife', unknown: 'spouse' },
    grandparent: { male: 'grandfather', female: 'grandmother', unknown: 'grandparent' },
    grandchild: { male: 'grandson', female: 'granddaughter', unknown: 'grandchild' },
    'great-grandparent': { male: 'great-grandfather', female: 'great-grandmother', unknown: 'great-grandparent' },
    'great-grandchild': { male: 'great-grandson', female: 'great-granddaughter', unknown: 'great-grandchild' },
    uncle: { male: 'uncle', female: 'aunt', unknown: 'uncle/aunt' },
    nephew: { male: 'nephew', female: 'niece', unknown: 'nephew/niece' },
    cousin: { male: 'cousin', female: 'cousin', unknown: 'cousin' },
    'parent-in-law': { male: 'father-in-law', female: 'mother-in-law', unknown: 'parent-in-law' },
    'child-in-law': { male: 'son-in-law', female: 'daughter-in-law', unknown: 'child-in-law' },
    'sibling-in-law': { male: 'brother-in-law', female: 'sister-in-law', unknown: 'sibling-in-law' },
  };

  const genderKey = gender?.toLowerCase() || 'unknown';
  const validGender = ['male', 'female'].includes(genderKey) ? genderKey : 'unknown';
  
  return genderMap[baseTerm]?.[validGender] || baseTerm;
}

/**
 * Calculate the degree of cousin relationship and removal
 */
function calculateCousinRelationship(
  generationsUp1: number,
  generationsUp2: number
): { degree: number; removed: number } {
  const minGen = Math.min(generationsUp1, generationsUp2);
  const degree = minGen; // First cousin = 1 generation to common ancestor from each path
  const removed = Math.abs(generationsUp1 - generationsUp2);
  return { degree, removed };
}

/**
 * Get ordinal suffix for a number
 */
function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Describe removal for cousins
 */
function describeRemoval(removed: number): string {
  if (removed === 0) return '';
  if (removed === 1) return ' once removed';
  if (removed === 2) return ' twice removed';
  if (removed === 3) return ' thrice removed';
  return ` ${removed} times removed`;
}

/**
 * Finds the relationship path between two family members
 */
export function useRelationshipPathFinder(
  familyMembers: FamilyMember[],
  nodes: Node[],
  edges: Edge[]
) {
  // Build member map for quick lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    familyMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [familyMembers]);

  // Build detailed relationship graph with relationship types
  const relationshipGraph = useMemo(() => {
    const graph = new Map<string, Map<string, 'parent' | 'child' | 'spouse' | 'sibling'>>();
    
    familyMembers.forEach(member => {
      if (!graph.has(member.id)) {
        graph.set(member.id, new Map());
      }
      
      member.relations.forEach(rel => {
        const connectedId = rel.personId;
        if (!graph.has(connectedId)) {
          graph.set(connectedId, new Map());
        }
        
        // Store the relationship type
        graph.get(member.id)!.set(connectedId, rel.type as 'parent' | 'child' | 'spouse' | 'sibling');
        
        // Store the inverse relationship
        let inverseType: 'parent' | 'child' | 'spouse' | 'sibling' = rel.type as 'parent' | 'child' | 'spouse' | 'sibling';
        if (rel.type === 'parent') inverseType = 'child';
        else if (rel.type === 'child') inverseType = 'parent';
        // spouse and sibling are symmetric
        
        if (!graph.get(connectedId)!.has(member.id)) {
          graph.get(connectedId)!.set(member.id, inverseType);
        }
      });
    });
    
    return graph;
  }, [familyMembers]);

  // Build detailed path steps
  const buildDetailedPath = useCallback((
    path: string[],
    graph: Map<string, Map<string, 'parent' | 'child' | 'spouse' | 'sibling'>>
  ): PathStep[] => {
    const steps: PathStep[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const fromId = path[i];
      const toId = path[i + 1];
      const relationType = graph.get(fromId)?.get(toId) || 'child';
      const toMember = memberMap.get(toId);
      
      let description = relationType;
      if (toMember) {
        description = getGenderedTerm(relationType, toMember.gender);
      }
      
      steps.push({
        fromId,
        toId,
        relationType,
        description
      });
    }
    
    return steps;
  }, [memberMap]);

  // Analyze the path to determine the relationship
  const analyzeRelationship = useCallback((
    path: string[],
    detailedPath: PathStep[]
  ): { description: string; isBloodRelative: boolean; commonAncestor?: string } => {
    if (path.length < 2) {
      return { description: 'Same person', isBloodRelative: true };
    }

    const fromMember = memberMap.get(path[0]);
    const toMember = memberMap.get(path[path.length - 1]);
    
    if (!fromMember || !toMember) {
      return { description: 'Related', isBloodRelative: false };
    }

    // Check if there's a spouse connection (in-law relationship)
    const hasSpouseConnection = detailedPath.some(step => step.relationType === 'spouse');
    
    // Direct relationship (1 step)
    if (detailedPath.length === 1) {
      const step = detailedPath[0];
      const description = step.description;
      const capitalizedDesc = description.charAt(0).toUpperCase() + description.slice(1);
      return { 
        description: `${toMember.firstName} is ${fromMember.firstName}'s ${description}`,
        isBloodRelative: step.relationType !== 'spouse'
      };
    }

    // Count relationship types
    const parentCount = detailedPath.filter(s => s.relationType === 'parent').length;
    const childCount = detailedPath.filter(s => s.relationType === 'child').length;
    const siblingCount = detailedPath.filter(s => s.relationType === 'sibling').length;
    const spouseCount = detailedPath.filter(s => s.relationType === 'spouse').length;

    // Only going up (ancestor)
    if (childCount === 0 && siblingCount === 0 && spouseCount === 0) {
      if (parentCount === 2) {
        const term = getGenderedTerm('grandparent', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: true
        };
      }
      if (parentCount === 3) {
        const term = getGenderedTerm('great-grandparent', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: true
        };
      }
      if (parentCount > 3) {
        const greats = parentCount - 2;
        const prefix = greats > 1 ? `${getOrdinal(greats)} great-` : 'great-';
        const term = getGenderedTerm('grandparent', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${prefix}${term}`,
          isBloodRelative: true
        };
      }
    }

    // Only going down (descendant)
    if (parentCount === 0 && siblingCount === 0 && spouseCount === 0) {
      if (childCount === 2) {
        const term = getGenderedTerm('grandchild', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: true
        };
      }
      if (childCount === 3) {
        const term = getGenderedTerm('great-grandchild', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: true
        };
      }
      if (childCount > 3) {
        const greats = childCount - 2;
        const prefix = greats > 1 ? `${getOrdinal(greats)} great-` : 'great-';
        const term = getGenderedTerm('grandchild', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${prefix}${term}`,
          isBloodRelative: true
        };
      }
    }

    // Uncle/Aunt (parent's sibling)
    if (parentCount === 1 && siblingCount === 1 && childCount === 0 && spouseCount === 0) {
      const term = getGenderedTerm('uncle', toMember.gender);
      return { 
        description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
        isBloodRelative: true
      };
    }

    // Nephew/Niece (sibling's child)
    if (siblingCount === 1 && childCount === 1 && parentCount === 0 && spouseCount === 0) {
      const term = getGenderedTerm('nephew', toMember.gender);
      return { 
        description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
        isBloodRelative: true
      };
    }

    // Great uncle/aunt
    if (parentCount === 2 && siblingCount === 1 && childCount === 0 && spouseCount === 0) {
      const term = getGenderedTerm('uncle', toMember.gender);
      return { 
        description: `${toMember.firstName} is ${fromMember.firstName}'s great-${term}`,
        isBloodRelative: true
      };
    }

    // Great nephew/niece
    if (siblingCount === 1 && childCount === 2 && parentCount === 0 && spouseCount === 0) {
      const term = getGenderedTerm('nephew', toMember.gender);
      return { 
        description: `${toMember.firstName} is ${fromMember.firstName}'s great-${term}`,
        isBloodRelative: true
      };
    }

    // Cousins (sibling path through common ancestor)
    if (siblingCount === 1 && parentCount > 0 && childCount > 0 && spouseCount === 0) {
      // Find where the sibling connection is
      const siblingIndex = detailedPath.findIndex(s => s.relationType === 'sibling');
      const parentsBeforeSibling = detailedPath.slice(0, siblingIndex).filter(s => s.relationType === 'parent').length;
      const childrenAfterSibling = detailedPath.slice(siblingIndex + 1).filter(s => s.relationType === 'child').length;
      
      const { degree, removed } = calculateCousinRelationship(parentsBeforeSibling, childrenAfterSibling);
      
      if (degree === 1 && removed === 0) {
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s first cousin`,
          isBloodRelative: true
        };
      }
      
      const cousinDegree = degree === 1 ? 'first' : degree === 2 ? 'second' : degree === 3 ? 'third' : `${getOrdinal(degree)}`;
      const removalText = describeRemoval(removed);
      
      return { 
        description: `${toMember.firstName} is ${fromMember.firstName}'s ${cousinDegree} cousin${removalText}`,
        isBloodRelative: true
      };
    }

    // In-law relationships
    if (spouseCount > 0) {
      // Parent-in-law (spouse's parent)
      if (spouseCount === 1 && parentCount === 1 && childCount === 0 && siblingCount === 0) {
        const term = getGenderedTerm('parent-in-law', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: false
        };
      }
      
      // Child-in-law (child's spouse)
      if (spouseCount === 1 && childCount === 1 && parentCount === 0 && siblingCount === 0) {
        const term = getGenderedTerm('child-in-law', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: false
        };
      }
      
      // Sibling-in-law (spouse's sibling or sibling's spouse)
      if (spouseCount === 1 && siblingCount === 1 && parentCount === 0 && childCount === 0) {
        const term = getGenderedTerm('sibling-in-law', toMember.gender);
        return { 
          description: `${toMember.firstName} is ${fromMember.firstName}'s ${term}`,
          isBloodRelative: false
        };
      }
    }

    // Generic description with step count
    const stepDescriptions = detailedPath.map(s => s.description).join(' → ');
    return { 
      description: `${toMember.firstName} is related to ${fromMember.firstName} (${path.length - 1} steps: ${stepDescriptions})`,
      isBloodRelative: !hasSpouseConnection
    };
  }, [memberMap]);

  // BFS to find shortest path between two members
  const findPath = useCallback((fromId: string, toId: string): RelationshipPath | null => {
    if (fromId === toId) {
      return {
        path: [fromId],
        relationshipDescription: 'Same person',
        detailedPath: [],
        distance: 0,
        isBloodRelative: true
      };
    }

    const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const connections = relationshipGraph.get(id);

      if (connections) {
        for (const [connectedId] of connections) {
          if (connectedId === toId) {
            const fullPath = [...path, connectedId];
            const detailedPath = buildDetailedPath(fullPath, relationshipGraph);
            const analysis = analyzeRelationship(fullPath, detailedPath);
            
            return {
              path: fullPath,
              relationshipDescription: analysis.description,
              detailedPath,
              distance: fullPath.length - 1,
              isBloodRelative: analysis.isBloodRelative,
              commonAncestor: analysis.commonAncestor
            };
          }

          if (!visited.has(connectedId)) {
            visited.add(connectedId);
            queue.push({ id: connectedId, path: [...path, connectedId] });
          }
        }
      }
    }

    return null; // No path found
  }, [relationshipGraph, buildDetailedPath, analyzeRelationship]);

  // Find and highlight path between two members
  const findAndHighlightPath = useCallback((fromId: string, toId: string) => {
    const pathResult = findPath(fromId, toId);
    return pathResult;
  }, [findPath]);

  return {
    findPath,
    findAndHighlightPath,
    relationshipGraph
  };
}
