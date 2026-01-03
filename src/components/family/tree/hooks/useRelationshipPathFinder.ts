
import { useCallback, useMemo } from 'react';
import { FamilyMember } from '@/types';
import { Node, Edge } from '@xyflow/react';

export interface RelationshipPath {
  path: string[]; // Array of member IDs representing the path
  relationshipDescription: string; // e.g., "Second cousin once removed"
  distance: number; // Number of steps in the relationship
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

  // Build relationship graph
  const relationshipGraph = useMemo(() => {
    const graph = new Map<string, Set<string>>();
    
    familyMembers.forEach(member => {
      if (!graph.has(member.id)) {
        graph.set(member.id, new Set());
      }
      
      member.relations.forEach(rel => {
        const connectedId = rel.personId;
        if (!graph.has(connectedId)) {
          graph.set(connectedId, new Set());
        }
        graph.get(member.id)!.add(connectedId);
        graph.get(connectedId)!.add(member.id);
      });
    });
    
    return graph;
  }, [familyMembers]);

  // BFS to find shortest path between two members
  const findPath = useCallback((fromId: string, toId: string): RelationshipPath | null => {
    if (fromId === toId) {
      return {
        path: [fromId],
        relationshipDescription: 'Same person',
        distance: 0
      };
    }

    const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const connections = relationshipGraph.get(id) || new Set();

      for (const connectedId of connections) {
        if (connectedId === toId) {
          const fullPath = [...path, connectedId];
          return {
            path: fullPath,
            relationshipDescription: describeRelationship(fullPath, memberMap),
            distance: fullPath.length - 1
          };
        }

        if (!visited.has(connectedId)) {
          visited.add(connectedId);
          queue.push({ id: connectedId, path: [...path, connectedId] });
        }
      }
    }

    return null; // No path found
  }, [relationshipGraph, memberMap]);

  // Describe the relationship in human-readable terms
  const describeRelationship = (path: string[], memberMap: Map<string, FamilyMember>): string => {
    if (path.length < 2) return 'Same person';
    if (path.length === 2) {
      // Direct relationship
      const member1 = memberMap.get(path[0]);
      const member2 = memberMap.get(path[1]);
      if (!member1 || !member2) return 'Related';

      // Check relationship type
      const rel1 = member1.relations.find(r => r.personId === path[1]);
      if (rel1) {
        switch (rel1.type) {
          case 'parent': return 'Parent-Child';
          case 'child': return 'Parent-Child';
          case 'spouse': return 'Spouses';
          case 'sibling': return 'Siblings';
        }
      }
      return 'Directly related';
    }

    // Calculate generational difference
    const member1 = memberMap.get(path[0]);
    const member2 = memberMap.get(path[path.length - 1]);
    
    if (!member1 || !member2) {
      return `${path.length - 1} steps away`;
    }

    // Simple description based on path length
    const steps = path.length - 1;
    if (steps === 2) return 'Grandparent/Grandchild or Uncle/Aunt/Nephew/Niece';
    if (steps === 3) return 'Great-grandparent/Great-grandchild or Cousin';
    if (steps === 4) return 'Second cousin or Great-great-grandparent/Great-great-grandchild';
    if (steps === 5) return 'Third cousin or further removed';
    
    return `${steps} steps away`;
  };

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

