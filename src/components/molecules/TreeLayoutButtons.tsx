import React from 'react';
import { Button } from '@/components/ui/button';
import { TreePine, GitBranch } from 'lucide-react';

interface TreeLayoutButtonsProps {
  onSmartLayout: () => void;
  onHierarchyLayout: () => void;
  onGenealogicalLayout: () => void;
}

export const TreeLayoutButtons: React.FC<TreeLayoutButtonsProps> = ({
  onSmartLayout,
  onHierarchyLayout,
  onGenealogicalLayout,
}) => {
  return (
    <div className="flex flex-col gap-1 border-t border-gray-200 pt-2 mt-1">
      <div className="text-xs font-semibold text-gray-600 mb-1">Layout Options</div>
      <Button
        size="sm"
        variant="default"
        onClick={onSmartLayout}
        className="h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
        title="Smart Layout"
      >
        <TreePine className="h-4 w-4 mr-1" />
        Smart Layout
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onHierarchyLayout}
        className="h-8 text-xs border-blue-500 text-blue-600 hover:bg-blue-50 font-medium"
        title="Hierarchy Layout - Parents on top, children below, spouses side by side"
      >
        <TreePine className="h-4 w-4 mr-1" />
        Hierarchy Layout
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onGenealogicalLayout}
        className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
        title="Genealogy Tree"
      >
        <GitBranch className="h-4 w-4 mr-1" />
        Genealogy Tree
      </Button>
    </div>
  );
};

