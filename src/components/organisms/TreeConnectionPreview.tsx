import React from 'react';

interface ConnectionPreview {
  x: number;
  y: number;
}

interface TreeConnectionPreviewProps {
  isConnecting: boolean;
  connectionPreview: ConnectionPreview | null;
}

export const TreeConnectionPreview: React.FC<TreeConnectionPreviewProps> = ({
  isConnecting,
  connectionPreview,
}) => {
  if (!isConnecting || !connectionPreview) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: connectionPreview.x - 5,
        top: connectionPreview.y - 5,
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#7856FF',
        pointerEvents: 'none',
        zIndex: 1000,
        boxShadow: '0 0 10px rgba(120, 86, 255, 0.5)',
      }}
    />
  );
};

