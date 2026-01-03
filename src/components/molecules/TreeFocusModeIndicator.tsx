import React from 'react';
import { Button } from '@/components/ui/button';
import { Circle, X } from 'lucide-react';

interface TreeFocusModeIndicatorProps {
  onExit: () => void;
}

export const TreeFocusModeIndicator: React.FC<TreeFocusModeIndicatorProps> = ({
  onExit,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Circle className="h-3 w-3 text-heritage-purple" />
      <span className="text-sm">Focus Mode: Showing direct family connections</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-2 h-7 px-2"
        onClick={onExit}
      >
        <X className="h-4 w-4" />
        <span className="ml-1">Exit Focus Mode</span>
      </Button>
    </div>
  );
};

