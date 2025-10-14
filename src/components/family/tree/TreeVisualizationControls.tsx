
import React from 'react';
import TreeControls from './TreeControls';
import FamilyTreeLegend from '../FamilyTreeLegend';
import FamilyTreeMinimap from '../FamilyTreeMinimap';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

interface TreeVisualizationControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  membersCount: number;
  showLegend: boolean;
  showMinimap: boolean;
  treeLayout: 'vertical' | 'horizontal' | 'radial';
  currentUserId?: string;
  onChangeLayout: (layout: 'vertical' | 'horizontal' | 'radial') => void;
  containerWidth: number;
  containerHeight: number;
  onNavigate: (x: number, y: number) => void;
}

const TreeVisualizationControls: React.FC<TreeVisualizationControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  membersCount,
  showLegend,
  showMinimap,
  treeLayout,
  currentUserId,
  onChangeLayout,
  containerWidth,
  containerHeight,
  onNavigate
}) => {
  return (
    <div className="space-y-2">
      <TreeControls 
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        membersCount={membersCount}
      />

      {showLegend && (
        <div className="flex flex-col space-y-2">
          <FamilyTreeLegend 
            onChangeLayout={onChangeLayout}
            currentLayout={treeLayout}
            currentUserId={currentUserId}
          />
          
          <Card className="p-2">
            <div className="text-sm font-medium mb-2">Relationship Lines</div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center space-x-1">
                <div className="w-6 h-1 bg-heritage-purple"></div>
                <span className="text-xs">Child</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-6 h-1 bg-green-500"></div>
                <span className="text-xs">Parent</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-6 h-1 bg-red-500 border-t border-dashed"></div>
                <span className="text-xs">Spouse</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-6 h-1 bg-blue-500 border-t border-dashed"></div>
                <span className="text-xs">Sibling</span>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {showMinimap && (
        <FamilyTreeMinimap
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          visibleArea={{
            x: 0,
            y: 0,
            width: containerWidth / 2,
            height: containerHeight / 2
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};

export default TreeVisualizationControls;
