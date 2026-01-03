
import { useCallback, useMemo, useState } from 'react';
import { useTreeView } from '../../context/TreeViewContext';
import { toast } from '@/hooks/use-toast';
import { FamilyMember } from '@/types';

export interface SearchFilters {
  birthYearMin?: number;
  birthYearMax?: number;
  location?: string;
  relationshipType?: 'parent' | 'child' | 'spouse' | 'sibling';
  gender?: 'male' | 'female' | 'other';
}

export function useTreeSearchOperations(familyMembers: FamilyMember[] = []) {
  const { reactFlowInstance } = useTreeView();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  // Enhanced search with filters
  const handleSearch = useCallback((query: string, filters?: SearchFilters) => {
    if (!reactFlowInstance || !query.trim()) {
      setHighlightedNodeIds(new Set());
      return;
    }

    try {
      const nodes = reactFlowInstance.getNodes();
      const queryLower = query.toLowerCase();
      
      // Find all matching nodes
      const matchingNodes = nodes.filter(node => {
        const firstName = (node.data?.firstName as string) || '';
        const lastName = (node.data?.lastName as string) || '';
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        
        // Name matching
        const nameMatches = firstName.toLowerCase().includes(queryLower) ||
                           lastName.toLowerCase().includes(queryLower) ||
                           fullName.includes(queryLower);
        
        if (!nameMatches) return false;
        
        // Apply filters if provided
        if (filters) {
          // Birth year filter
          if (filters.birthYearMin || filters.birthYearMax) {
            const birthYear = node.data?.birthDate 
              ? new Date(node.data.birthDate as string).getFullYear()
              : null;
            if (birthYear === null) return false;
            if (filters.birthYearMin && birthYear < filters.birthYearMin) return false;
            if (filters.birthYearMax && birthYear > filters.birthYearMax) return false;
          }
          
          // Location filter
          if (filters.location) {
            const birthPlace = (node.data?.birthPlace as string) || '';
            const deathPlace = (node.data?.deathPlace as string) || '';
            const location = (node.data?.currentLocation as any)?.description || '';
            const locationLower = filters.location.toLowerCase();
            if (!birthPlace.toLowerCase().includes(locationLower) &&
                !deathPlace.toLowerCase().includes(locationLower) &&
                !location.toLowerCase().includes(locationLower)) {
              return false;
            }
          }
          
          // Gender filter
          if (filters.gender) {
            if (node.data?.gender !== filters.gender) return false;
          }
        }
        
        return true;
      });

      if (matchingNodes.length > 0) {
        // Highlight all matching nodes
        const matchingIds = new Set(matchingNodes.map(n => n.id));
        setHighlightedNodeIds(matchingIds);
        
        // Center on the first matching node
        const firstMatch = matchingNodes[0];
        reactFlowInstance.setCenter(
          firstMatch.position.x, 
          firstMatch.position.y, 
          { zoom: 1.5, duration: 800 }
        );

        // Add to search history
        if (!searchHistory.includes(query)) {
          setSearchHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10
        }

        const firstName = firstMatch.data?.firstName as string;
        const lastName = firstMatch.data?.lastName as string;

        toast({
          title: "Members Found",
          description: `Found ${matchingNodes.length} member(s). Centered on ${firstName || 'Unknown'} ${lastName || ''}`,
        });
      } else {
        setHighlightedNodeIds(new Set());
        toast({
          title: "No Results",
          description: `No family member found matching "${query}"${filters ? ' with the specified filters' : ''}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: "Could not search family members",
        variant: "destructive"
      });
    }
  }, [reactFlowInstance, searchHistory]);

  // Clear highlights
  const clearHighlights = useCallback(() => {
    setHighlightedNodeIds(new Set());
  }, []);

  // Relationship type filter helper
  const filterByRelationshipType = useCallback((memberId: string, relationshipType: 'parent' | 'child' | 'spouse' | 'sibling'): FamilyMember[] => {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return [];
    
    return member.relations
      .filter(rel => rel.type === relationshipType)
      .map(rel => familyMembers.find(m => m.id === rel.personId))
      .filter((m): m is FamilyMember => m !== undefined);
  }, [familyMembers]);

  return {
    handleSearch,
    clearHighlights,
    highlightedNodeIds,
    searchHistory,
    filterByRelationshipType,
  };
}
