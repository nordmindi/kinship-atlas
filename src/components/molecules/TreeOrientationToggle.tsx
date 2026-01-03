import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface TreeOrientationToggleProps {
  orientation: 'horizontal' | 'vertical';
  onOrientationChange: (orientation: 'horizontal' | 'vertical') => void;
}

export const TreeOrientationToggle: React.FC<TreeOrientationToggleProps> = ({
  orientation,
  onOrientationChange,
}) => {
  return (
    <ToggleGroup
      type="single"
      value={orientation}
      onValueChange={(val) => {
        if (val) onOrientationChange(val as 'horizontal' | 'vertical');
      }}
    >
      <ToggleGroupItem value="vertical" aria-label="Vertical Layout">
        <ArrowDown className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="horizontal" aria-label="Horizontal Layout">
        <ArrowRight className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

