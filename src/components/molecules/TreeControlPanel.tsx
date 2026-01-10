import React, { useRef, useEffect, useState } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>('400px');

  useEffect(() => {
    const calculateMaxHeight = () => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        // Calculate available space from panel top to viewport bottom, minus some padding
        const availableHeight = viewportHeight - rect.top - 20; // 20px bottom padding
        setMaxHeight(`${Math.max(300, availableHeight)}px`);
      }
    };

    // Calculate on mount and resize
    calculateMaxHeight();
    
    // Use ResizeObserver for more reliable updates
    const resizeObserver = new ResizeObserver(calculateMaxHeight);
    if (panelRef.current?.parentElement) {
      resizeObserver.observe(panelRef.current.parentElement);
    }
    
    window.addEventListener('resize', calculateMaxHeight);
    
    // Recalculate after a short delay to account for layout shifts
    const timeoutId = setTimeout(calculateMaxHeight, 100);
    
    return () => {
      window.removeEventListener('resize', calculateMaxHeight);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Panel
      position={position}
      className={`bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-2 overflow-y-auto overscroll-contain ${className}`}
      style={{
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div ref={panelRef} className="flex flex-col gap-2 pb-4">
        {children}
      </div>
    </Panel>
  );
};

