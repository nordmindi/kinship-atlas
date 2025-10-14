
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Node, ReactFlowInstance } from '@xyflow/react';

interface TreeViewContextState {
  // Configuration
  orientation: 'horizontal' | 'vertical';
  showLegend: boolean;
  showMinimap: boolean;
  focusMode: boolean;
  focusMemberId: string | null;
  
  // Flow instance
  reactFlowInstance: ReactFlowInstance | null;
  
  // Node selection
  selectedNode: Node | null;
  showNodeDetail: boolean;
}

interface TreeViewContextValue extends TreeViewContextState {
  setOrientation: (orientation: 'horizontal' | 'vertical') => void;
  setShowLegend: (show: boolean) => void;
  setShowMinimap: (show: boolean) => void;
  setFocusMode: (mode: boolean) => void;
  setFocusMemberId: (id: string | null) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  setSelectedNode: (node: Node | null) => void;
  setShowNodeDetail: (show: boolean) => void;
  resetView: () => void;
}

interface TreeViewProviderProps {
  children: ReactNode;
  initialState?: Partial<TreeViewContextState>;
}

const defaultState: TreeViewContextState = {
  orientation: 'vertical',
  showLegend: true,
  showMinimap: true,
  focusMode: false,
  focusMemberId: null,
  reactFlowInstance: null,
  selectedNode: null,
  showNodeDetail: false,
};

const TreeViewContext = createContext<TreeViewContextValue | undefined>(undefined);

export const TreeViewProvider: React.FC<TreeViewProviderProps> = ({ 
  children, 
  initialState = {} 
}) => {
  // Configuration state with merged initial values
  const [state, setState] = useState<TreeViewContextState>({
    ...defaultState,
    ...initialState
  });

  const setOrientation = (orientation: 'horizontal' | 'vertical') => 
    setState(prev => ({ ...prev, orientation }));
  
  const setShowLegend = (showLegend: boolean) => 
    setState(prev => ({ ...prev, showLegend }));
  
  const setShowMinimap = (showMinimap: boolean) => 
    setState(prev => ({ ...prev, showMinimap }));
  
  const setFocusMode = (focusMode: boolean) => 
    setState(prev => ({ ...prev, focusMode }));
  
  const setFocusMemberId = (focusMemberId: string | null) => 
    setState(prev => ({ ...prev, focusMemberId }));
  
  const setReactFlowInstance = (reactFlowInstance: ReactFlowInstance | null) => 
    setState(prev => ({ ...prev, reactFlowInstance }));
  
  const setSelectedNode = (selectedNode: Node | null) => 
    setState(prev => ({ ...prev, selectedNode }));
  
  const setShowNodeDetail = (showNodeDetail: boolean) => 
    setState(prev => ({ ...prev, showNodeDetail }));
  
  const resetView = () => {
    if (state.reactFlowInstance) {
      state.reactFlowInstance.fitView({ padding: 0.2 });
      setFocusMode(false);
      setFocusMemberId(null);
    }
  };

  return (
    <TreeViewContext.Provider
      value={{
        ...state,
        setOrientation,
        setShowLegend,
        setShowMinimap,
        setFocusMode,
        setFocusMemberId,
        setReactFlowInstance,
        setSelectedNode,
        setShowNodeDetail,
        resetView
      }}
    >
      {children}
    </TreeViewContext.Provider>
  );
};

export const useTreeView = (): TreeViewContextValue => {
  const context = useContext(TreeViewContext);
  if (context === undefined) {
    throw new Error('useTreeView must be used within a TreeViewProvider');
  }
  return context;
};
