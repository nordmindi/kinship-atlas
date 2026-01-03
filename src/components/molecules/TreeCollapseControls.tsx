import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TreeCollapseControlsProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const TreeCollapseControls: React.FC<TreeCollapseControlsProps> = ({
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
      <div className="text-xs font-semibold text-gray-600 mb-1">Branch Controls</div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onExpandAll}
        className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
        title="Expand all collapsed branches"
      >
        <ChevronDown className="h-4 w-4 mr-1" />
        Expand All
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onCollapseAll}
        className="h-8 text-xs border-red-500 text-red-600 hover:bg-red-50"
        title="Collapse all branches with descendants"
      >
        <ChevronUp className="h-4 w-4 mr-1" />
        Collapse All
      </Button>
    </div>
  );
};

