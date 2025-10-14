
import React from 'react';
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TreeControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  membersCount: number;
}

const TreeControls: React.FC<TreeControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  membersCount
}) => {
  return (
    <div className="bg-white p-2 border-b flex justify-between items-center">
      <div>
        <h3 className="text-sm font-medium">Family Tree View</h3>
        <p className="text-xs text-muted-foreground">
          {membersCount} family members
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          onClick={onZoomIn}
          disabled={zoom >= 3}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TreeControls;
