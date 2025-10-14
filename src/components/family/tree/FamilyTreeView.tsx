
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
  members, 
  onSelectMember, 
  rootMemberId, 
  currentUserId,
  showLegend = true,
  showMinimap = true,
  focusMode = false,
  focusMemberId = null
}) => {
  console.log('FamilyTreeView props:', {
    membersCount: members.length,
    rootMemberId,
    currentUserId,
    showLegend,
    showMinimap,
    focusMode,
    focusMemberId
  });

  return (
    <div className="h-full w-full" style={{ minHeight: '600px' }}>
      <SimpleFamilyTree 
        members={members} 
        onSelectMember={onSelectMember} 
        currentUserId={currentUserId} 
      />
    </div>
  );
};

export default FamilyTreeView;
