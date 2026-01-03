import React from 'react';

interface DragPreview {
  x: number;
  y: number;
  valid: boolean;
}

interface TreeDragPreviewProps {
  dragPreview: DragPreview | null;
}

export const TreeDragPreview: React.FC<TreeDragPreviewProps> = ({
  dragPreview,
}) => {
  if (!dragPreview) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: dragPreview.x - 90,
        top: dragPreview.y - 50,
        width: '180px',
        height: '100px',
        border: `2px dashed ${dragPreview.valid ? '#10b981' : '#ef4444'}`,
        borderRadius: '8px',
        backgroundColor: dragPreview.valid
          ? 'rgba(16, 185, 129, 0.1)'
          : 'rgba(239, 68, 68, 0.1)',
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        color: dragPreview.valid ? '#10b981' : '#ef4444',
      }}
    >
      {dragPreview.valid ? '✓ Valid Position' : '✗ Collision Detected'}
    </div>
  );
};

