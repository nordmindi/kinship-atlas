
import { useState, useCallback, useEffect } from 'react';
import { Node } from '@xyflow/react';

interface CollapseState {
  collapsedNodes: Set<string>;
  hiddenDescendants: Map<string, Set<string>>; // nodeId -> set of hidden descendant IDs
}

const STORAGE_KEY = 'kinship-atlas-tree-collapse-state';

export function useTreeCollapse(familyMembers: any[], nodes: Node[]) {
  const [collapseState, setCollapseState] = useState<CollapseState>(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          collapsedNodes: new Set(parsed.collapsedNodes || []),
          hiddenDescendants: new Map(
            Object.entries(parsed.hiddenDescendants || {}).map(([key, value]) => [
              key,
              new Set(value as string[])
            ])
          )
        };
      }
    } catch (error) {
      console.error('Failed to load collapse state:', error);
    }
    return {
      collapsedNodes: new Set<string>(),
      hiddenDescendants: new Map<string, Set<string>>()
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const toSave = {
        collapsedNodes: Array.from(collapseState.collapsedNodes),
        hiddenDescendants: Object.fromEntries(
          Array.from(collapseState.hiddenDescendants.entries()).map(([key, value]) => [
            key,
            Array.from(value)
          ])
        )
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save collapse state:', error);
    }
  }, [collapseState]);

  // Find all descendants of a node
  const findDescendants = useCallback((memberId: string): Set<string> => {
    const descendants = new Set<string>();
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return descendants;

    const traverse = (id: string) => {
      const m = familyMembers.find(m => m.id === id);
      if (!m) return;

      m.relations
        .filter(rel => rel.type === 'child')
        .forEach(rel => {
          if (!descendants.has(rel.personId)) {
            descendants.add(rel.personId);
            traverse(rel.personId);
          }
        });
    };

    traverse(memberId);
    return descendants;
  }, [familyMembers]);

  // Toggle collapse state for a node
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapseState(prev => {
      const newCollapsedNodes = new Set(prev.collapsedNodes);
      const newHiddenDescendants = new Map(prev.hiddenDescendants);

      if (newCollapsedNodes.has(nodeId)) {
        // Expanding - remove from collapsed set and clear hidden descendants
        newCollapsedNodes.delete(nodeId);
        newHiddenDescendants.delete(nodeId);
      } else {
        // Collapsing - add to collapsed set and calculate hidden descendants
        newCollapsedNodes.add(nodeId);
        const descendants = findDescendants(nodeId);
        newHiddenDescendants.set(nodeId, descendants);
      }

      return {
        collapsedNodes: newCollapsedNodes,
        hiddenDescendants: newHiddenDescendants
      };
    });
  }, [findDescendants]);

  // Check if a node is collapsed
  const isCollapsed = useCallback((nodeId: string): boolean => {
    return collapseState.collapsedNodes.has(nodeId);
  }, [collapseState.collapsedNodes]);

  // Check if a node should be hidden (is a descendant of a collapsed node)
  const isHidden = useCallback((nodeId: string): boolean => {
    for (const [collapsedId, descendants] of collapseState.hiddenDescendants.entries()) {
      if (descendants.has(nodeId)) {
        return true;
      }
    }
    return false;
  }, [collapseState.hiddenDescendants]);

  // Get count of hidden descendants for a node
  const getHiddenDescendantCount = useCallback((nodeId: string): number => {
    return collapseState.hiddenDescendants.get(nodeId)?.size || 0;
  }, [collapseState.hiddenDescendants]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    const allNodes = new Set(nodes.map(n => n.id));
    const newHiddenDescendants = new Map<string, Set<string>>();

    allNodes.forEach(nodeId => {
      const descendants = findDescendants(nodeId);
      if (descendants.size > 0) {
        newHiddenDescendants.set(nodeId, descendants);
      }
    });

    setCollapseState({
      collapsedNodes: allNodes,
      hiddenDescendants: newHiddenDescendants
    });
  }, [nodes, findDescendants]);

  // Expand all nodes
  const expandAll = useCallback(() => {
    setCollapseState({
      collapsedNodes: new Set<string>(),
      hiddenDescendants: new Map<string, Set<string>>()
    });
  }, []);

  // Filter nodes based on collapse state
  const getVisibleNodes = useCallback((allNodes: Node[]): Node[] => {
    return allNodes.filter(node => !isHidden(node.id));
  }, [isHidden]);

  // Filter edges based on collapse state
  const getVisibleEdges = useCallback((allEdges: any[]): any[] => {
    const hiddenSet = new Set<string>();
    collapseState.hiddenDescendants.forEach(descendants => {
      descendants.forEach(id => hiddenSet.add(id));
    });

    return allEdges.filter(edge => {
      const sourceHidden = hiddenSet.has(edge.source);
      const targetHidden = hiddenSet.has(edge.target);
      return !sourceHidden && !targetHidden;
    });
  }, [collapseState.hiddenDescendants]);

  return {
    toggleCollapse,
    isCollapsed,
    isHidden,
    getHiddenDescendantCount,
    collapseAll,
    expandAll,
    getVisibleNodes,
    getVisibleEdges,
    collapsedCount: collapseState.collapsedNodes.size
  };
}

