import React from 'react';
import { Panel } from '@xyflow/react';

interface TreeControlPanelProps {
  position: 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right';
  children: React.ReactNode;
  className?: string;
}

export const TreeControlPanel: React.FC<TreeControlPanelProps> = ({
  position,
  children,
  className = '',
}) => {
  return (
    <Panel
      position={position}
      className={`bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-2 max-h-[90vh] overflow-y-auto ${className}`}
    >
      {children}
    </Panel>
  );
};

