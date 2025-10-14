
import { useCallback } from 'react';
import { useTreeView } from '../../context/TreeViewContext';
import { toast } from '@/hooks/use-toast';

export function useTreeViewOperations() {
  const {
    selectedNode,
    reactFlowInstance,
    setReactFlowInstance,
    focusMode,
    setFocusMode,
    focusMemberId,
    setFocusMemberId,
    resetView,
  } = useTreeView();

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }
  }, [reactFlowInstance]);

  // Handle toggle focus mode
  const handleToggleFocusMode = useCallback((nodeId?: string) => {
    if (!focusMode) {
      // Entering focus mode
      const targetId = nodeId || selectedNode?.data?.id as string;
      
      if (targetId) {
        setFocusMode(true);
        setFocusMemberId(targetId);
        
        // Find the node and center on it
        if (reactFlowInstance) {
          const nodes = reactFlowInstance.getNodes();
          const targetNode = nodes.find(node => node.data?.id === targetId);
          
          if (targetNode) {
            reactFlowInstance.setCenter(
              targetNode.position.x, 
              targetNode.position.y, 
              { zoom: 1.5, duration: 800 }
            );
          }
        }
      } else {
        toast({
          title: "Error",
          description: "Please select a family member to focus on",
        });
      }
    } else {
      // Exiting focus mode
      setFocusMode(false);
      setFocusMemberId(null);
      handleFitView();
    }
  }, [focusMode, selectedNode, reactFlowInstance, setFocusMode, setFocusMemberId, handleFitView]);

  return {
    reactFlowInstance,
    setReactFlowInstance,
    focusMode,
    focusMemberId,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleToggleFocusMode,
    resetView,
  };
}
