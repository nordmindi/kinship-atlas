
import React, { memo, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, getSmoothStepPath, Position, useReactFlow } from '@xyflow/react';

interface FamilyRelationshipEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: {
    relationshipType: 'parent' | 'child' | 'spouse' | 'sibling';
    mergeInfo?: {
      hasMerge: boolean;
      otherParentId?: string;
      childId: string;
      allChildrenIds?: string[]; // All children of this spouse pair
    };
  };
  style?: React.CSSProperties;
  markerEnd?: string;
  source: string;
  target: string;
}

const FamilyRelationshipEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
  source,
  target,
}: FamilyRelationshipEdgeProps) => {
  const { getNode } = useReactFlow();
  
  // Memoize path calculation
  const [edgePath, labelX, labelY] = useMemo(() => {
    // Calculate distance for dynamic curvature
    const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
    const dynamicCurvature = Math.min(0.6, Math.max(0.1, distance / 150));
    
    // Use different path types based on relationship with precise connection points
    switch (data?.relationshipType) {
      case 'parent':
        // Check if this edge should merge with another parent's edge
        if (data?.mergeInfo?.hasMerge && data.mergeInfo.otherParentId && data.mergeInfo.allChildrenIds) {
          const otherParentNode = getNode(data.mergeInfo.otherParentId);
          if (otherParentNode) {
            // Get current parent's node to ensure we have accurate position
            const currentParentNode = getNode(source);
            if (!currentParentNode) return getStraightPath({ sourceX, sourceY, targetX, targetY });
            
            // Get both parent handle positions (bottom center of each node)
            const currentParentHandleX = sourceX;
            const currentParentHandleY = sourceY;
            const otherParentHandleX = otherParentNode.position.x + (otherParentNode.width || 200) / 2;
            const otherParentHandleY = otherParentNode.position.y + (otherParentNode.height || 100);
            
            // Determine which parent is left and which is right
            const leftParentX = Math.min(currentParentHandleX, otherParentHandleX);
            const rightParentX = Math.max(currentParentHandleX, otherParentHandleX);
            const leftParentY = currentParentHandleX < otherParentHandleX ? currentParentHandleY : otherParentHandleY;
            const rightParentY = currentParentHandleX < otherParentHandleX ? otherParentHandleY : currentParentHandleY;
            
            const childX = targetX;
            const childY = targetY;
            
            // Get all children nodes to calculate branch line
            const allChildrenNodes = data.mergeInfo.allChildrenIds
              .map(childId => getNode(childId))
              .filter(node => node !== undefined) as any[];
            
            if (allChildrenNodes.length > 0) {
              // Calculate the branch line: horizontal line that spans all children
              // Use the actual child handle positions (top center of each child node)
              const childHandles = allChildrenNodes.map(node => ({
                x: node.position.x + (node.width || 200) / 2,
                y: node.position.y // Top of node where handle is
              }));
              
              const minChildX = Math.min(...childHandles.map(h => h.x));
              const maxChildX = Math.max(...childHandles.map(h => h.x));
              
              // Calculate Y positions:
              // - Merge Y: where parent lines meet (about 25-30% down from parents)
              // - Branch Y: horizontal line above children (about 85% down, just above children)
              const avgParentY = Math.max(leftParentY, rightParentY);
              const minChildY = Math.min(...childHandles.map(h => h.y));
              const mergeY = avgParentY + (minChildY - avgParentY) * 0.25; // 25% down
              const branchY = minChildY - 20; // Just above the topmost child
              
              // Merge point: centered between parents horizontally
              // CRITICAL: Both parent edges must use the exact same mergeX and mergeY
              // to create a single shared horizontal merge line
              const mergeX = (leftParentX + rightParentX) / 2;
              
              // Determine if this edge is from the left or right parent
              const isLeftParent = currentParentHandleX < otherParentHandleX;
              const currentParentX = isLeftParent ? leftParentX : rightParentX;
              const currentParentY = isLeftParent ? leftParentY : rightParentY;
              
              // CRITICAL: Use shared coordinates for all common segments to ensure lines snap together
              // All edges must use the exact same coordinates for:
              // 1. Merge point (mergeX, mergeY) - shared horizontal line
              // 2. Vertical segment from merge to branch (sharedVerticalX) - shared vertical line
              // 3. Branch line Y (sharedBranchY) - shared horizontal line spanning minChildX to maxChildX
              
              // Shared vertical line from merge to branch - all edges use same X
              const sharedVerticalX = mergeX;
              
              // Shared branch line - all edges use same Y
              // The horizontal branch line spans from minChildX to maxChildX
              // Each edge contributes a segment from mergeX to its childX, creating a continuous line
              const sharedBranchY = branchY;
              
              // Create path following the classic family tree pattern:
              // For the LEFT parent:
              //   1. Down from parent to merge Y
              //   2. Horizontal RIGHT to merge X (where lines meet)
              // For the RIGHT parent:
              //   1. Down from parent to merge Y
              //   2. Horizontal LEFT to merge X (where lines meet)
              // Both meet at mergeX, mergeY creating a single shared horizontal line
              // Then from merge point (same for ALL edges, using sharedVerticalX):
              //   3. Down to branch Y (using sharedBranchY - all edges use same Y)
              //   4. Horizontal to child's X position on the branch line
              //   5. Down to child Y
              
              // The path goes: parent -> mergeY -> mergeX -> branchY -> childX -> childY
              // All edges share the same mergeX, mergeY, and sharedBranchY
              // The horizontal branch line is created by all edges using the same branchY
              // and connecting horizontally to their respective childX positions
              // This creates a single horizontal branch line that spans from minChildX to maxChildX
              const pathString = `M ${currentParentX} ${currentParentY} L ${currentParentX} ${mergeY} L ${mergeX} ${mergeY} L ${sharedVerticalX} ${sharedBranchY} L ${childX} ${sharedBranchY} L ${childX} ${childY}`;
              return [pathString, childX, (sharedBranchY + childY) / 2];
            }
          }
        }
        
        // Parent-child: straight line from parent's bottom to child's top (default)
        return getStraightPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
        });
      case 'child':
        // Child-parent: red line from child's top to parent's bottom (reverse direction)
        return getStraightPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
        });
      case 'spouse':
        // Spouse: horizontal curved line connecting sides with gentle curve
        return getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          curvature: Math.max(0.2, dynamicCurvature * 0.8), // Gentler curve for side connections
        });
      case 'sibling':
        // Sibling: curved line connecting through shared parent area
        return getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          curvature: Math.max(0.2, dynamicCurvature * 0.8),
        });
      default:
        // Default: smooth step with flexible routing
        return getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 20,
        });
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data?.relationshipType, data?.mergeInfo, getNode, source, id]);

  // Memoize relationship icon
  const relationshipIcon = useMemo(() => {
    switch (data?.relationshipType) {
      case 'spouse':
        return '💕';
      case 'parent':
        return '👨‍👩‍👧‍👦';
      case 'child':
        return '👶';
      case 'sibling':
        return '👫';
      default:
        return '';
    }
  }, [data?.relationshipType]);

  // Memoize edge style
  const edgeStyle = useMemo(() => {
    const baseStyle = { 
      ...style,
      strokeWidth: 3,
      filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.15))',
      transition: 'all 0.3s ease-in-out',
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const
    };
    
    switch (data?.relationshipType) {
      case 'spouse':
        return { 
          ...baseStyle, 
          stroke: '#dc2626', // Red-600 - marriage
          strokeWidth: 3,
          strokeDasharray: '8,4',
          strokeDashoffset: 0,
          animation: 'dash 2s linear infinite'
        };
      case 'parent':
        return { 
          ...baseStyle, 
          stroke: '#16a34a', // Green-600 - growth/nurturing
          strokeWidth: 3,
          strokeOpacity: 0.9
        };
      case 'child':
        return { 
          ...baseStyle, 
          stroke: '#2563eb', // Blue-600 - heritage/legacy
          strokeWidth: 3,
          strokeOpacity: 0.9
        };
      case 'sibling':
        // Different colors for full vs half siblings
        if (data?.siblingType === 'half') {
          return { 
            ...baseStyle, 
            stroke: '#f59e0b', // Amber-500 - half siblings (different color)
            strokeWidth: 2.5,
            strokeDasharray: '4,4',
            strokeOpacity: 0.8
          };
        } else {
          // Full siblings (default) or undefined (fallback)
          return { 
            ...baseStyle, 
            stroke: '#9333ea', // Purple-600 - full siblings (shared bond)
            strokeWidth: 2.5,
            strokeDasharray: '6,3',
            strokeOpacity: 0.8
          };
        }
      default:
        return { 
          ...baseStyle, 
          stroke: '#6b7280', 
          strokeWidth: 2.5,
          strokeOpacity: 0.7
        };
    }
  }, [data?.relationshipType, style]);

  // Memoize relationship label
  const relationshipLabel = useMemo(() => {
    switch (data?.relationshipType) {
      case 'spouse':
        return 'Married to';
      case 'parent':
        return 'Parent of';
      case 'child':
        return 'Child of';
      case 'sibling':
        return 'Sibling of';
      default:
        return 'Related to';
    }
  }, [data?.relationshipType]);

  return (
    <>
      <style>
        {`
          @keyframes dash {
            to {
              stroke-dashoffset: -12;
            }
          }
          @keyframes pulse {
            0%, 100% {
              stroke-opacity: 0.8;
            }
            50% {
              stroke-opacity: 1;
            }
          }
        `}
      </style>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
    </>
  );
};

// Enhanced memoization with custom comparison
export default memo(FamilyRelationshipEdge, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.sourceX === nextProps.sourceX &&
    prevProps.sourceY === nextProps.sourceY &&
    prevProps.targetX === nextProps.targetX &&
    prevProps.targetY === nextProps.targetY &&
    prevProps.data?.relationshipType === nextProps.data?.relationshipType &&
    prevProps.data?.mergeInfo?.hasMerge === nextProps.data?.mergeInfo?.hasMerge &&
    prevProps.data?.mergeInfo?.otherParentId === nextProps.data?.mergeInfo?.otherParentId &&
    prevProps.markerEnd === nextProps.markerEnd
  );
});
