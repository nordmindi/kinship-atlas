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
      className={`bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-2 max-h-[85vh] overflow-y-auto overscroll-contain ${className}`}
      style={{
        maxHeight: '85vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}
    >
      {children}
    </Panel>
  );
};

