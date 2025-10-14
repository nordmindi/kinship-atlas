
import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, getSmoothStepPath, Position } from '@xyflow/react';

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
  };
  style?: React.CSSProperties;
  markerEnd?: string;
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
}: FamilyRelationshipEdgeProps) => {
  // Calculate precise path based on relationship type and connection points
  const calculatePrecisePath = () => {
    // Calculate distance for dynamic curvature
    const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
    const dynamicCurvature = Math.min(0.6, Math.max(0.1, distance / 150));
    
    // Use different path types based on relationship with precise connection points
    switch (data?.relationshipType) {
      case 'parent':
        // Parent-child: straight line from parent's bottom to child's top
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
  };
  
  const [edgePath, labelX, labelY] = calculatePrecisePath();

  // Add relationship-specific icon or indicator
  const getRelationshipIcon = () => {
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
  };

  // Enhanced styling with smooth transitions and flexible appearance
  const getEdgeStyle = () => {
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
        return { 
          ...baseStyle, 
          stroke: '#9333ea', // Purple-600 - shared bond
          strokeWidth: 2.5,
          strokeDasharray: '6,3',
          strokeOpacity: 0.8
        };
      default:
        return { 
          ...baseStyle, 
          stroke: '#6b7280', 
          strokeWidth: 2.5,
          strokeOpacity: 0.7
        };
    }
  };

  // Get relationship label for accessibility and clarity
  const getRelationshipLabel = () => {
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
  };

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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={getEdgeStyle()} />
    </>
  );
};

export default memo(FamilyRelationshipEdge);
