
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserCheck, Users, LayoutTemplate, CircleDot, MinusCircle } from 'lucide-react';

interface FamilyTreeLegendProps {
  onChangeLayout: (layout: 'vertical' | 'horizontal' | 'radial') => void;
  currentLayout: 'vertical' | 'horizontal' | 'radial';
  currentUserId?: string;
}

const FamilyTreeLegend: React.FC<FamilyTreeLegendProps> = ({
  onChangeLayout,
  currentLayout,
  currentUserId
}) => {
  return (
    <Card className="absolute bottom-4 left-4 z-10 w-48 bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200">
      <CardContent className="p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-2">View Options</p>
            <div className="flex flex-wrap gap-1">
              <Button 
                size="sm" 
                variant={currentLayout === 'vertical' ? 'default' : 'outline'} 
                className="h-7 text-xs px-2"
                onClick={() => onChangeLayout('vertical')}
              >
                <LayoutTemplate className="mr-1 h-3 w-3" />
                Vertical
              </Button>
              <Button 
                size="sm" 
                variant={currentLayout === 'horizontal' ? 'default' : 'outline'} 
                className="h-7 text-xs px-2"
                onClick={() => onChangeLayout('horizontal')}
              >
                <LayoutTemplate className="mr-1 h-3 w-3 rotate-90" />
                Horizontal
              </Button>
              <Button 
                size="sm" 
                variant={currentLayout === 'radial' ? 'default' : 'outline'} 
                className="h-7 text-xs px-2"
                onClick={() => onChangeLayout('radial')}
              >
                <CircleDot className="mr-1 h-3 w-3" />
                Radial
              </Button>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-medium mb-1">Legend</p>
            <div className="space-y-1">
              {currentUserId && (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    <UserCheck className="h-3 w-3 text-heritage-purple" />
                  </div>
                  <span className="text-xs">You</span>
                </div>
              )}
              <div className="flex items-center">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  <User className="h-3 w-3" />
                </div>
                <span className="text-xs">Living relative</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-2 flex items-center justify-center opacity-60">
                  <User className="h-3 w-3" />
                </div>
                <span className="text-xs">Deceased relative</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  <MinusCircle className="h-3 w-3" />
                </div>
                <span className="text-xs">Collapsed branch</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-medium mb-1">Relationships</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[10px]">Parent</Badge>
              <Badge variant="outline" className="text-[10px]">Child</Badge>
              <Badge variant="outline" className="text-[10px]">Spouse</Badge>
              <Badge variant="outline" className="text-[10px]">Sibling</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FamilyTreeLegend;
