import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Edit, Crown, Users } from 'lucide-react';

interface PermissionIndicatorProps {
  canEdit: boolean;
  isAdmin?: boolean;
  memberCreatedBy?: string;
  currentUserId?: string;
  className?: string;
}

export const PermissionIndicator: React.FC<PermissionIndicatorProps> = ({
  canEdit,
  isAdmin = false,
  memberCreatedBy,
  currentUserId,
  className = ""
}) => {
  const isOwner = memberCreatedBy === currentUserId;

  if (isAdmin) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={`bg-purple-100 text-purple-800 border-purple-200 ${className}`}>
              <Crown className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>You have admin privileges and can edit all family members</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (canEdit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={`bg-green-100 text-green-800 border-green-200 ${className}`}>
              <Edit className="h-3 w-3 mr-1" />
              {isOwner ? 'Owner' : 'Editable'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOwner ? 'You created this member' : 'You can edit this family member'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`bg-gray-100 text-gray-600 border-gray-200 ${className}`}>
            <Lock className="h-3 w-3 mr-1" />
            View Only
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>You can view this family member but cannot edit it</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface BranchIndicatorProps {
  isRootMember?: boolean;
  branchRoot?: string;
  className?: string;
}

export const BranchIndicator: React.FC<BranchIndicatorProps> = ({
  isRootMember = false,
  branchRoot,
  className = ""
}) => {
  if (isRootMember) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`bg-blue-50 text-blue-700 border-blue-200 ${className}`}>
              <Users className="h-3 w-3 mr-1" />
              Branch Root
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This is the root member of a family branch</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
};
