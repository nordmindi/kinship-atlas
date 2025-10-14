
import React from 'react';
import { Card } from '@/components/ui/card';

const FamilyTreeLegend: React.FC = () => {
  return (
    <Card className="p-3 shadow-sm">
      <h3 className="font-medium text-sm mb-2">Relationship Legend</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300"></div>
          <span className="text-xs">Male</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-pink-100 border border-pink-300"></div>
          <span className="text-xs">Female</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300"></div>
          <span className="text-xs">Other</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-heritage-purple"></div>
          <span className="text-xs">Current User</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-red-500"></div>
          <span className="text-xs">Spouse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-green-500"></div>
          <span className="text-xs">Parent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-blue-500"></div>
          <span className="text-xs">Child</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-purple-500 border-t border-dashed"></div>
          <span className="text-xs">Sibling</span>
        </div>
      </div>
    </Card>
  );
};

export default FamilyTreeLegend;
