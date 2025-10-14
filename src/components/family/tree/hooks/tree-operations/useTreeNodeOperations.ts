
import { useCallback } from 'react';
import { ReactFlowInstance } from '@xyflow/react';
import { FamilyMemberNode } from '../../types';
import { useTreeView } from '../../context/TreeViewContext';

export function useTreeNodeOperations(
  onSelectMember: (memberId: string) => void
) {
  const {
    selectedNode,
    setSelectedNode,
    showNodeDetail,
    setShowNodeDetail,
    reactFlowInstance,
  } = useTreeView();

  // Handle node click
  const handleNodeClick = useCallback((node: FamilyMemberNode) => {
    setSelectedNode(node);
    setShowNodeDetail(true);
    
    if (reactFlowInstance) {
      // Center on the selected node with animation
      reactFlowInstance.setCenter(
        node.position.x, 
        node.position.y, 
        { zoom: 1.5, duration: 800 }
      );
    }
  }, [reactFlowInstance, setSelectedNode, setShowNodeDetail]);

  // Handle view profile
  const handleViewProfile = useCallback(() => {
    if (selectedNode && selectedNode.data && selectedNode.data.id) {
      onSelectMember(selectedNode.data.id as string);
      setShowNodeDetail(false);
    }
  }, [selectedNode, onSelectMember, setShowNodeDetail]);

  return {
    selectedNode,
    showNodeDetail,
    setShowNodeDetail,
    handleNodeClick,
    handleViewProfile,
  };
}
