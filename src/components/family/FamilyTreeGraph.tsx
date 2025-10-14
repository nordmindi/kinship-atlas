
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FamilyMember } from '@/types';
import { FamilyTreeGraphProps } from './tree/types';
import FamilyTreeRenderer from './tree/FamilyTreeRenderer';
import { buildGenerations } from './tree/utils/generationBuilder';
import { buildTreeNodes, buildTreeEdges } from './tree/utils/treeDataBuilder';
import { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { toast } from '@/hooks/use-toast';

interface EnhancedFamilyTreeGraphProps extends FamilyTreeGraphProps {
  showLegend?: boolean;
  showMinimap?: boolean;
  focusMode?: boolean;
  focusMemberId?: string;
  onEditMember?: (memberId: string) => void;
  onViewMemberProfile?: (memberId: string) => void;
  onAddMemberRelation?: (memberId: string) => void;
  onRelationshipUpdated?: () => void;
  onRelationshipCreated?: () => void;
  draggedNodeId?: string | null;
  relatedMembers?: string[];
}

const FamilyTreeGraph: React.FC<EnhancedFamilyTreeGraphProps> = ({ 
  members, 
  onSelectMember, 
  rootMemberId, 
  currentUserId,
  showLegend = true,
  showMinimap = true,
  focusMode = false,
  focusMemberId,
  onEditMember,
  onViewMemberProfile,
  onAddMemberRelation,
  onRelationshipUpdated,
  onRelationshipCreated,
  draggedNodeId,
  relatedMembers
}) => {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Build tree data from family members
  const treeData = useMemo(() => {
    if (!members || members.length === 0) {
      return { nodes: [], edges: [] };
    }

    try {
      // Find root member
      const rootMember = rootMemberId 
        ? members.find(m => m.id === rootMemberId) 
        : members[0];
      
      if (!rootMember) {
        console.warn('No root member found');
        return { nodes: [], edges: [] };
      }

      // Create member map for efficient lookup
      const memberMap = new Map<string, FamilyMember>();
      members.forEach(member => memberMap.set(member.id, member));

      // Build generations
      const { generations, memberGenerations, processed } = buildGenerations(rootMember, memberMap);
      
      // Calculate positions for each member in their generation
      const memberPositions = new Map<string, number>();
      const minGeneration = Math.min(...Array.from(generations.keys()));
      
      generations.forEach((memberIds, generation) => {
        memberIds.forEach((memberId, index) => {
          memberPositions.set(memberId, index);
        });
      });

      // Build nodes and edges
      const nodes = buildTreeNodes(
        members, 
        generations, 
        memberGenerations, 
        memberPositions, 
        minGeneration, 
        currentUserId,
      onEditMember,
      onViewMemberProfile,
      onAddMemberRelation,
      draggedNodeId,
      relatedMembers
    );
      const edges = buildTreeEdges(members, memberGenerations, processed);

      console.log('Tree data built:', {
        membersCount: members.length,
        nodesCount: nodes.length,
        edgesCount: edges.length,
        generations: Array.from(generations.keys()),
        rootMember: rootMember.firstName + ' ' + rootMember.lastName
      });

      return { nodes, edges };
    } catch (error) {
      console.error('Error building tree data:', error);
      toast({
        title: "Error",
        description: "Could not build family tree. Please check your family data.",
        variant: "destructive"
      });
      return { nodes: [], edges: [] };
    }
  }, [members, rootMemberId, currentUserId, onEditMember, onViewMemberProfile, onAddMemberRelation, draggedNodeId, relatedMembers]);

  // Handle node click
  const handleNodeClick = useCallback((node: Node) => {
    console.log('Node clicked:', node);
    const nodeData = node.data as { id?: string };
    setSelectedNodeId(nodeData?.id || null);
    if (onSelectMember && nodeData?.id) {
      onSelectMember(nodeData.id);
    }
  }, [onSelectMember]);

  // Handle ReactFlow initialization
  const handleInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    console.log('ReactFlow instance initialized');
  }, []);

  // Auto-fit view when tree data changes
  useEffect(() => {
    if (reactFlowInstance && treeData.nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.1, 
          duration: 800,
          includeHiddenNodes: false 
        });
      }, 100);
    }
  }, [reactFlowInstance, treeData.nodes.length]);

  // Show loading state
  if (!members || members.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No family members found</div>
          <div className="text-sm text-muted-foreground">Add family members to see your tree</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <FamilyTreeRenderer
        nodes={treeData.nodes}
        edges={treeData.edges}
        onNodeClick={handleNodeClick}
        onInit={handleInit}
        minimap={showMinimap}
        className="family-tree-container"
        familyMembers={members}
        onRelationshipUpdated={onRelationshipUpdated}
        onRelationshipCreated={onRelationshipCreated}
      />
      
      {showLegend && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
          <h4 className="font-semibold text-sm mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Male</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-100 border border-pink-300 rounded"></div>
              <span>Female</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary border border-primary rounded"></div>
              <span>You</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>Marriage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span>Parent-Child</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-purple-500 border-dashed border-t-2"></div>
              <span>Siblings</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTreeGraph;
