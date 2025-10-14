
import { useCallback } from 'react';
import { ReactFlowInstance } from '@xyflow/react';
import { useTreeView } from '../context/TreeViewContext';
import { FamilyMemberNode } from '../types';
import { 
  useTreeNodeOperations,
  useTreeNavigationOperations,
  useTreeViewOperations,
  useTreeExportOperations,
  useTreeSearchOperations
} from './tree-operations';
import { toast } from '@/hooks/use-toast';

export function useTreeOperations(
  onSelectMember: (memberId: string) => void
) {
  const {
    selectedNode,
    setSelectedNode,
    showNodeDetail,
    setShowNodeDetail,
    reactFlowInstance,
    setReactFlowInstance,
    focusMode,
    setFocusMode,
    focusMemberId,
    setFocusMemberId,
    resetView
  } = useTreeView();
  
  // Use our custom sub-hooks
  const { 
    handleNodeClick,
    handleViewProfile,
  } = useTreeNodeOperations(onSelectMember);
  
  const { 
    handleAddMember,
    handleAddRelative,
  } = useTreeNavigationOperations();
  
  const { 
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleToggleFocusMode,
  } = useTreeViewOperations();
  
  const { 
    handleExportImage,
    handleShareTree,
  } = useTreeExportOperations();
  
  const { 
    handleSearch,
  } = useTreeSearchOperations();

  return {
    selectedNode,
    showNodeDetail,
    setShowNodeDetail,
    reactFlowInstance,
    setReactFlowInstance,
    focusMode,
    focusMemberId,
    handleNodeClick,
    handleViewProfile,
    handleAddMember,
    handleAddRelative,
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleToggleFocusMode,
    handleExportImage,
    handleShareTree,
    handleSearch,
    resetView
  };
}
