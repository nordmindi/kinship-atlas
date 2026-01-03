import React from 'react';
import { Node } from '@xyflow/react';

interface TreeCollisionHighlightProps {
  collisionNodes: string[];
  nodes: Node[];
}

export const TreeCollisionHighlight: React.FC<TreeCollisionHighlightProps> = ({
  collisionNodes,
  nodes,
}) => {
  if (collisionNodes.length === 0) return null;

  return (
    <>
      {collisionNodes.map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;

        return (
          <div
            key={`collision-${nodeId}`}
            style={{
              position: 'absolute',
              left: node.position.x - 90,
              top: node.position.y - 50,
              width: '180px',
              height: '100px',
              border: '2px solid #ef4444',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              pointerEvents: 'none',
              zIndex: 999,
              animation: 'pulse 1s infinite',
            }}
          />
        );
      })}
    </>
  );
};

