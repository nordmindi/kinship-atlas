
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface FamilyTreeMinimapProps {
  containerWidth: number;
  containerHeight: number;
  visibleArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onNavigate: (x: number, y: number) => void;
}

const FamilyTreeMinimap: React.FC<FamilyTreeMinimapProps> = ({
  containerWidth,
  containerHeight,
  visibleArea,
  onNavigate
}) => {
  // Minimap dimensions
  const minimapWidth = 120;
  const minimapHeight = 80;
  
  // Scale factor between the real container and the minimap
  const scaleX = minimapWidth / Math.max(containerWidth, 100); // Prevent division by zero
  const scaleY = minimapHeight / Math.max(containerHeight, 100);
  
  // Scaled visible area
  const visibleRect = {
    x: visibleArea.x * scaleX,
    y: visibleArea.y * scaleY,
    width: Math.max(visibleArea.width * scaleX, 10), // Ensure minimum visible size
    height: Math.max(visibleArea.height * scaleY, 10),
  };
  
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / scaleX);
    const y = ((e.clientY - rect.top) / scaleY);
    onNavigate(x, y);
  };

  // Generate some nodes based on the tree structure to represent the minimap
  const generateMinimapNodes = () => {
    // These positions represent relative positions in the minimap
    const nodePositions = [
      { top: '15%', left: '50%', size: 'w-2 h-2', color: 'bg-heritage-purple' },
      { top: '40%', left: '35%', size: 'w-2 h-2', color: 'bg-heritage-purple-light' },
      { top: '40%', left: '65%', size: 'w-2 h-2', color: 'bg-heritage-purple-light' },
      { top: '65%', left: '50%', size: 'w-3 h-3', color: 'bg-heritage-purple-dark' },
      { top: '80%', left: '30%', size: 'w-2 h-2', color: 'bg-heritage-purple-light' },
      { top: '80%', left: '70%', size: 'w-2 h-2', color: 'bg-heritage-purple-light' },
    ];
    
    return nodePositions.map((pos, index) => (
      <div 
        key={index}
        className={`absolute ${pos.size} ${pos.color} rounded-full`}
        style={{ 
          top: pos.top, 
          left: pos.left, 
          transform: pos.left === '50%' ? 'translateX(-50%)' : 'none' 
        }}
      />
    ));
  };

  return (
    <Card className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200">
      <CardContent className="p-2">
        <div 
          className="relative bg-gray-100 cursor-pointer"
          style={{ width: minimapWidth, height: minimapHeight }}
          onClick={handleMinimapClick}
        >
          {/* Tree structure visualization */}
          {generateMinimapNodes()}
          
          {/* Visible area indicator */}
          <div 
            className="absolute border-2 border-heritage-purple pointer-events-none"
            style={{
              left: visibleRect.x,
              top: visibleRect.y,
              width: visibleRect.width,
              height: visibleRect.height,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FamilyTreeMinimap;
