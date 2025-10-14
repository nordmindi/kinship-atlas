
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getYearRange } from "@/utils/dateUtils";
import { TreeNodeData } from "./types";

interface CustomNodeProps {
  nodeDatum: TreeNodeData;
  onNodeClick: (nodeId: string) => void;
  isCurrentUser: boolean;
  onAddRelative?: (nodeId: string) => void;
  relationship?: string;
  isReference?: boolean;
}

const CustomNode: React.FC<CustomNodeProps> = ({
  nodeDatum, 
  onNodeClick, 
  isCurrentUser,
  onAddRelative,
  relationship,
  isReference
}) => {
  const isDeceased = !!nodeDatum.deathDate;

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeClick(nodeDatum.id);
  };

  const handleAddRelative = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddRelative) {
      onAddRelative(nodeDatum.id);
    }
  };

  // Apply different styling based on node type
  const nodeStyle = isReference 
    ? 'border-dashed border-gray-400 bg-gray-50' 
    : isCurrentUser 
      ? 'border-2 border-heritage-purple shadow-heritage-purple/20 bg-white' 
      : isDeceased
        ? 'border border-gray-300 opacity-85 bg-white'
        : 'border border-heritage-purple/20 bg-white';

  return (
    <foreignObject width="140" height="180" x="-70" y="-90" className="overflow-visible pointer-events-none">
      <div 
        className={`flex flex-col items-center rounded-lg shadow-md p-2 border transition-all hover:shadow-lg pointer-events-auto ${nodeStyle}`}
        onClick={handleNodeClick}
      >
        {nodeDatum.avatar ? (
          <Avatar className={`h-16 w-16 ${
            isCurrentUser 
              ? 'border-3 border-heritage-purple shadow-md' 
              : isDeceased
                ? 'border-2 border-gray-300 opacity-80'
                : isReference
                  ? 'border-2 border-gray-400'
                  : 'border-2 border-heritage-purple-light'
          }`}>
            <AvatarImage src={nodeDatum.avatar} alt={`${nodeDatum.firstName} ${nodeDatum.lastName}`} />
            <AvatarFallback className={`${
              isCurrentUser 
                ? 'bg-heritage-purple text-white font-bold'
                : isDeceased
                  ? 'bg-gray-300 text-gray-600'
                  : isReference
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-heritage-purple-light text-heritage-purple'
            }`}>
              {nodeDatum.firstName[0]}{nodeDatum.lastName[0]}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className={`h-16 w-16 ${
            isCurrentUser 
              ? 'bg-heritage-purple border-3 border-heritage-purple-light shadow-md'
              : isDeceased
                ? 'bg-gray-300 border-2 border-gray-200'
                : isReference
                  ? 'bg-gray-200 border-2 border-gray-300'
                  : 'bg-heritage-purple-light border-2 border-heritage-purple/20'
          }`}>
            <AvatarFallback className={`${
              isCurrentUser 
                ? 'text-white font-bold'
                : isDeceased
                  ? 'text-gray-600'
                  : isReference
                    ? 'text-gray-600'
                    : 'text-heritage-purple'
            }`}>
              {nodeDatum.firstName[0]}{nodeDatum.lastName[0]}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="text-center mt-2">
          {relationship && (
            <Badge variant={isReference ? "outline" : "secondary"} className="text-[10px] mb-1 px-1 py-0">
              {relationship}
            </Badge>
          )}
          <p className={`font-medium text-sm line-clamp-1 ${
            isCurrentUser 
              ? 'text-heritage-purple' 
              : isDeceased
                ? 'text-gray-600'
                : isReference
                  ? 'text-gray-500'
                  : ''
          }`}>
            {nodeDatum.firstName}
            {isCurrentUser && ' (You)'}
          </p>
          <p className="text-sm line-clamp-1">{nodeDatum.lastName}</p>
          <p className="text-xs text-muted-foreground">
            {getYearRange(nodeDatum.birthDate, nodeDatum.deathDate)}
          </p>
        </div>

        {onAddRelative && !isReference && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-heritage-purple text-white hover:bg-heritage-purple-dark"
            onClick={handleAddRelative}
            title="Add relative"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
        
        {isReference && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">...</span>
          </div>
        )}
      </div>
    </foreignObject>
  );
};

export default CustomNode;
