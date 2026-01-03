import React from 'react';

interface TreeCollisionWarningProps {
  collisionCount: number;
}

export const TreeCollisionWarning: React.FC<TreeCollisionWarningProps> = ({
  collisionCount,
}) => {
  if (collisionCount === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 1000,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      Warning: Collision detected with {collisionCount} node(s)
    </div>
  );
};

