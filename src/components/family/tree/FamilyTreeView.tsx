
import React from 'react';
import { FamilyTreeGraphProps } from './types';
import SimpleFamilyTree from './SimpleFamilyTree';
import './FamilyTree.css';

interface FamilyTreeViewProps extends FamilyTreeGraphProps {
  showLegend?: boolean;
  showMinimap?: boolean;
  focusMode?: boolean;
  focusMemberId?: string;
}

const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({ 
  members = [], 
  onSelectMember, 
  rootMemberId, 
  currentUserId,
  showLegend = true,
  showMinimap = true,
  focusMode = false,
  focusMemberId = null
}) => {
  // Handle undefined/null members gracefully
  const safeMembers = members || [];
  
  if (import.meta.env.DEV && !import.meta.env.CI) {
    console.log('FamilyTreeView props:', {
      membersCount: safeMembers.length,
      rootMemberId,
      currentUserId,
      showLegend,
      showMinimap,
      focusMode,
      focusMemberId
    });
  }

  // Show empty state if no members
  if (safeMembers.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: '600px' }}>
        <div className="text-center">
          <p className="text-muted-foreground">No family members found</p>
          <p className="text-sm text-muted-foreground mt-2">Start by adding your first family member</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ minHeight: '600px' }}>
      <SimpleFamilyTree 
        members={safeMembers} 
        onSelectMember={onSelectMember} 
        currentUserId={currentUserId} 
      />
    </div>
  );
};

export default FamilyTreeView;
