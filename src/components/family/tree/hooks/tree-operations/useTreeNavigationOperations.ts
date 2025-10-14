
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useTreeView } from '../../context/TreeViewContext';

export function useTreeNavigationOperations() {
  const { selectedNode, reactFlowInstance } = useTreeView();
  const navigate = useNavigate();

  // Handle add family member
  const handleAddMember = useCallback(() => {
    navigate('/add-family-member');
  }, [navigate]);

  // Handle add relative to a specific member
  const handleAddRelative = useCallback((memberId?: string) => {
    const id = memberId || (selectedNode?.data?.id as string | undefined);
    if (id) {
      navigate(`/add-relation/${id}`);
    } else {
      toast({
        title: "Error",
        description: "Please select a family member first",
        variant: "destructive"
      });
    }
  }, [selectedNode, navigate]);

  return {
    handleAddMember,
    handleAddRelative,
  };
}
