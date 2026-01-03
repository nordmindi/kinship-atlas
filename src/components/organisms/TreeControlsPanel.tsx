import React from 'react';
import { TreeControlPanel } from '@/components/molecules/TreeControlPanel';
import { TreeZoomControls } from '@/components/molecules/TreeZoomControls';
import { TreeLayoutButtons } from '@/components/molecules/TreeLayoutButtons';
import { TreeCollapseControls } from '@/components/molecules/TreeCollapseControls';

interface TreeControlsPanelProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onSmartLayout: () => void;
  onHierarchyLayout: () => void;
  onGenealogicalLayout: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const TreeControlsPanel: React.FC<TreeControlsPanelProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleExpand,
  isExpanded,
  onSmartLayout,
  onHierarchyLayout,
  onGenealogicalLayout,
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <TreeControlPanel position="top-right">
      <TreeZoomControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onToggleExpand={onToggleExpand}
        isExpanded={isExpanded}
      />
      
      <TreeLayoutButtons
        onSmartLayout={onSmartLayout}
        onHierarchyLayout={onHierarchyLayout}
        onGenealogicalLayout={onGenealogicalLayout}
      />
      
      <TreeCollapseControls
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
      />
    </TreeControlPanel>
  );
};

