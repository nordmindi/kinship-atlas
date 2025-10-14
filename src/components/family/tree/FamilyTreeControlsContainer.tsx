
import React from 'react';
import FamilyTreeControls from './FamilyTreeControls';
import { ReactFlowInstance } from '@xyflow/react';
import { FamilyMember } from '@/types';

interface FamilyTreeControlsContainerProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAddMember: () => void;
  onExportImage: () => void;
  onShareTree: () => void;
  onChangeLayout: (layout: 'horizontal' | 'vertical') => void;
  onSearchMember: (query: string) => void;
  currentLayout: 'horizontal' | 'vertical';
  membersCount: number;
  familyMembers?: FamilyMember[];
  selectedMemberId?: string;
  onSelectMember?: (memberId: string) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
}

const FamilyTreeControlsContainer: React.FC<FamilyTreeControlsContainerProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddMember,
  onExportImage,
  onShareTree,
  onChangeLayout,
  onSearchMember,
  currentLayout,
  membersCount,
  familyMembers,
  selectedMemberId,
  onSelectMember,
  focusMode,
  onToggleFocusMode,
  showMinimap,
  onToggleMinimap
}) => {
  return (
    <FamilyTreeControls
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
      onFitView={onFitView}
      onAddMember={onAddMember}
      onExportImage={onExportImage}
      onShareTree={onShareTree}
      onChangeLayout={onChangeLayout}
      onSearchMember={onSearchMember}
      currentLayout={currentLayout}
      membersCount={membersCount}
      familyMembers={familyMembers}
      selectedMemberId={selectedMemberId}
      onSelectMember={onSelectMember}
      focusMode={focusMode}
      onToggleFocusMode={onToggleFocusMode}
      showMinimap={showMinimap}
      onToggleMinimap={onToggleMinimap}
    />
  );
};

export default FamilyTreeControlsContainer;
