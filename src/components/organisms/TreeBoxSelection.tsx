import React from 'react';

interface BoxSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isActive: boolean;
  startScreenX: number;
  startScreenY: number;
  endScreenX: number;
  endScreenY: number;
}

interface TreeBoxSelectionProps {
  boxSelection: BoxSelection | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const TreeBoxSelection: React.FC<TreeBoxSelectionProps> = ({
  boxSelection,
  containerRef,
}) => {
  if (!boxSelection || !boxSelection.isActive || !containerRef.current) {
    return null;
  }

  const containerRect = containerRef.current.getBoundingClientRect();
  const minX = Math.min(boxSelection.startScreenX, boxSelection.endScreenX) - containerRect.left;
  const minY = Math.min(boxSelection.startScreenY, boxSelection.endScreenY) - containerRect.top;
  const width = Math.abs(boxSelection.endScreenX - boxSelection.startScreenX);
  const height = Math.abs(boxSelection.endScreenY - boxSelection.startScreenY);

  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 1000,
        border: '2px dashed #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};

