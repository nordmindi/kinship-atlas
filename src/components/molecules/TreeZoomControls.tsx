import React from 'react';
import { TreeIconButton } from '@/components/atoms/TreeIconButton';
import { ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

interface TreeZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export const TreeZoomControls: React.FC<TreeZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleExpand,
  isExpanded = false,
}) => {
  return (
    <div className="flex gap-1">
      <TreeIconButton
        icon={ZoomOut}
        onClick={onZoomOut}
        title="Zoom Out"
      />
      <TreeIconButton
        icon={ZoomIn}
        onClick={onZoomIn}
        title="Zoom In"
      />
      <TreeIconButton
        icon={Maximize}
        onClick={onFitView}
        title="Fit View - Ctrl/Cmd + 0"
      />
      {onToggleExpand && (
        <TreeIconButton
          icon={Minimize}
          onClick={onToggleExpand}
          title={isExpanded ? 'Exit Full Screen - Esc' : 'Enter Full Screen'}
        />
      )}
    </div>
  );
};

