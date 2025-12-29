
import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getYearRange } from "@/utils/dateUtils";
import AddRelativeMenu from '@/components/family/AddRelativeMenu';
import { 
  PlusCircle, 
  Heart, 
  Calendar, 
  MapPin, 
  User, 
  Crown, 
  Star, 
  Edit3, 
  Eye, 
  Plus,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  X,
  Cake,
  Skull,
  Clock
} from 'lucide-react';

interface FamilyMemberNodeProps {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    deathDate?: string;
    birthPlace?: string;
    deathPlace?: string;
    avatar?: string;
    gender: string;
    isCurrentUser?: boolean;
    relationshipType?: string;
    marriageDate?: string;
    spouseName?: string;
    bio?: string;
    currentLocation?: { lat: number; lng: number; address?: string };
    isRoot?: boolean;
    generation?: number;
    isMergeNode?: boolean;
  };
  selected: boolean;
  isDragging?: boolean;
  isBeingDragged?: boolean;
  onEdit?: (memberId: string) => void;
  onViewProfile?: (memberId: string) => void;
  onAddRelation?: (memberId: string) => void;
  onViewTimeline?: (memberId: string) => void;
}

const FamilyMemberNode = ({ data, selected, isDragging, isBeingDragged, onEdit, onViewProfile, onAddRelation, onViewTimeline }: FamilyMemberNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  
  const isDeceased = !!data.deathDate;
  const gender = data.gender || 'other';
  
  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get birth and death years for collapsed view
  const birthYear = data.birthDate ? new Date(data.birthDate).getFullYear() : null;
  const deathYear = data.deathDate ? new Date(data.deathDate).getFullYear() : null;

  // Define status-based styles
  const nodeStyles = selected
    ? 'shadow-xl border-2 border-primary ring-4 ring-primary/20'
    : data.isCurrentUser
      ? 'shadow-lg border-2 border-primary ring-2 ring-primary/30'
      : isDragging
        ? 'shadow-lg border-2 border-blue-500 ring-2 ring-blue-500/30'
        : isBeingDragged
          ? 'shadow-lg border-2 border-orange-500 ring-2 ring-orange-500/30 opacity-80'
          : 'shadow-md border border-border hover:shadow-lg';

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCloseExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
  };

  return (
    <div 
      className={`family-member-node group relative bg-white rounded-lg border transition-all duration-300 cursor-pointer
        ${nodeStyles} ${isDeceased ? 'opacity-75' : ''}`}
      style={{
        width: isExpanded ? '300px' : '180px',
        minHeight: isExpanded ? 'auto' : '88px',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        zIndex: selected ? 10 : 1
      }}
      onClick={handleCardClick}
    >
      {/* Specific connection handles for different relationship types */}
      
      {/* Parent connections - from top of card */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-green-500 !border-green-500 !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all duration-200" 
        id="parent-target" 
        style={{ 
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)'
        }}
        title="Parent connection point - Drag from here to connect as parent"
      />
      
      {/* Parent source handle for sending parent connections */}
      <Handle 
        type="source" 
        position={Position.Top} 
        className="!bg-green-500 !border-green-500 !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all duration-200" 
        id="parent-source" 
        style={{ 
          top: -6,
          left: '60%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)'
        }}
        title="Parent connection point (source) - Drag from here to connect as parent"
      />
      
      {/* Child connections - from bottom of card */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-red-500 !border-red-500 !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all duration-200" 
        id="child-source" 
        style={{ 
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(220, 38, 38, 0.4)'
        }}
        title="Child connection point - Drag from here to connect as parent (to child)"
      />
      
      {/* Child target handle for receiving child connections */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        className="!bg-red-500 !border-red-500 !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all duration-200" 
        id="child-target" 
        style={{ 
          bottom: -6,
          left: '60%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(220, 38, 38, 0.4)'
        }}
        title="Child connection point (target) - Drag to here to connect as child (from parent)"
      />
      
      {/* Spouse connections - from right side of card */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-red-500 !border-red-500 !w-4 !h-4 hover:!w-5 hover:!h-5 transition-all duration-200 !z-10" 
        id="spouse" 
        style={{ 
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
          border: '2px solid #ef4444'
        }}
        title="Spouse connection point (right side)"
      />
      
      {/* Additional spouse target handle for bidirectional spouse connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-red-500 !border-red-500 !w-4 !h-4 hover:!w-5 hover:!h-5 transition-all duration-200 !z-10" 
        id="spouse-target" 
        style={{ 
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
          border: '2px solid #ef4444'
        }}
        title="Spouse connection point (left side)"
      />
      
      {/* Sibling connections - from left side of card */}
      <Handle 
        type="source" 
        position={Position.Left} 
        className="!bg-purple-500 !border-purple-500 !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all duration-200" 
        id="sibling" 
        style={{ 
          left: -6,
          top: '30%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 8px rgba(147, 51, 234, 0.4)'
        }}
        title="Sibling connection point"
      />
      
      {/* Sibling target handle for receiving sibling connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-purple-500 !border-purple-500 !w-3 !h-3 hover:!w-4 hover:!h-4 transition-all duration-200" 
        id="sibling-target" 
        style={{ 
          left: -6,
          top: '70%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 8px rgba(147, 51, 234, 0.4)'
        }}
        title="Sibling connection point (target)"
      />
      
      {/* Visual indicator for spouse connection points */}
      <div 
        className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-red-500/20 rounded-l-full pointer-events-none"
        style={{ right: -2 }}
        title="Spouse connection area"
      />
      <div 
        className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-red-500/20 rounded-r-full pointer-events-none"
        style={{ left: -2 }}
        title="Spouse connection area"
      />

      {/* Collapsed View */}
      {!isExpanded && (
        <div className="p-3 h-full flex flex-col items-center text-center gap-2">
          {/* Avatar on its own row */}
          <Avatar className={`h-12 w-12 transition-all duration-300 ${
            data.isCurrentUser
              ? 'ring-2 ring-primary'
              : isDeceased
                ? 'opacity-50 grayscale'
                : ''
          }`}>
            <AvatarImage
              src={data.avatar}
              alt={`${data.firstName} ${data.lastName}`}
              className="object-cover"
            />
            <AvatarFallback className={`text-sm font-semibold ${
              isDeceased ? 'bg-gray-200 text-gray-500' :
              gender === 'male' ? 'bg-blue-100 text-blue-700' :
              gender === 'female' ? 'bg-pink-100 text-pink-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {data.firstName?.[0]}{data.lastName?.[0]}
            </AvatarFallback>
          </Avatar>

          {/* Full name on its own row (no truncation) */}
          <div className="flex items-center gap-1">
            <h3 className={`font-semibold text-base leading-tight ${
              data.isCurrentUser ? 'text-blue-600' :
              isDeceased ? 'text-gray-500' : 'text-gray-800'
            }`}>
              {data.firstName} {data.lastName}
            </h3>
            {data.isCurrentUser && (
              <Star className="h-3 w-3 text-blue-500" />
            )}
          </div>

          {/* Birth year below name */}
          <div className="text-sm text-gray-500">
            {birthYear && `b. ${birthYear}`}
          </div>

          {/* Expand indicator */}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-3">
          {/* Header with Close Button */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-2 flex-1">
              <Avatar className={`h-14 w-14 transition-all duration-300 ${
                data.isCurrentUser 
                  ? 'ring-2 ring-primary' 
                  : isDeceased
                    ? 'opacity-50 grayscale'
                    : ''
              }`}>
                <AvatarImage 
                  src={data.avatar} 
                  alt={`${data.firstName} ${data.lastName}`} 
                  className="object-cover"
                />
                <AvatarFallback className={`text-sm font-semibold ${
                  isDeceased ? 'bg-gray-200 text-gray-500' :
                  gender === 'male' ? 'bg-blue-100 text-blue-700' :
                  gender === 'female' ? 'bg-pink-100 text-pink-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {data.firstName?.[0]}{data.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <h3 className={`font-semibold text-lg leading-tight truncate ${
                    data.isCurrentUser ? 'text-blue-600' : 
                    isDeceased ? 'text-gray-500' : 'text-gray-800'
                  }`}>
                    {data.firstName} {data.lastName}
                  </h3>
                  {data.isCurrentUser && (
                    <Star className="h-3 w-3 text-blue-500" />
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {birthYear && `Born ${birthYear}`}
                  {deathYear && ` - Died ${deathYear}`}
                </div>
              </div>
        </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseExpanded}
              className="h-5 w-5 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Spouse Information */}
          {data.spouseName && data.marriageDate && (
            <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-500" />
                <span className="text-gray-600">Spouse:</span>
                <span className="font-medium text-gray-800">
                  {data.spouseName} ({new Date(data.marriageDate).getFullYear()})
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(data.id);
              }}
              className="h-7 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile?.(data.id);
              }}
              className="h-7 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewTimeline?.(data.id);
              }}
              className="h-7 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Clock className="h-3 w-3 mr-1" />
              Timeline
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddRelation?.(data.id);
              }}
              className="h-7 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(FamilyMemberNode);





