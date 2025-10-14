
import { useCallback } from 'react';
import { useTreeView } from '../../context/TreeViewContext';
import { toast } from '@/hooks/use-toast';

export function useTreeSearchOperations() {
  const { reactFlowInstance } = useTreeView();

  // Handle search member
  const handleSearch = useCallback((query: string) => {
    if (!reactFlowInstance || !query.trim()) {
      return;
    }

    try {
      const nodes = reactFlowInstance.getNodes();
      const matchingNode = nodes.find(node => {
        const firstName = node.data?.firstName as string;
        const lastName = node.data?.lastName as string;
        
        return firstName?.toLowerCase().includes(query.toLowerCase()) ||
               lastName?.toLowerCase().includes(query.toLowerCase());
      });

      if (matchingNode) {
        // Center on the found node
        reactFlowInstance.setCenter(
          matchingNode.position.x, 
          matchingNode.position.y, 
          { zoom: 1.5, duration: 800 }
        );

        const firstName = matchingNode.data?.firstName as string;
        const lastName = matchingNode.data?.lastName as string;

        toast({
          title: "Member Found",
          description: `Centered on ${firstName || 'Unknown'} ${lastName || ''}`,
        });
      } else {
        toast({
          title: "No Results",
          description: `No family member found matching "${query}"`,
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
  }, [reactFlowInstance]);

  return {
    handleSearch,
  };
}
