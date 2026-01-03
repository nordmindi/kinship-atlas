
import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  ReactFlowInstance,
  Node,
  Edge,
  Panel,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import FamilyMemberNode from './FamilyMemberNode';
import FamilyRelationshipEdge from './FamilyRelationshipEdge';
import { 
  ArrowRight as ArrowRightIcon, 
  ArrowDown as ArrowDownIcon, 
  X as XIcon, 
  Circle as DotIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Maximize as MaximizeIcon,
  Minimize as MinimizeIcon,
  TreePine as TreePineIcon,
  GitBranch as GenealogyIcon,
  RotateCcw as FlipIcon,
  Users as StandardPedigreeIcon,
  UserCheck as CombinationPedigreeIcon,
  UserPlus as DescendantChartIcon,
  ArrowUpDown as PedigreeIcon,
  Network as NetworkIcon,
  TrendingDown as DescendantIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Minus as MinusIcon,
  Plus as PlusIcon
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { FamilyMemberNode as FamilyMemberNodeType } from './types';
import { FamilyMember } from '@/types';
import { layoutService } from '@/services/layoutService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import { toast } from 'sonner';
import { useTreeCollapse } from './hooks/useTreeCollapse';
import { useRelationshipPathFinder } from './hooks/useRelationshipPathFinder';
import './FamilyTree.css';

interface FamilyTreeRendererProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (node: FamilyMemberNodeType) => void;
  className?: string;
  onInit?: (instance: ReactFlowInstance) => void;
  minimap?: boolean;
  familyMembers?: FamilyMember[]; // Original family members data for hierarchy layout
  onRelationshipCreated?: () => void; // Callback when a relationship is created
}

// Registering custom node and edge types
const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const edgeTypes = {
  familyRelationship: FamilyRelationshipEdge,
  straight: FamilyRelationshipEdge,
  smoothstep: FamilyRelationshipEdge,
  default: FamilyRelationshipEdge,
};

// Define arrow markers for different relationship types
const getMarkerEnd = (relationshipType: string) => {
  switch (relationshipType) {
    case 'parent':
      return 'url(#arrow-parent)';
    case 'child':
      return 'url(#arrow-child)';
    case 'spouse':
      return 'url(#arrow-spouse)';
    default:
      return 'url(#arrow-default)';
  }
};

const FamilyTreeRenderer: React.FC<FamilyTreeRendererProps> = ({
  nodes,
  edges,
  onNodeClick,
  className = '',
  onInit,
  minimap = true,
  familyMembers = [],
  onRelationshipCreated
}) => {
  const [orientation, setOrientation] = React.useState<'horizontal' | 'vertical'>('vertical');
  const [focusMode, setFocusMode] = React.useState(false);
  const [focusMemberId, setFocusMemberId] = React.useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);
  const [treeOrientation, setTreeOrientation] = React.useState<'top-down' | 'bottom-up'>('top-down');
  const [treeType, setTreeType] = React.useState<'standard-pedigree' | 'combination-pedigree' | 'descendant-chart'>('standard-pedigree');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [draggedNodeId, setDraggedNodeId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = React.useState<{ x: number; y: number; valid: boolean } | null>(null);
  const [collisionNodes, setCollisionNodes] = React.useState<string[]>([]);
  // Multi-select drag state - stores initial positions of all selected nodes
  const [selectedNodesInitialPositions, setSelectedNodesInitialPositions] = React.useState<Map<string, { x: number; y: number }>>(new Map());
  const [editingRelationshipId, setEditingRelationshipId] = React.useState<string | null>(null);
  const [isRelationshipDialogOpen, setIsRelationshipDialogOpen] = React.useState(false);
  
  // Drag-to-connect state
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connectionStart, setConnectionStart] = React.useState<{nodeId: string, handleId: string, handleType: 'source' | 'target'} | null>(null);
  const [connectionPreview, setConnectionPreview] = React.useState<{x: number, y: number} | null>(null);
  
  // Box selection state - store in screen coordinates for rendering
  const [boxSelection, setBoxSelection] = React.useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isActive: boolean;
    startScreenX: number;
    startScreenY: number;
    endScreenX: number;
    endScreenY: number;
  } | null>(null);
  
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mobile touch gesture state
  const [isMobile, setIsMobile] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  
  // CRITICAL FIX: Store callbacks in a ref to preserve them across React Flow updates
  // React Flow's onNodesChange (via applyNodeChanges) strips custom properties
  // MUST be initialized BEFORE useNodesState so we can preserve callbacks immediately
  const callbacksRef = useRef<Map<string, {
    onEdit?: (memberId: string) => void;
    onViewProfile?: (memberId: string) => void;
    onAddRelation?: (memberId: string) => void;
    onViewTimeline?: (memberId: string) => void;
  }>>(new Map());
  
  // Function to preserve callbacks from nodes
  const preserveCallbacks = useCallback((nodes: Node[]) => {
    nodes.forEach(node => {
      const nodeWithCallbacks = node as FamilyMemberNodeType;
      // Check both direct props and data for callbacks
      const onEdit = nodeWithCallbacks.onEdit || (nodeWithCallbacks.data as any)?.onEdit;
      const onViewProfile = nodeWithCallbacks.onViewProfile || (nodeWithCallbacks.data as any)?.onViewProfile;
      const onAddRelation = nodeWithCallbacks.onAddRelation || (nodeWithCallbacks.data as any)?.onAddRelation;
      const onViewTimeline = nodeWithCallbacks.onViewTimeline || (nodeWithCallbacks.data as any)?.onViewTimeline;
      
      if (onEdit || onViewProfile || onAddRelation || onViewTimeline) {
        callbacksRef.current.set(node.id, {
          onEdit,
          onViewProfile,
          onAddRelation,
          onViewTimeline,
        });
        if (import.meta.env.DEV) {
          console.log('💾 Preserved callbacks for node', node.id, {
            onEdit: !!onEdit,
            onViewProfile: !!onViewProfile,
            onAddRelation: !!onAddRelation,
            onViewTimeline: !!onViewTimeline
          });
        }
      }
    });
  }, []);
  
  // Function to restore callbacks to nodes
  // MUST be defined before useMemo that uses it
  const restoreCallbacks = useCallback((nodes: Node[]): Node[] => {
    if (!nodes || nodes.length === 0) return nodes;
    
    return nodes.map(node => {
      const callbacks = callbacksRef.current.get(node.id);
      if (!callbacks) {
        // If no callbacks found, try to extract from node itself first
        const nodeWithCallbacks = node as FamilyMemberNodeType;
        const onEdit = nodeWithCallbacks.onEdit || (nodeWithCallbacks.data as any)?.onEdit;
        const onViewProfile = nodeWithCallbacks.onViewProfile || (nodeWithCallbacks.data as any)?.onViewProfile;
        const onAddRelation = nodeWithCallbacks.onAddRelation || (nodeWithCallbacks.data as any)?.onAddRelation;
        const onViewTimeline = nodeWithCallbacks.onViewTimeline || (nodeWithCallbacks.data as any)?.onViewTimeline;
        
        // If callbacks exist on node but not in ref, preserve them
        if (onEdit || onViewProfile || onAddRelation || onViewTimeline) {
          callbacksRef.current.set(node.id, {
            onEdit,
            onViewProfile,
            onAddRelation,
            onViewTimeline,
          });
          // Return node with callbacks
          return {
            ...node,
            onEdit,
            onViewProfile,
            onAddRelation,
            onViewTimeline,
            data: {
              ...node.data,
              onEdit,
              onViewProfile,
              onAddRelation,
              onViewTimeline,
            }
          };
        }
        
        // If no callbacks found anywhere, log for debugging
        if (import.meta.env.DEV) {
          console.warn('⚠️ No callbacks found in ref for node', node.id, {
            'refHasNode': callbacksRef.current.has(node.id),
            'refSize': callbacksRef.current.size,
            'refKeys': Array.from(callbacksRef.current.keys()).slice(0, 5)
          });
        }
        return node;
      }
      
      const restored = {
        ...node,
        ...callbacks, // Restore as direct props
        data: {
          ...node.data,
          ...callbacks, // Also in data as fallback
        }
      };
      
      if (import.meta.env.DEV) {
        console.log('✅ Restored callbacks for node', node.id, {
          onEdit: !!restored.onEdit,
          onViewProfile: !!restored.onViewProfile,
          onAddRelation: !!restored.onAddRelation,
          onViewTimeline: !!restored.onViewTimeline,
          'dataHasCallbacks': !!(restored.data as any).onEdit
        });
      }
      
      return restored;
    });
  }, []);
  
  // CRITICAL: Preserve callbacks from incoming nodes prop IMMEDIATELY
  // This must happen synchronously before useNodesState processes them
  // We preserve callbacks here so they're available even if nodes are stripped
  if (nodes && nodes.length > 0) {
    nodes.forEach(node => {
      const nodeWithCallbacks = node as FamilyMemberNodeType;
      // Check both direct props and data for callbacks
      const onEdit = nodeWithCallbacks.onEdit || (nodeWithCallbacks.data as any)?.onEdit;
      const onViewProfile = nodeWithCallbacks.onViewProfile || (nodeWithCallbacks.data as any)?.onViewProfile;
      const onAddRelation = nodeWithCallbacks.onAddRelation || (nodeWithCallbacks.data as any)?.onAddRelation;
      const onViewTimeline = nodeWithCallbacks.onViewTimeline || (nodeWithCallbacks.data as any)?.onViewTimeline;
      
      if (onEdit || onViewProfile || onAddRelation || onViewTimeline) {
        callbacksRef.current.set(node.id, {
          onEdit,
          onViewProfile,
          onAddRelation,
          onViewTimeline,
        });
      }
    });
  }
  
  // CRITICAL: Restore callbacks to nodes before passing to useNodesState
  // This ensures initial state has callbacks
  // Call restoreCallbacks directly (it's already defined above)
  const nodesWithCallbacks = nodes && nodes.length > 0 ? restoreCallbacks(nodes) : nodes;
  
  // State management for interactive nodes and edges
  // Use nodesWithCallbacks to ensure initial state has callbacks
  const [nodesState, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);
  
  // Wrapped onNodesChange that preserves callbacks
  const onNodesChangeWithCallbacks = useCallback((changes: NodeChange[]) => {
    // First, preserve callbacks from current state before changes
    preserveCallbacks(nodesState);
    
    // Apply React Flow's changes
    onNodesChange(changes);
    
    // Restore callbacks after changes are applied
    // Use setTimeout to ensure changes are processed first
    setTimeout(() => {
      setNodes((currentNodes) => restoreCallbacks(currentNodes));
    }, 0);
  }, [nodesState, onNodesChange, setNodes, preserveCallbacks, restoreCallbacks]);
  
  // Collapse/expand functionality
  const {
    toggleCollapse,
    isCollapsed,
    isHidden,
    getHiddenDescendantCount,
    collapseAll,
    expandAll,
    getVisibleNodes,
    getVisibleEdges
  } = useTreeCollapse(familyMembers, nodesState);
  
  // Relationship path finder
  const {
    findPath,
    findAndHighlightPath
  } = useRelationshipPathFinder(familyMembers, nodesState, edgesState);
  
  // State for path highlighting
  const [highlightedPath, setHighlightedPath] = React.useState<string[]>([]);
  const [pathStartMember, setPathStartMember] = React.useState<string | null>(null);
  
  // Helper functions to find related family members
  const findChildren = useCallback((memberId: string): string[] => {
    if (!familyMembers) return [];
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return [];
    
    return member.relations
      .filter(rel => rel.type === 'child')
      .map(rel => rel.personId);
  }, [familyMembers]);

  const findParents = (memberId: string): string[] => {
    if (!familyMembers) return [];
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return [];
    
    return member.relations
      .filter(rel => rel.type === 'parent')
      .map(rel => rel.personId);
  };

  const findSpouse = useCallback((memberId: string): string | null => {
    if (!familyMembers) return null;
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return null;
    
    const spouseRelation = member.relations.find(rel => rel.type === 'spouse');
    return spouseRelation ? spouseRelation.personId : null;
  }, [familyMembers]);

  const getAllRelatedMembers = (memberId: string): string[] => {
    const children = findChildren(memberId);
    const spouse = findSpouse(memberId);
    
    // For drag behavior:
    // - Children always follow their parents
    // - Spouses move together
    // - Parents don't follow children (children are independent when dragged)
    const related = [...children];
    if (spouse) related.push(spouse);
    
    return related;
  };

  const getChildrenToFollow = useCallback((memberId: string): string[] => {
    // Recursively find all descendants that should follow
    const directChildren = findChildren(memberId);
    let allDescendants = [...directChildren];
    
    // Add grandchildren, great-grandchildren, etc.
    directChildren.forEach(childId => {
      allDescendants = [...allDescendants, ...getChildrenToFollow(childId)];
    });
    
    return allDescendants;
  }, [findChildren]);

  // Smart collision detection - check if nodes would overlap
  const detectCollisions = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    const nodeWidth = 180; // Approximate node width
    const nodeHeight = 100; // Approximate node height
    const padding = 20; // Minimum spacing between nodes
    
    const collisions: string[] = [];
    
    nodesState.forEach(node => {
      if (node.id === nodeId) return; // Skip self
      
      const distance = Math.sqrt(
        Math.pow(node.position.x - newPosition.x, 2) + 
        Math.pow(node.position.y - newPosition.y, 2)
      );
      
      // Check if nodes would overlap with padding
      if (distance < (nodeWidth + nodeHeight) / 2 + padding) {
        collisions.push(node.id);
      }
    });
    
    return collisions;
  }, [nodesState]);

  // Smart drag behavior - only move the dragged node, not related ones
  const handleSmartDrag = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    // Check for collisions
    const collisions = detectCollisions(nodeId, newPosition);
    setCollisionNodes(collisions);
    
    // Update drag preview
    setDragPreview({
      x: newPosition.x,
      y: newPosition.y,
      valid: collisions.length === 0
    });
    
    // Only move the dragged node, not related ones
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes((nds) => {
      const updated = nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            position: newPosition
          };
        }
        return n;
      });
      return restoreCallbacks(updated);
    });
  }, [detectCollisions, setNodes, restoreCallbacks]);
  
  // Update state when props change and apply persistent layout
  useEffect(() => {
    // Apply saved layout positions if available
    const nodesWithLayout = layoutService.applyLayoutToNodes(nodes);
    
    // DIAGNOSTIC: Log incoming nodes
    if (import.meta.env.DEV && nodes.length > 0) {
      const sampleNode = nodes[0] as FamilyMemberNodeType;
      console.log('📥 FamilyTreeRenderer: Received nodes prop', {
        'totalNodes': nodes.length,
        'sampleNodeId': sampleNode.id,
        'sampleNodeHasOnEdit': !!(sampleNode as any).onEdit,
        'sampleNodeHasOnViewProfile': !!(sampleNode as any).onViewProfile,
        'sampleNodeDataKeys': Object.keys(sampleNode.data || {}),
        'sampleNodeKeys': Object.keys(sampleNode)
      });
    }
    
    // Add collapse data and path highlighting to nodes
    // Preserve all node properties including callbacks (onEdit, onViewProfile, etc.)
    const nodesWithCollapseData = nodesWithLayout.map(node => {
      const nodeWithCallbacks = node as FamilyMemberNodeType;
      const hasCallbacks = !!(nodeWithCallbacks.onEdit || nodeWithCallbacks.onViewProfile || nodeWithCallbacks.onViewTimeline);
      
      if (import.meta.env.DEV && !hasCallbacks) {
        console.warn('⚠️ FamilyTreeRenderer: Node missing callbacks', node.id, {
          'nodeKeys': Object.keys(node),
          'nodeDataKeys': Object.keys(node.data || {})
        });
      }
      
      return {
        ...node, // Preserve all original node properties including onEdit, onViewProfile, etc.
        // Explicitly preserve callbacks to ensure they're passed to the component
        onEdit: nodeWithCallbacks.onEdit,
        onViewProfile: nodeWithCallbacks.onViewProfile,
        onAddRelation: nodeWithCallbacks.onAddRelation,
        onViewTimeline: nodeWithCallbacks.onViewTimeline,
        data: {
          ...node.data,
          // Pass callbacks through data as well (React Flow may not pass direct props reliably)
          onEdit: nodeWithCallbacks.onEdit,
          onViewProfile: nodeWithCallbacks.onViewProfile,
          onAddRelation: nodeWithCallbacks.onAddRelation,
          onViewTimeline: nodeWithCallbacks.onViewTimeline,
          isCollapsed: isCollapsed(node.id),
          hiddenDescendantCount: getHiddenDescendantCount(node.id),
          onToggleCollapse: () => toggleCollapse(node.id),
          isPathHighlighted: highlightedPath.includes(node.id),
          isPathStart: pathStartMember === node.id
        },
        style: {
          ...node.style,
          // Highlight nodes in the path
          border: highlightedPath.includes(node.id) 
            ? '3px solid #9333ea' 
            : pathStartMember === node.id
            ? '3px solid #3b82f6'
            : node.style?.border,
          boxShadow: highlightedPath.includes(node.id)
            ? '0 0 20px rgba(147, 51, 234, 0.5)'
            : pathStartMember === node.id
            ? '0 0 15px rgba(59, 130, 246, 0.5)'
            : node.style?.boxShadow
        }
      };
    });
    
    const visibleNodes = getVisibleNodes(nodesWithCollapseData);
    
    // CRITICAL FIX: Preserve callbacks before setting nodes
    preserveCallbacks(visibleNodes);
    
    // DIAGNOSTIC: Log nodes before setting state
    if (import.meta.env.DEV && visibleNodes.length > 0) {
      const sampleNode = visibleNodes[0] as FamilyMemberNodeType;
      console.log('📤 FamilyTreeRenderer: Setting nodes state', {
        'totalNodes': visibleNodes.length,
        'sampleNodeId': sampleNode.id,
        'sampleNodeHasOnEdit': !!(sampleNode as any).onEdit,
        'sampleNodeHasOnViewProfile': !!(sampleNode as any).onViewProfile,
        'sampleNodeDataHasOnEdit': !!(sampleNode.data as any)?.onEdit,
        'sampleNodeDataHasOnViewProfile': !!(sampleNode.data as any)?.onViewProfile
      });
    }
    
    // Restore callbacks to nodes before setting state
    const nodesWithRestoredCallbacks = restoreCallbacks(visibleNodes);
    setNodes(nodesWithRestoredCallbacks);
  }, [nodes, setNodes, getVisibleNodes, isCollapsed, getHiddenDescendantCount, highlightedPath, pathStartMember, toggleCollapse, preserveCallbacks, restoreCallbacks]);
  
  // DIAGNOSTIC: Monitor nodesState changes
  useEffect(() => {
    if (import.meta.env.DEV && nodesState.length > 0) {
      const sampleNode = nodesState[0] as FamilyMemberNodeType;
      const hasCallbacks = !!(sampleNode.onEdit || sampleNode.onViewProfile || sampleNode.onViewTimeline);
      if (!hasCallbacks) {
        console.error('❌ FamilyTreeRenderer: nodesState missing callbacks!', {
          'sampleNodeId': sampleNode.id,
          'sampleNodeKeys': Object.keys(sampleNode),
          'sampleNodeDataKeys': Object.keys(sampleNode.data || {})
        });
      }
    }
  }, [nodesState]);

  useEffect(() => {
    let visibleEdges = getVisibleEdges(edges);
    
    // Highlight edges in the path
    if (highlightedPath.length > 1) {
      visibleEdges = visibleEdges.map(edge => {
        const sourceInPath = highlightedPath.includes(edge.source);
        const targetInPath = highlightedPath.includes(edge.target);
        const isPathEdge = sourceInPath && targetInPath && 
          Math.abs(highlightedPath.indexOf(edge.source) - highlightedPath.indexOf(edge.target)) === 1;
        
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isPathEdge ? '#9333ea' : edge.style?.stroke,
            strokeWidth: isPathEdge ? 5 : edge.style?.strokeWidth,
            opacity: isPathEdge ? 1 : edge.style?.opacity
          },
          animated: isPathEdge
        };
      });
    }
    
    setEdges(visibleEdges);
  }, [edges, setEdges, getVisibleEdges, highlightedPath]);

  // Save layout when nodes change (debounced) - increased debounce for better performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (nodesState.length > 0) {
        layoutService.saveLayout(nodesState);
      }
    }, 2000); // Save after 2 seconds of inactivity for better performance

    return () => clearTimeout(timeoutId);
  }, [nodesState]);
  
  // Zoom and layout functions
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);
  
  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);
  
  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    // Fit view after expanding/collapsing
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }
    }, 100);
  }, [reactFlowInstance]);
  
  const handleHierarchyLayout = useCallback(() => {
    if (!reactFlowInstance || !familyMembers.length) return;
    
    // Create a proper pyramid hierarchy with oldest members at top
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));
    
    // Find all members who have no parents (oldest generation)
    const findOldestGeneration = () => {
      const oldestMembers = familyMembers.filter(member => {
        // Check if this member has any parent relationships
        const hasParents = familyMembers.some(otherMember => 
          otherMember.relations?.some(rel => 
            rel.type === 'parent' && rel.personId === member.id
          )
        );
        return !hasParents;
      });
      
      // If no clear oldest generation, use birth year to find oldest
      if (oldestMembers.length === 0 || oldestMembers.length === familyMembers.length) {
        return familyMembers.sort((a, b) => {
          const yearA = a.birthDate ? new Date(a.birthDate).getFullYear() : 1900;
          const yearB = b.birthDate ? new Date(b.birthDate).getFullYear() : 1900;
          return yearA - yearB;
        }).slice(0, Math.max(1, Math.floor(familyMembers.length / 3)));
      }
      
      return oldestMembers;
    };
    
    const oldestGeneration = findOldestGeneration();
    console.log('Oldest generation found:', oldestGeneration);
    
    // Build generation levels using a proper hierarchy algorithm
    const memberGenerations = new Map<string, number>();
    const generations = new Map<number, string[]>();
    const processed = new Set<string>();
    
    // Start with oldest generation at level 0 (top of pyramid)
    oldestGeneration.forEach(member => {
      memberGenerations.set(member.id, 0);
      if (!generations.has(0)) generations.set(0, []);
      generations.get(0)!.push(member.id);
    });
    
    // Recursively build generations going down
    const buildGenerationsDown = (memberId: string, currentLevel: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find children (members who have this member as parent)
      const children = familyMembers.filter(child => 
        child.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === memberId
        )
      );
      
      children.forEach(child => {
        const childLevel = currentLevel + 1;
        memberGenerations.set(child.id, childLevel);
        if (!generations.has(childLevel)) generations.set(childLevel, []);
        if (!generations.get(childLevel)!.includes(child.id)) {
          generations.get(childLevel)!.push(child.id);
        }
        buildGenerationsDown(child.id, childLevel);
      });
      
      // Find spouses (same generation level)
      const spouses = familyMembers.filter(spouse => 
        spouse.relations?.some(rel => 
          rel.type === 'spouse' && rel.personId === memberId
        )
      );
      
      spouses.forEach(spouse => {
        if (!memberGenerations.has(spouse.id)) {
          memberGenerations.set(spouse.id, currentLevel);
          if (!generations.has(currentLevel)) generations.set(currentLevel, []);
          if (!generations.get(currentLevel)!.includes(spouse.id)) {
            generations.get(currentLevel)!.push(spouse.id);
          }
          buildGenerationsDown(spouse.id, currentLevel);
        }
      });
    };
    
    // Build all generations starting from oldest
    oldestGeneration.forEach(member => {
      buildGenerationsDown(member.id, 0);
    });
    
    console.log('Generated hierarchy:', { 
      generations: Array.from(generations.entries()).map(([level, members]) => ({
        level,
        members: members.map(id => {
          const member = memberMap.get(id);
          return `${member?.firstName} ${member?.lastName} (${member?.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'})`;
        })
      })),
      memberGenerations: Array.from(memberGenerations.entries()).map(([id, level]) => {
        const member = memberMap.get(id);
        return `${member?.firstName} ${member?.lastName}: Level ${level}`;
      })
    });
    
    // Create position map for each generation
    const memberPositions = new Map<string, number>();
    generations.forEach((memberIds, generation) => {
      // Sort members within generation by birth year (oldest first)
      const sortedMembers = memberIds.sort((a, b) => {
        const memberA = memberMap.get(a);
        const memberB = memberMap.get(b);
        const yearA = memberA?.birthDate ? new Date(memberA.birthDate).getFullYear() : 1900;
        const yearB = memberB?.birthDate ? new Date(memberB.birthDate).getFullYear() : 1900;
        return yearA - yearB;
      });
      
      sortedMembers.forEach((memberId, index) => {
        memberPositions.set(memberId, index);
      });
    });
    
    // Update node positions based on hierarchy
    const updatedNodes = nodesState.map(node => {
      const generation = memberGenerations.get(node.id);
      const positionInGeneration = memberPositions.get(node.id) || 0;
      
      if (generation === undefined) {
        // If member not in hierarchy, put them at the bottom
        const maxGeneration = Math.max(...Array.from(generations.keys()));
        const bottomGeneration = maxGeneration + 1;
        memberGenerations.set(node.id, bottomGeneration);
        if (!generations.has(bottomGeneration)) generations.set(bottomGeneration, []);
        generations.get(bottomGeneration)!.push(node.id);
        memberPositions.set(node.id, 0);
        
        return {
          ...node,
          position: {
            x: 0,
            y: bottomGeneration * 200
          }
        };
      }
      
      // Calculate position with proper spacing
      const generationSize = generations.get(generation)?.length || 1;
      const centerOffset = (generationSize - 1) * 300 / 2;
      
      return {
        ...node,
        position: {
          x: (positionInGeneration * 300) - centerOffset,
          y: generation * 200
        }
      };
    });
    
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes(restoreCallbacks(updatedNodes));
    
    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance, nodesState, familyMembers, setNodes, restoreCallbacks]);
  
  const handleGenealogicalLayout = useCallback(() => {
    if (!reactFlowInstance || !familyMembers.length) return;
    
    // Create a traditional genealogical tree layout
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));
    
    // Find the root person (current user or first person)
    const rootPerson = familyMembers.find(member => member.id === nodesState[0]?.data?.id) || familyMembers[0];
    if (!rootPerson) return;
    
    // Build generations using a traditional genealogical approach
    const generations = new Map<number, string[]>();
    const memberGenerations = new Map<string, number>();
    const processed = new Set<string>();
    
    // Start with root person at generation 0
    memberGenerations.set(rootPerson.id, 0);
    if (!generations.has(0)) generations.set(0, []);
    generations.get(0)!.push(rootPerson.id);
    
    // Build ancestors going up (negative generations)
    const buildAncestors = (memberId: string, currentGen: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find parents
      const parents = familyMembers.filter(parent => 
        member.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === parent.id
        )
      );
      
      parents.forEach(parent => {
        const parentGen = currentGen - 1;
        memberGenerations.set(parent.id, parentGen);
        if (!generations.has(parentGen)) generations.set(parentGen, []);
        if (!generations.get(parentGen)!.includes(parent.id)) {
          generations.get(parentGen)!.push(parent.id);
        }
        buildAncestors(parent.id, parentGen);
      });
    };
    
    // Build descendants going down (positive generations)
    const buildDescendants = (memberId: string, currentGen: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find children
      const children = familyMembers.filter(child => 
        child.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === memberId
        )
      );
      
      children.forEach(child => {
        const childGen = currentGen + 1;
        memberGenerations.set(child.id, childGen);
        if (!generations.has(childGen)) generations.set(childGen, []);
        if (!generations.get(childGen)!.includes(child.id)) {
          generations.get(childGen)!.push(child.id);
        }
        buildDescendants(child.id, childGen);
      });
    };
    
    // Build the complete tree
    buildAncestors(rootPerson.id, 0);
    buildDescendants(rootPerson.id, 0);
    
    console.log('Genealogical tree generations:', { 
      generations: Array.from(generations.entries()).map(([level, members]) => ({
        level,
        members: members.map(id => {
          const member = memberMap.get(id);
          return `${member?.firstName} ${member?.lastName} (${member?.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'})`;
        })
      }))
    });
    
    // Create position map for each generation
    const memberPositions = new Map<string, number>();
    const maxGeneration = Math.max(...Array.from(generations.keys()));
    const minGeneration = Math.min(...Array.from(generations.keys()));
    
    generations.forEach((memberIds, generation) => {
      // Sort members within generation by birth year
      const sortedMembers = memberIds.sort((a, b) => {
        const memberA = memberMap.get(a);
        const memberB = memberMap.get(b);
        const yearA = memberA?.birthDate ? new Date(memberA.birthDate).getFullYear() : 1900;
        const yearB = memberB?.birthDate ? new Date(memberB.birthDate).getFullYear() : 1900;
        return yearA - yearB;
      });
      
      sortedMembers.forEach((memberId, index) => {
        memberPositions.set(memberId, index);
      });
    });
    
    // Update node positions based on genealogical layout
    const updatedNodes = nodesState.map(node => {
      const generation = memberGenerations.get(node.id);
      const positionInGeneration = memberPositions.get(node.id) || 0;
      
      if (generation === undefined) {
        // If member not in hierarchy, put them at the bottom
        const bottomGeneration = maxGeneration + 1;
        return {
          ...node,
          position: {
            x: 0,
            y: treeOrientation === 'top-down' ? bottomGeneration * 200 : -bottomGeneration * 200
          }
        };
      }
      
      // Calculate position with proper spacing
      const generationSize = generations.get(generation)?.length || 1;
      const centerOffset = (generationSize - 1) * 300 / 2;
      
      // Determine Y position based on orientation
      let yPosition;
      if (treeOrientation === 'top-down') {
        // Top-down: ancestors at top (negative generations), descendants at bottom
        yPosition = (generation - minGeneration) * 200;
      } else {
        // Bottom-up: ancestors at bottom (negative generations), descendants at top
        yPosition = (maxGeneration - generation) * 200;
      }
      
      return {
        ...node,
        position: {
          x: (positionInGeneration * 300) - centerOffset,
          y: yPosition
        }
      };
    });
    
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes(restoreCallbacks(updatedNodes));
    
    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance, nodesState, familyMembers, setNodes, treeOrientation, restoreCallbacks]);

  const handleToggleOrientation = useCallback(() => {
    setTreeOrientation(prev => prev === 'top-down' ? 'bottom-up' : 'top-down');
    // Re-apply the current layout with new orientation
    setTimeout(() => {
      handleGenealogicalLayout();
    }, 100);
  }, [handleGenealogicalLayout]);

  const handleStandardPedigreeLayout = useCallback(() => {
    if (!reactFlowInstance || !familyMembers.length) return;
    
    // Standard Pedigree: Individual + direct line of ancestors only
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));
    
    // Find the root person (current user or selected person)
    const rootPerson = familyMembers.find(member => member.id === nodesState[0]?.data?.id) || familyMembers[0];
    if (!rootPerson) return;
    
    const generations = new Map<number, string[]>();
    const memberGenerations = new Map<string, number>();
    const processed = new Set<string>();
    
    // Start with root person at generation 0
    memberGenerations.set(rootPerson.id, 0);
    if (!generations.has(0)) generations.set(0, []);
    generations.get(0)!.push(rootPerson.id);
    
    // Build ancestors only (no descendants)
    const buildAncestors = (memberId: string, currentGen: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find parents
      const parents = familyMembers.filter(parent => 
        member.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === parent.id
        )
      );
      
      parents.forEach(parent => {
        const parentGen = currentGen - 1;
        memberGenerations.set(parent.id, parentGen);
        if (!generations.has(parentGen)) generations.set(parentGen, []);
        if (!generations.get(parentGen)!.includes(parent.id)) {
          generations.get(parentGen)!.push(parent.id);
        }
        buildAncestors(parent.id, parentGen);
      });
    };
    
    // Build ancestors from root person
    buildAncestors(rootPerson.id, 0);
    
    console.log('Standard Pedigree generations:', { 
      generations: Array.from(generations.entries()).map(([level, members]) => ({
        level,
        members: members.map(id => {
          const member = memberMap.get(id);
          return `${member?.firstName} ${member?.lastName} (${member?.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'})`;
        })
      }))
    });
    
    // Create position map for each generation
    const memberPositions = new Map<string, number>();
    const minGeneration = Math.min(...Array.from(generations.keys()));
    
    generations.forEach((memberIds, generation) => {
      // Sort members within generation by birth year
      const sortedMembers = memberIds.sort((a, b) => {
        const memberA = memberMap.get(a);
        const memberB = memberMap.get(b);
        const yearA = memberA?.birthDate ? new Date(memberA.birthDate).getFullYear() : 1900;
        const yearB = memberB?.birthDate ? new Date(memberB.birthDate).getFullYear() : 1900;
        return yearA - yearB;
      });
      
      sortedMembers.forEach((memberId, index) => {
        memberPositions.set(memberId, index);
      });
    });
    
    // Update node positions - Standard Pedigree flows left to right
    const updatedNodes = nodesState.map(node => {
      const generation = memberGenerations.get(node.id);
      const positionInGeneration = memberPositions.get(node.id) || 0;
      
      if (generation === undefined) return node;
      
      // Calculate position with proper spacing (horizontal flow)
      const generationSize = generations.get(generation)?.length || 1;
      const centerOffset = (generationSize - 1) * 200 / 2;
      
      return {
        ...node,
        position: {
          x: (generation - minGeneration) * 400, // Horizontal spacing between generations
          y: (positionInGeneration * 200) - centerOffset
        }
      };
    });
    
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes(restoreCallbacks(updatedNodes));
    
    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance, nodesState, familyMembers, setNodes, restoreCallbacks]);
  
  const handleCombinationPedigreeLayout = useCallback(() => {
    if (!reactFlowInstance || !familyMembers.length) return;
    
    // Combination Pedigree: Couple + ancestors + descendants
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));
    
    // Find the root couple (current user and spouse, or first two people)
    const rootPerson = familyMembers.find(member => member.id === nodesState[0]?.data?.id) || familyMembers[0];
    if (!rootPerson) return;
    
    // Find spouse of root person
    const spouse = familyMembers.find(member => 
      member.relations?.some(rel => 
        rel.type === 'spouse' && rel.personId === rootPerson.id
      )
    );
    
    const generations = new Map<number, string[]>();
    const memberGenerations = new Map<string, number>();
    const processed = new Set<string>();
    
    // Start with root couple at generation 0
    memberGenerations.set(rootPerson.id, 0);
    if (!generations.has(0)) generations.set(0, []);
    generations.get(0)!.push(rootPerson.id);
    
    if (spouse) {
      memberGenerations.set(spouse.id, 0);
      if (!generations.get(0)!.includes(spouse.id)) {
        generations.get(0)!.push(spouse.id);
      }
    }
    
    // Build ancestors going up
    const buildAncestors = (memberId: string, currentGen: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find parents
      const parents = familyMembers.filter(parent => 
        member.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === parent.id
        )
      );
      
      parents.forEach(parent => {
        const parentGen = currentGen - 1;
        memberGenerations.set(parent.id, parentGen);
        if (!generations.has(parentGen)) generations.set(parentGen, []);
        if (!generations.get(parentGen)!.includes(parent.id)) {
          generations.get(parentGen)!.push(parent.id);
        }
        buildAncestors(parent.id, parentGen);
      });
    };
    
    // Build descendants going down
    const buildDescendants = (memberId: string, currentGen: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find children
      const children = familyMembers.filter(child => 
        child.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === memberId
        )
      );
      
      children.forEach(child => {
        const childGen = currentGen + 1;
        memberGenerations.set(child.id, childGen);
        if (!generations.has(childGen)) generations.set(childGen, []);
        if (!generations.get(childGen)!.includes(child.id)) {
          generations.get(childGen)!.push(child.id);
        }
        buildDescendants(child.id, childGen);
      });
    };
    
    // Build ancestors and descendants from root couple
    buildAncestors(rootPerson.id, 0);
    if (spouse) buildAncestors(spouse.id, 0);
    buildDescendants(rootPerson.id, 0);
    if (spouse) buildDescendants(spouse.id, 0);
    
    console.log('Combination Pedigree generations:', { 
      generations: Array.from(generations.entries()).map(([level, members]) => ({
        level,
        members: members.map(id => {
          const member = memberMap.get(id);
          return `${member?.firstName} ${member?.lastName} (${member?.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'})`;
        })
      }))
    });
    
    // Create position map for each generation
    const memberPositions = new Map<string, number>();
    const maxGeneration = Math.max(...Array.from(generations.keys()));
    const minGeneration = Math.min(...Array.from(generations.keys()));
    
    generations.forEach((memberIds, generation) => {
      // Sort members within generation by birth year
      const sortedMembers = memberIds.sort((a, b) => {
        const memberA = memberMap.get(a);
        const memberB = memberMap.get(b);
        const yearA = memberA?.birthDate ? new Date(memberA.birthDate).getFullYear() : 1900;
        const yearB = memberB?.birthDate ? new Date(memberB.birthDate).getFullYear() : 1900;
        return yearA - yearB;
      });
      
      sortedMembers.forEach((memberId, index) => {
        memberPositions.set(memberId, index);
      });
    });
    
    // Update node positions - Combination Pedigree flows vertically
    const updatedNodes = nodesState.map(node => {
      const generation = memberGenerations.get(node.id);
      const positionInGeneration = memberPositions.get(node.id) || 0;
      
      if (generation === undefined) return node;
      
      // Calculate position with proper spacing
      const generationSize = generations.get(generation)?.length || 1;
      const centerOffset = (generationSize - 1) * 300 / 2;
      
      return {
        ...node,
        position: {
          x: (positionInGeneration * 300) - centerOffset,
          y: (generation - minGeneration) * 200
        }
      };
    });
    
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes(restoreCallbacks(updatedNodes));
    
    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance, nodesState, familyMembers, setNodes, restoreCallbacks]);
  
  const handleDescendantChartLayout = useCallback(() => {
    if (!reactFlowInstance || !familyMembers.length) return;
    
    // Descendant Chart: Individual/couple + descendants only
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));
    
    // Find the root person/couple (current user and spouse, or first person)
    const rootPerson = familyMembers.find(member => member.id === nodesState[0]?.data?.id) || familyMembers[0];
    if (!rootPerson) return;
    
    // Find spouse of root person
    const spouse = familyMembers.find(member => 
      member.relations?.some(rel => 
        rel.type === 'spouse' && rel.personId === rootPerson.id
      )
    );
    
    const generations = new Map<number, string[]>();
    const memberGenerations = new Map<string, number>();
    const processed = new Set<string>();
    
    // Start with root person/couple at generation 0
    memberGenerations.set(rootPerson.id, 0);
    if (!generations.has(0)) generations.set(0, []);
    generations.get(0)!.push(rootPerson.id);
    
    if (spouse) {
      memberGenerations.set(spouse.id, 0);
      if (!generations.get(0)!.includes(spouse.id)) {
        generations.get(0)!.push(spouse.id);
      }
    }
    
    // Build descendants only (no ancestors)
    const buildDescendants = (memberId: string, currentGen: number) => {
      if (processed.has(memberId)) return;
      processed.add(memberId);
      
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Find children
      const children = familyMembers.filter(child => 
        child.relations?.some(rel => 
          rel.type === 'parent' && rel.personId === memberId
        )
      );
      
      children.forEach(child => {
        const childGen = currentGen + 1;
        memberGenerations.set(child.id, childGen);
        if (!generations.has(childGen)) generations.set(childGen, []);
        if (!generations.get(childGen)!.includes(child.id)) {
          generations.get(childGen)!.push(child.id);
        }
        buildDescendants(child.id, childGen);
      });
    };
    
    // Build descendants from root person/couple
    buildDescendants(rootPerson.id, 0);
    if (spouse) buildDescendants(spouse.id, 0);
    
    console.log('Descendant Chart generations:', { 
      generations: Array.from(generations.entries()).map(([level, members]) => ({
        level,
        members: members.map(id => {
          const member = memberMap.get(id);
          return `${member?.firstName} ${member?.lastName} (${member?.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'})`;
        })
      }))
    });
    
    // Create position map for each generation
    const memberPositions = new Map<string, number>();
    
    generations.forEach((memberIds, generation) => {
      // Sort members within generation by birth year
      const sortedMembers = memberIds.sort((a, b) => {
        const memberA = memberMap.get(a);
        const memberB = memberMap.get(b);
        const yearA = memberA?.birthDate ? new Date(memberA.birthDate).getFullYear() : 1900;
        const yearB = memberB?.birthDate ? new Date(memberB.birthDate).getFullYear() : 1900;
        return yearA - yearB;
      });
      
      sortedMembers.forEach((memberId, index) => {
        memberPositions.set(memberId, index);
      });
    });
    
    // Update node positions - Descendant Chart flows top to bottom
    const updatedNodes = nodesState.map(node => {
      const generation = memberGenerations.get(node.id);
      const positionInGeneration = memberPositions.get(node.id) || 0;
      
      if (generation === undefined) return node;
      
      // Calculate position with proper spacing
      const generationSize = generations.get(generation)?.length || 1;
      const centerOffset = (generationSize - 1) * 300 / 2;
      
      return {
        ...node,
        position: {
          x: (positionInGeneration * 300) - centerOffset,
          y: generation * 200
        }
      };
    });
    
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes(restoreCallbacks(updatedNodes));
    
    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance, nodesState, familyMembers, setNodes, restoreCallbacks]);
  
  const handleInit = useCallback((instance: ReactFlowInstance) => {
    console.log('ReactFlow initialized:', {
      viewport: instance.getViewport(),
      nodes: nodes.length,
      edges: edges.length
    });
    
    setReactFlowInstance(instance);
    if (onInit) {
      onInit(instance);
    }
    
    // Ensure proper initial view
    setTimeout(() => {
      if (nodes.length > 0) {
        instance.fitView({ padding: 0.2, duration: 800 });
      }
    }, 100);
  }, [onInit, nodes.length, edges.length]);

  // Smart layout reorganization - intelligently arrange nodes after drag operations
  const handleSmartLayout = useCallback(() => {
    console.log('Applying Smart Layout...');
    
    if (!familyMembers || familyMembers.length === 0) {
      console.warn('No family members available for smart layout');
      return;
    }
    
    // Find the root member
    const rootMember = familyMembers.find(member => 
      member.relations.every(rel => rel.type !== 'parent')
    );
    
    if (!rootMember) {
      console.warn('No root member found for smart layout');
      return;
    }
    
    // Create a map of all members for quick lookup
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));
    
    // Calculate smart positions with collision avoidance
    const positions = new Map<string, { x: number; y: number }>();
    const visited = new Set<string>();
    const occupiedPositions = new Set<string>();
    
    const horizontalSpacing = 220;
    const verticalSpacing = 180;
    
    // Helper function to find the nearest available position
    const findAvailablePosition = (preferredX: number, preferredY: number): { x: number; y: number } => {
      let x = preferredX;
      let y = preferredY;
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        const key = `${Math.round(x)},${Math.round(y)}`;
        if (!occupiedPositions.has(key)) {
          occupiedPositions.add(key);
          return { x, y };
        }
        
        // Try positions in a spiral pattern
        const angle = (attempts * 0.5) % (2 * Math.PI);
        const radius = Math.floor(attempts / 8) * horizontalSpacing * 0.3;
        x = preferredX + Math.cos(angle) * radius;
        y = preferredY + Math.sin(angle) * radius;
        attempts++;
      }
      
      // Fallback to preferred position if no space found
      return { x: preferredX, y: preferredY };
    };
    
    // Start from root and spread out intelligently
    const queue: { memberId: string; x: number; y: number; level: number }[] = [
      { memberId: rootMember.id, x: 0, y: 0, level: 0 }
    ];
    
    while (queue.length > 0) {
      const { memberId, x, y, level } = queue.shift()!;
      
      if (visited.has(memberId)) continue;
      visited.add(memberId);
      
      // Find available position
      const position = findAvailablePosition(x, y);
      positions.set(memberId, position);
      
      const member = memberMap.get(memberId);
      if (!member) continue;
      
      // Find all children
      const children = member.relations
        .filter(rel => rel.type === 'child')
        .map(rel => rel.personId);
      
      // Position children below the current member with smart spacing
      children.forEach((childId, index) => {
        if (!visited.has(childId)) {
          const childX = position.x + (index - children.length / 2) * horizontalSpacing;
          const childY = position.y + verticalSpacing;
          
          queue.push({
            memberId: childId,
            x: childX,
            y: childY,
            level: level + 1
          });
        }
      });
      
      // Find spouse and position next to current member
      const spouseRelation = member.relations.find(rel => rel.type === 'spouse');
      if (spouseRelation && !visited.has(spouseRelation.personId)) {
        const spouseX = position.x + horizontalSpacing * 0.8;
        const spouseY = position.y;
        
        queue.push({
          memberId: spouseRelation.personId,
          x: spouseX,
          y: spouseY,
          level: level
        });
      }
    }
    
    // Apply positions to nodes with smooth animation
    // CRITICAL FIX: Preserve callbacks when updating nodes
    setNodes((nds) => {
      const updated = nds.map((node) => {
        const position = positions.get(node.id);
        if (position) {
          return {
            ...node,
            position,
            style: {
              ...node.style,
              transition: 'all 0.5s ease-in-out'
            }
          };
        }
        return node;
      });
      return restoreCallbacks(updated);
    });
    
    // Fit view to show all nodes
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 600);
  }, [familyMembers, setNodes, reactFlowInstance, restoreCallbacks]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.id, node.data);
    
    // If Ctrl/Cmd is pressed, let React Flow handle multi-select
    // Don't interfere with relationship finder or other click handlers
    if (event.ctrlKey || event.metaKey) {
      console.log('Multi-select click detected, letting React Flow handle selection');
      return;
    }
    
    // Check if the click target is a button or interactive element
    // If so, don't process as relationship finder click - let the button handle it
    const target = event.target as HTMLElement;
    const isButtonClick = target.closest('button') !== null || 
                         target.closest('[role="button"]') !== null ||
                         target.tagName === 'BUTTON' ||
                         target.closest('a') !== null;
    
    if (isButtonClick) {
      // Let the button handle its own click - don't interfere with relationship finder
      console.log('Button click detected, skipping relationship finder logic');
      return;
    }
    
    // Handle relationship path finding
    if (pathStartMember === 'waiting') {
      // First member selected
      setPathStartMember(node.id);
      toast.info('Now click on the second member to find the relationship');
    } else if (pathStartMember && pathStartMember !== node.id) {
      // Second member selected - find path
      const pathResult = findPath(pathStartMember, node.id);
      if (pathResult) {
        setHighlightedPath(pathResult.path);
        toast.success(`Relationship: ${pathResult.relationshipDescription}`);
      } else {
        toast.error('No relationship path found between these members');
      }
      setPathStartMember(null);
    } else {
      // Normal click
      onNodeClick(node as FamilyMemberNodeType);
    }
  }, [onNodeClick, pathStartMember, findPath]);

  // Box selection mouse handlers
  const boxSelectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const isBoxSelectingRef = useRef(false);
  
  // Handle mouse down on container - start box selection
  const handleContainerMouseDown = useCallback((event: React.MouseEvent) => {
    // Only start box selection if clicking on container (not on a node) and not holding Ctrl/Cmd
    if (event.button !== 0) return; // Only left mouse button
    if (event.ctrlKey || event.metaKey) return; // Don't interfere with Ctrl+Click
    
    // Check if clicking on a node (event target should not be a node)
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node')) return; // Don't start box selection if clicking on node
    
    if (!reactFlowInstance) return;
    
    const point = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    boxSelectionStartRef.current = { x: point.x, y: point.y };
    isBoxSelectingRef.current = true;
    
    setBoxSelection({
      startX: point.x,
      startY: point.y,
      endX: point.x,
      endY: point.y,
      isActive: true,
      startScreenX: event.clientX,
      startScreenY: event.clientY,
      endScreenX: event.clientX,
      endScreenY: event.clientY,
    });
  }, [reactFlowInstance]);
  
  // Handle mouse move - update box selection
  const handleContainerMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isBoxSelectingRef.current || !boxSelectionStartRef.current || !reactFlowInstance) {
      // Also check existing boxSelection state
      if (!boxSelection?.isActive) return;
    }
    
    const point = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    setBoxSelection(prev => {
      if (!prev) return null;
      return {
        ...prev,
        endX: point.x,
        endY: point.y,
        endScreenX: event.clientX,
        endScreenY: event.clientY,
      };
    });
  }, [reactFlowInstance, boxSelection]);
  
  // Handle mouse up - finalize box selection
  const finalizeBoxSelection = useCallback(() => {
    if (!isBoxSelectingRef.current || !boxSelection || !boxSelection.isActive || !reactFlowInstance) {
      isBoxSelectingRef.current = false;
      boxSelectionStartRef.current = null;
      setBoxSelection(null);
      return;
    }
    
    // Calculate selection box bounds
    const minX = Math.min(boxSelection.startX, boxSelection.endX);
    const maxX = Math.max(boxSelection.startX, boxSelection.endX);
    const minY = Math.min(boxSelection.startY, boxSelection.endY);
    const maxY = Math.max(boxSelection.startY, boxSelection.endY);
    
    // Find nodes within the selection box
    const selectedNodeIds = nodesState
      .filter(node => {
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        // Approximate node size (180px width, 100px height)
        // Convert to flow coordinates (account for zoom)
        const zoom = reactFlowInstance.getZoom();
        const nodeWidth = 180 / zoom;
        const nodeHeight = 100 / zoom;
        
        // Check if node intersects with selection box
        return (
          nodeX + nodeWidth / 2 >= minX &&
          nodeX - nodeWidth / 2 <= maxX &&
          nodeY + nodeHeight / 2 >= minY &&
          nodeY - nodeHeight / 2 <= maxY
        );
      })
      .map(node => node.id);
    
    // Update node selection
    if (selectedNodeIds.length > 0) {
      setNodes((nds) => {
        const updated = nds.map((n) => ({
          ...n,
          selected: selectedNodeIds.includes(n.id),
        }));
        return restoreCallbacks(updated);
      });
    } else {
      // If no nodes selected, deselect all
      setNodes((nds) => {
        const updated = nds.map((n) => ({
          ...n,
          selected: false,
        }));
        return restoreCallbacks(updated);
      });
    }
    
    // Clear box selection
    setBoxSelection(null);
    isBoxSelectingRef.current = false;
    boxSelectionStartRef.current = null;
  }, [boxSelection, reactFlowInstance, nodesState, setNodes, restoreCallbacks]);
  
  const handleContainerMouseUp = useCallback(() => {
    finalizeBoxSelection();
  }, [finalizeBoxSelection]);
  
  // Global mouse up handler to catch mouse release outside container
  useEffect(() => {
    if (isBoxSelectingRef.current) {
      const handleGlobalMouseUp = () => {
        finalizeBoxSelection();
      };
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isBoxSelectingRef.current, finalizeBoxSelection]);
  
  const handlePaneClick = useCallback(() => {
    // Deselect when clicking on empty space (if not box selecting)
    if (!boxSelection || !boxSelection.isActive) {
      setNodes((nds) => {
        const updated = nds.map((n) => ({
          ...n,
          selected: false,
        }));
        return restoreCallbacks(updated);
      });
    }
  }, [boxSelection, setNodes, restoreCallbacks]);
  
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node double-clicked:', node);
    // Toggle collapse on double-click
    toggleCollapse(node.id);
  }, [toggleCollapse]);
  
  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    console.log('Edge double-clicked for editing:', edge);
    // Extract relationship ID from edge data or ID
    const relationshipId = edge.id.replace('e-', '').replace('-', '-');
    setEditingRelationshipId(relationshipId);
    setIsRelationshipDialogOpen(true);
  }, []);

  // Handle relationship dialog close
  const handleRelationshipDialogClose = useCallback(() => {
    setIsRelationshipDialogOpen(false);
    setEditingRelationshipId(null);
  }, []);

  // Handle relationship update
  const handleRelationshipUpdated = useCallback(() => {
    // Trigger a refresh of the family tree data
    // This will be handled by the parent component
    console.log('Relationship updated, refreshing tree...');
  }, []);

  // Handle drag start - identify the dragged node and track all selected nodes
  const handleNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
    const nodeId = node.id;
    setDraggedNodeId(nodeId);
    
    // Calculate initial offset for the dragged node
    const nodePosition = node.position;
    setDragOffset({ x: nodePosition.x, y: nodePosition.y });
    
    // Get all currently selected nodes (including the one being dragged)
    const selectedNodes = nodesState.filter(n => n.selected);
    
    // Store initial positions of all selected nodes for multi-drag
    const initialPositions = new Map<string, { x: number; y: number }>();
    selectedNodes.forEach(selectedNode => {
      initialPositions.set(selectedNode.id, {
        x: selectedNode.position.x,
        y: selectedNode.position.y
      });
    });
    setSelectedNodesInitialPositions(initialPositions);
    
    console.log('Drag started for node:', nodeId, 'with', selectedNodes.length, 'selected nodes');
  }, [nodesState]);

  // Handle drag - move all selected nodes together with collision detection
  const handleNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    if (!draggedNodeId || selectedNodesInitialPositions.size === 0) return;
    
    const nodeId = node.id;
    const newPosition = node.position;
    
    // Get the initial position of the dragged node
    const draggedNodeInitialPos = selectedNodesInitialPositions.get(nodeId);
    if (!draggedNodeInitialPos) {
      // Fallback to single node drag if initial position not found
      handleSmartDrag(nodeId, newPosition);
      return;
    }
    
    // Calculate the delta (how much the dragged node has moved)
    const deltaX = newPosition.x - draggedNodeInitialPos.x;
    const deltaY = newPosition.y - draggedNodeInitialPos.y;
    
    // Get all selected nodes
    const selectedNodes = nodesState.filter(n => n.selected || n.id === nodeId);
    
    // Calculate new positions for all selected nodes and check for collisions
    const updatedNodes = nodesState.map((n) => {
      // Check if this node is selected
      const isSelected = selectedNodes.some(sn => sn.id === n.id);
      if (!isSelected) return n;
      
      // Get initial position for this node
      const initialPos = selectedNodesInitialPositions.get(n.id);
      if (!initialPos) return n;
      
      // Calculate new position by applying the same delta
      const updatedPosition = {
        x: initialPos.x + deltaX,
        y: initialPos.y + deltaY
      };
      
      return {
        ...n,
        position: updatedPosition
      };
    });
    
    // Check for collisions with all nodes (including non-selected ones)
    // We need to check collisions against the updated positions
    const allCollisions: string[] = [];
    updatedNodes.forEach((n) => {
      const isSelected = selectedNodes.some(sn => sn.id === n.id);
      if (isSelected) {
        // Check if this selected node collides with any other node
        // We check against updatedNodes to account for all selected nodes' new positions
        const nodeWidth = 180;
        const nodeHeight = 100;
        const padding = 20;
        
        updatedNodes.forEach(otherNode => {
          if (otherNode.id === n.id) return; // Skip self
          
          // Only check collisions with non-selected nodes
          const isOtherNodeSelected = selectedNodes.some(sn => sn.id === otherNode.id);
          if (isOtherNodeSelected) return; // Skip other selected nodes (they move together)
          
          const distance = Math.sqrt(
            Math.pow(otherNode.position.x - n.position.x, 2) + 
            Math.pow(otherNode.position.y - n.position.y, 2)
          );
          
          if (distance < (nodeWidth + nodeHeight) / 2 + padding) {
            allCollisions.push(otherNode.id);
          }
        });
      }
    });
    
    // Update collision state
    setCollisionNodes(Array.from(new Set(allCollisions)));
    
    // CRITICAL FIX: Preserve callbacks when updating nodes during multi-drag
    setNodes(restoreCallbacks(updatedNodes));
    
    // Update drag preview for the primary dragged node
    setDragPreview({
      x: newPosition.x,
      y: newPosition.y,
      valid: allCollisions.length === 0
    });
  }, [draggedNodeId, selectedNodesInitialPositions, nodesState, setNodes, detectCollisions]);

  // Handle drag end - cleanup and validate final position for all selected nodes
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Drag ended for node:', node.id);
    
    // Get all selected nodes
    const selectedNodes = nodesState.filter(n => n.selected || n.id === node.id);
    
    // If there were collisions, snap all selected nodes back to original positions
    if (collisionNodes.length > 0 && selectedNodesInitialPositions.size > 0) {
      // CRITICAL FIX: Preserve callbacks when updating nodes
      setNodes((nds) => {
        const updated = nds.map((n) => {
          const isSelected = selectedNodes.some(sn => sn.id === n.id);
          if (!isSelected) return n;
          
          const initialPos = selectedNodesInitialPositions.get(n.id);
          if (initialPos) {
            return {
              ...n,
              position: initialPos
            };
          }
          return n;
        });
        return restoreCallbacks(updated);
      });
    }
    
    // Cleanup
    setDraggedNodeId(null);
    setDragOffset(null);
    setDragPreview(null);
    setCollisionNodes([]);
    setSelectedNodesInitialPositions(new Map());
  }, [collisionNodes, selectedNodesInitialPositions, nodesState, setNodes]);
  
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    console.log('Node right-clicked for context menu:', node);
    // TODO: Show context menu with edit/delete options
  }, []);
  
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    console.log('Edge right-clicked for context menu:', edge);
    // TODO: Show context menu with edit/delete options
  }, []);

  // Drag-to-connect handlers
  const handleConnectStart = useCallback((event: MouseEvent | TouchEvent, { nodeId, handleId, handleType }: { nodeId: string, handleId: string, handleType: 'source' | 'target' }) => {
    console.log('Connection started:', { nodeId, handleId, handleType });
    setIsConnecting(true);
    setConnectionStart({ nodeId, handleId, handleType });
  }, []);

  const handleConnect = useCallback(async (connection: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => {
    console.log('Connection made:', connection);
    
    if (!connectionStart) return;
    
    // Determine relationship type based on handle types
    let relationshipType: 'parent' | 'child' | 'spouse' | 'sibling' = 'parent';
    
    // Get the source and target node data
    const sourceNode = (nodesState as FamilyMemberNodeType[]).find(n => n.id === connection.source);
    const targetNode = (nodesState as FamilyMemberNodeType[]).find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return;
    
    // Check if relationship already exists between these two members
    const sourceRelations = sourceNode.data?.relations || [];
    const targetRelations = targetNode.data?.relations || [];
    
    // Check if source already has a relationship with target
    const existingSourceRelation = sourceRelations.find(rel => rel.personId === connection.target);
    // Check if target already has a relationship with source
    const existingTargetRelation = targetRelations.find(rel => rel.personId === connection.source);
    
    if (existingSourceRelation || existingTargetRelation) {
      console.log('❌ Relationship already exists between these members:', {
        from: sourceNode.data?.firstName + ' ' + sourceNode.data?.lastName,
        to: targetNode.data?.firstName + ' ' + targetNode.data?.lastName,
        existingSourceRelation: existingSourceRelation?.type,
        existingTargetRelation: existingTargetRelation?.type
      });
      
      // Show user-friendly notification
      toast.error('Relationship already exists', {
        description: `${sourceNode.data?.firstName} ${sourceNode.data?.lastName} and ${targetNode.data?.firstName} ${targetNode.data?.lastName} are already connected.`
      });
      
      // Reset connection state without creating relationship
      setIsConnecting(false);
      setConnectionStart(null);
      setConnectionPreview(null);
      return;
    }
    
    // Determine relationship based on handle types
    // Available handles:
    // - parent-target (target, top) - receives parent connections
    // - child-source (source, bottom) - sends child connections
    // - spouse (source, right) - sends spouse connections
    // - spouse-target (target, left) - receives spouse connections
    // - sibling (source, left) - sends sibling connections
    // - sibling-target (target, left) - receives sibling connections
    
    if (connection.sourceHandle === 'child-source' && connection.targetHandle === 'parent-target') {
      // Parent to child connection: source person is parent of target person
      relationshipType = 'parent';
    } else if (connection.sourceHandle === 'parent-source' && connection.targetHandle === 'child-target') {
      // Child to parent connection: source person is child of target person
      relationshipType = 'child';
    } else if (connection.sourceHandle === 'spouse' && connection.targetHandle === 'spouse-target') {
      // Spouse connection
      relationshipType = 'spouse';
    } else if (connection.sourceHandle === 'sibling' && connection.targetHandle === 'sibling-target') {
      // Sibling connection
      relationshipType = 'sibling';
    } else {
      // Default to parent relationship for any other connection
      relationshipType = 'parent';
    }
    
    console.log('Creating relationship:', {
      from: sourceNode.data?.firstName + ' ' + sourceNode.data?.lastName,
      to: targetNode.data?.firstName + ' ' + targetNode.data?.lastName,
      type: relationshipType
    });
    
    // Create the relationship using the smart system
    const result = await familyRelationshipManager.createRelationshipSmart(
      connection.source,
      connection.target,
      relationshipType
    );
    
    if (result.success) {
      console.log('✅ Relationship created successfully');
      
      let successMessage = `${sourceNode.data?.firstName} ${sourceNode.data?.lastName} and ${targetNode.data?.firstName} ${targetNode.data?.lastName} are now connected as ${relationshipType}s.`;
      
      if (result.corrected && result.actualRelationshipType) {
        successMessage = `Relationship created successfully! ${sourceNode.data?.firstName} ${sourceNode.data?.lastName} and ${targetNode.data?.firstName} ${targetNode.data?.lastName} are now connected as ${result.actualRelationshipType}s (automatically corrected from ${relationshipType} based on birth dates).`;
      }
      
      // Show success notification
      toast.success('Relationship created', {
        description: successMessage
      });
      
      // Refresh the tree data to show the new relationship
      onRelationshipCreated?.();
    } else {
      console.error('❌ Failed to create relationship:', result.error);
      
      // Show error notification with the specific error message
      toast.error('Failed to create relationship', {
        description: result.error || 'There was an error creating the relationship. Please try again.'
      });
    }
    
    // Reset connection state
    setIsConnecting(false);
    setConnectionStart(null);
    setConnectionPreview(null);
  }, [connectionStart, nodesState, onRelationshipCreated]);

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    console.log('Connection ended');
    setIsConnecting(false);
    setConnectionStart(null);
    setConnectionPreview(null);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isConnecting && connectionStart) {
      // Update connection preview position
      const rect = reactFlowRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionPreview({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
      }
    }
  }, [isConnecting, connectionStart]);

  // Apply focus mode filtering to nodes and edges
  const filteredNodes = useMemo(() => {
    if (!focusMode || !focusMemberId) return nodes;
    
    // Find the focus node
    const focusNode = nodes.find(node => node.data?.id === focusMemberId);
    if (!focusNode) return nodes;
    
    // Get connected edge IDs to the focus node
    const connectedEdgeIds = edges.filter(edge => 
      edge.source === focusMemberId || edge.target === focusMemberId
    ).map(edge => edge.id);
    
    // Find direct connections
    const directConnections = edges
      .filter(edge => connectedEdgeIds.includes(edge.id))
      .flatMap(edge => [edge.source, edge.target]);
    
    // Create a Set of connected node IDs including the focus node
    const connectedNodeIds = new Set([
      focusMemberId,
      ...directConnections
    ]);
    
    // Apply opacity to nodes based on connection
    return nodes.map(node => {
      const isConnected = connectedNodeIds.has(node.data?.id as string);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: isConnected ? 1 : 0.3,
        },
      };
    });
  }, [nodes, edges, focusMode, focusMemberId]);
  
  const filteredEdges = useMemo(() => {
    if (!focusMode || !focusMemberId) return edges;
    
    return edges.map(edge => {
      const isConnected = edge.source === focusMemberId || edge.target === focusMemberId;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isConnected ? 1 : 0.2,
        },
      };
    });
  }, [edges, focusMode, focusMemberId]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      touchStartRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
        distance
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current && reactFlowInstance) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = distance / touchStartRef.current.distance;
      const currentZoom = reactFlowInstance.getZoom();
      const newZoom = Math.max(0.5, Math.min(2, currentZoom * scale));
      
      reactFlowInstance.setZoom(newZoom);
      touchStartRef.current.distance = distance;
    }
  }, [reactFlowInstance]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('FamilyTreeRenderer render:', {
      nodesCount: nodes.length,
      edgesCount: edges.length,
      hasContainer: !!containerRef.current,
      sampleNode: nodes[0],
      sampleEdge: edges[0],
      isMobile
    });
  }, [nodes, edges, isMobile]);
  
  // Selected node for keyboard navigation
  const [selectedNodeForKeyboard, setSelectedNodeForKeyboard] = useState<string | null>(null);

  // Keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Arrow key navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const currentNodes = nodesState;
        if (currentNodes.length === 0) return;

        const currentIndex = selectedNodeForKeyboard 
          ? currentNodes.findIndex(n => n.id === selectedNodeForKeyboard)
          : -1;

        if (currentIndex === -1) {
          // No selection, select first node
          setSelectedNodeForKeyboard(currentNodes[0].id);
          onNodeClick({} as React.MouseEvent, currentNodes[0]);
          return;
        }

        let newIndex = currentIndex;
        const currentPos = currentNodes[currentIndex].position;

        // Find nearest node in the direction of arrow key
        if (event.key === 'ArrowUp') {
          const nodesAbove = currentNodes
            .map((n, i) => ({ node: n, index: i, distance: currentPos.y - n.position.y }))
            .filter(item => item.distance > 0)
            .sort((a, b) => {
              const distA = Math.abs(a.distance);
              const distB = Math.abs(b.distance);
              if (Math.abs(distA - distB) < 50) {
                // If similar Y, prefer closer X
                return Math.abs(a.node.position.x - currentPos.x) - Math.abs(b.node.position.x - currentPos.x);
              }
              return distA - distB;
            });
          if (nodesAbove.length > 0) newIndex = nodesAbove[0].index;
        } else if (event.key === 'ArrowDown') {
          const nodesBelow = currentNodes
            .map((n, i) => ({ node: n, index: i, distance: n.position.y - currentPos.y }))
            .filter(item => item.distance > 0)
            .sort((a, b) => {
              const distA = Math.abs(a.distance);
              const distB = Math.abs(b.distance);
              if (Math.abs(distA - distB) < 50) {
                return Math.abs(a.node.position.x - currentPos.x) - Math.abs(b.node.position.x - currentPos.x);
              }
              return distA - distB;
            });
          if (nodesBelow.length > 0) newIndex = nodesBelow[0].index;
        } else if (event.key === 'ArrowLeft') {
          const nodesLeft = currentNodes
            .map((n, i) => ({ node: n, index: i, distance: currentPos.x - n.position.x }))
            .filter(item => item.distance > 0)
            .sort((a, b) => {
              const distA = Math.abs(a.distance);
              const distB = Math.abs(b.distance);
              if (Math.abs(distA - distB) < 50) {
                return Math.abs(a.node.position.y - currentPos.y) - Math.abs(b.node.position.y - currentPos.y);
              }
              return distA - distB;
            });
          if (nodesLeft.length > 0) newIndex = nodesLeft[0].index;
        } else if (event.key === 'ArrowRight') {
          const nodesRight = currentNodes
            .map((n, i) => ({ node: n, index: i, distance: n.position.x - currentPos.x }))
            .filter(item => item.distance > 0)
            .sort((a, b) => {
              const distA = Math.abs(a.distance);
              const distB = Math.abs(b.distance);
              if (Math.abs(distA - distB) < 50) {
                return Math.abs(a.node.position.y - currentPos.y) - Math.abs(b.node.position.y - currentPos.y);
              }
              return distA - distB;
            });
          if (nodesRight.length > 0) newIndex = nodesRight[0].index;
        }

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < currentNodes.length) {
          const newNode = currentNodes[newIndex];
          setSelectedNodeForKeyboard(newNode.id);
          onNodeClick({} as React.MouseEvent, newNode);
          
          // Center on selected node
          if (reactFlowInstance) {
            reactFlowInstance.setCenter(newNode.position.x, newNode.position.y, { zoom: 1.5, duration: 300 });
          }
        }
        return;
      }

      // Enter to select/view node
      if (event.key === 'Enter' && selectedNodeForKeyboard) {
        event.preventDefault();
        const node = nodesState.find(n => n.id === selectedNodeForKeyboard);
        if (node) {
          onNodeClick({} as React.MouseEvent, node);
        }
        return;
      }

      // Escape to deselect
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedNodeForKeyboard(null);
        return;
      }

      // Ctrl/Cmd + T for hierarchy layout
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        handleHierarchyLayout();
      }
      // Ctrl/Cmd + G for genealogical layout
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        handleGenealogicalLayout();
      }
      // Ctrl/Cmd + F for flip orientation
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        handleToggleOrientation();
      }
      // Ctrl/Cmd + 0 for fit view
      if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        handleFitView();
      }
      // Ctrl/Cmd + 1 for Standard Pedigree
      if ((event.ctrlKey || event.metaKey) && event.key === '1') {
        event.preventDefault();
        setTreeType('standard-pedigree');
        handleStandardPedigreeLayout();
      }
      // Ctrl/Cmd + 2 for Combination Pedigree
      if ((event.ctrlKey || event.metaKey) && event.key === '2') {
        event.preventDefault();
        setTreeType('combination-pedigree');
        handleCombinationPedigreeLayout();
      }
      // Ctrl/Cmd + 3 for Descendant Chart
      if ((event.ctrlKey || event.metaKey) && event.key === '3') {
        event.preventDefault();
        setTreeType('descendant-chart');
        handleDescendantChartLayout();
      }
      // Ctrl/Cmd + E for expand/fullscreen
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        handleToggleExpand();
      }
      // Escape to exit fullscreen
      if (event.key === 'Escape' && isExpanded) {
        event.preventDefault();
        setIsExpanded(false);
      }
      // Ctrl/Cmd + ? for keyboard shortcuts help
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        toast('Keyboard Shortcuts: Arrow keys to navigate, Enter to select, Escape to deselect/exit fullscreen, Ctrl/Cmd+T for hierarchy, Ctrl/Cmd+G for genealogy, Ctrl/Cmd+F to flip, Ctrl/Cmd+E to expand, Ctrl/Cmd+0 to fit view');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHierarchyLayout, handleGenealogicalLayout, handleToggleOrientation, handleFitView, handleStandardPedigreeLayout, handleCombinationPedigreeLayout, handleDescendantChartLayout, nodesState, selectedNodeForKeyboard, reactFlowInstance, onNodeClick, handleToggleExpand, isExpanded]);

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-white z-50 flex flex-col"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
        >
          {/* Expanded Header */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm">
            <h2 className="text-lg font-semibold">Family Tree - Full Screen</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleExpand}
              className="flex items-center gap-2"
              title="Exit full screen (Esc)"
            >
              <MinimizeIcon className="h-4 w-4" />
              Exit Full Screen
            </Button>
          </div>
          
          {/* Expanded Tree Container */}
          <div 
            className="flex-1 w-full"
            style={{ 
              width: '100%',
              height: 'calc(100vh - 60px)',
              position: 'relative'
            }}
          >
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleContainerMouseDown}
              onMouseMove={handleContainerMouseMove}
              onMouseUp={handleContainerMouseUp}
              style={{ width: '100%', height: '100%' }}
            >
              <ReactFlow
                nodes={nodesState}
                edges={edgesState}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={handleInit}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
                onNodeDragStart={handleNodeDragStart}
                onNodeDrag={handleNodeDrag}
                onNodeDragStop={handleNodeDragStop}
                onEdgeDoubleClick={handleEdgeDoubleClick}
                onEdgeContextMenu={handleEdgeContextMenu}
                onPaneClick={handlePaneClick}
                onConnectStart={handleConnectStart}
                onConnect={handleConnect}
                onConnectEnd={handleConnectEnd}
                onMouseMove={handleMouseMove}
                onNodesChange={onNodesChangeWithCallbacks}
                onEdgesChange={onEdgesChange}
                defaultViewport={{ x: 0, y: 0, zoom: isMobile ? 0.8 : 1 }}
                minZoom={isMobile ? 0.3 : 0.5}
                maxZoom={isMobile ? 2 : 3}
                panOnScroll={!isMobile}
                panOnDrag={!boxSelection?.isActive}
                zoomOnScroll={!isMobile}
                zoomOnPinch={isMobile}
                preventScrolling={isMobile}
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
                selectNodesOnDrag={false}
                nodesFocusable={true}
                edgesFocusable={true}
                selectionOnDrag={true}
                snapToGrid={true}
                snapGrid={[15, 15]}
                defaultEdgeOptions={{ type: 'smoothstep' }}
                multiSelectionKeyCode="Meta"
                deleteKeyCode="Delete"
                fitViewOptions={{ padding: 0.2 }}
                style={{ 
                  background: 'white',
                  width: '100%',
                  height: '100%'
                }}
                proOptions={{ hideAttribution: true }}
                className="family-tree"
              >
                {/* All the same children as the regular view */}
                {/* Box Selection Overlay */}
                {boxSelection && boxSelection.isActive && containerRef.current && (
                  (() => {
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const minX = Math.min(boxSelection.startScreenX, boxSelection.endScreenX) - containerRect.left;
                    const minY = Math.min(boxSelection.startScreenY, boxSelection.endScreenY) - containerRect.top;
                    const width = Math.abs(boxSelection.endScreenX - boxSelection.startScreenX);
                    const height = Math.abs(boxSelection.endScreenY - boxSelection.startScreenY);
                    
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          pointerEvents: 'none',
                          zIndex: 1000,
                          border: '2px dashed #3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          left: `${minX}px`,
                          top: `${minY}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                        }}
                      />
                    );
                  })()
                )}
                
                {dragPreview && (
                  <div
                    style={{
                      position: 'absolute',
                      left: dragPreview.x - 90,
                      top: dragPreview.y - 50,
                      width: '180px',
                      height: '100px',
                      border: `2px dashed ${dragPreview.valid ? '#10b981' : '#ef4444'}`,
                      borderRadius: '8px',
                      backgroundColor: dragPreview.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      pointerEvents: 'none',
                      zIndex: 1000
                    }}
                  />
                )}
                
                {collisionNodes.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    Warning: Collision detected with {collisionNodes.length} node(s)
                  </div>
                )}

                {isConnecting && connectionPreview && (
                  <div
                    style={{
                      position: 'absolute',
                      left: connectionPreview.x - 5,
                      top: connectionPreview.y - 5,
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#7856FF',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 0 10px rgba(120, 86, 255, 0.5)'
                    }}
                  />
                )}

                <Background />
                <Controls />
                
                {/* All Panels for Expanded View - Same as regular view */}
                {minimap && (
                  <MiniMap 
                    nodeColor={(node) => {
                      const data = node.data;
                      if (data?.isCurrentUser) return '#7856FF';
                      if (data?.gender === 'male') return '#93C5FD';
                      if (data?.gender === 'female') return '#F9A8D4';
                      return '#D1D5DB';
                    }}
                    maskColor="rgba(240, 240, 240, 0.6)"
                    style={{ right: 20, bottom: 280 }}
                    pannable={true}
                    zoomable={true}
                  />
                )}
                
                <Panel position="top-right" className="bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-2 max-h-[90vh] overflow-y-auto">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleZoomOut}
                      className="h-8 w-8 p-0"
                      title="Zoom Out"
                    >
                      <ZoomOutIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleZoomIn}
                      className="h-8 w-8 p-0"
                      title="Zoom In"
                    >
                      <ZoomInIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleFitView}
                      className="h-8 w-8 p-0"
                      title="Fit View - Ctrl/Cmd + 0"
                    >
                      <MaximizeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleToggleExpand}
                      className="h-8 w-8 p-0"
                      title="Exit Full Screen - Esc"
                    >
                      <MinimizeIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Layout Buttons */}
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleSmartLayout}
                      className="h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                      title="Smart Layout"
                    >
                      <TreePineIcon className="h-4 w-4 mr-1" />
                      Smart Layout
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleHierarchyLayout}
                      className="h-8 text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                      title="Pyramid Tree"
                    >
                      <TreePineIcon className="h-4 w-4 mr-1" />
                      Pyramid Tree
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenealogicalLayout}
                      className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
                      title="Genealogy Tree"
                    >
                      <GenealogyIcon className="h-4 w-4 mr-1" />
                      Genealogy Tree
                    </Button>
                  </div>
                  
                  {/* Collapse/Expand Controls */}
                  <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Branch Controls</div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={expandAll}
                      className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
                      title="Expand all collapsed branches"
                    >
                      <ChevronDownIcon className="h-4 w-4 mr-1" />
                      Expand All
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={collapseAll}
                      className="h-8 text-xs border-red-500 text-red-600 hover:bg-red-50"
                      title="Collapse all branches with descendants"
                    >
                      <ChevronUpIcon className="h-4 w-4 mr-1" />
                      Collapse All
                    </Button>
                  </div>
                </Panel>
                
                <Panel position="top-left" className="bg-white p-2 rounded-md shadow-sm">
                  <ToggleGroup type="single" value={orientation} onValueChange={(val) => {
                    if (val) setOrientation(val as 'horizontal' | 'vertical');
                  }}>
                    <ToggleGroupItem value="vertical" aria-label="Vertical Layout">
                      <ArrowDownIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="horizontal" aria-label="Horizontal Layout">
                      <ArrowRightIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Panel>
                
                {focusMode && (
                  <Panel position="bottom-center" className="bg-white p-2 rounded-md shadow-sm">
                    <div className="flex items-center gap-2">
                      <DotIcon className="h-3 w-3 text-heritage-purple" />
                      <span className="text-sm">Focus Mode: Showing direct family connections</span>
                      <Button
                        variant="ghost" 
                        size="sm" 
                        className="ml-2 h-7 px-2"
                        onClick={() => setFocusMode(false)}
                      >
                        <XIcon className="h-4 w-4" />
                        <span className="ml-1">Exit Focus Mode</span>
                      </Button>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </div>
          </div>
        </div>
      )}
      
      <div 
        className={`w-full h-full ${className} ${isExpanded ? 'hidden' : ''}`} 
        ref={containerRef}
        style={{ 
          width: '100%',
          height: isExpanded ? '100vh' : '600px',
          minHeight: isExpanded ? '100vh' : '600px',
          position: 'relative'
        }}
        role="application"
        aria-label="Family tree visualization"
        aria-live="polite"
      >
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        style={{ width: '100%', height: '100%' }}
      >
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={handleInit}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneClick={handlePaneClick}
          onConnectStart={handleConnectStart}
          onConnect={handleConnect}
          onConnectEnd={handleConnectEnd}
          onMouseMove={handleMouseMove}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          defaultViewport={{ x: 0, y: 0, zoom: isMobile ? 0.8 : 1 }}
          minZoom={isMobile ? 0.3 : 0.5}
          maxZoom={isMobile ? 2 : 3}
          panOnScroll={!isMobile}
          panOnDrag={!boxSelection?.isActive}
          zoomOnScroll={!isMobile}
          zoomOnPinch={isMobile}
          preventScrolling={isMobile}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          nodesFocusable={true}
          edgesFocusable={true}
          selectionOnDrag={true}
          snapToGrid={true}
          snapGrid={[15, 15]}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          multiSelectionKeyCode="Meta"
          deleteKeyCode="Delete"
          fitViewOptions={{ padding: 0.2 }}
          style={{ 
            background: 'white',
            width: '100%',
            height: '100%'
          }}
          proOptions={{ hideAttribution: true }}
          className="family-tree"
        >
        {/* Box Selection Overlay */}
        {boxSelection && boxSelection.isActive && containerRef.current && (
          (() => {
            const containerRect = containerRef.current.getBoundingClientRect();
            const minX = Math.min(boxSelection.startScreenX, boxSelection.endScreenX) - containerRect.left;
            const minY = Math.min(boxSelection.startScreenY, boxSelection.endScreenY) - containerRect.top;
            const width = Math.abs(boxSelection.endScreenX - boxSelection.startScreenX);
            const height = Math.abs(boxSelection.endScreenY - boxSelection.startScreenY);
            
            return (
              <div
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  border: '2px dashed #3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  left: `${minX}px`,
                  top: `${minY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                }}
              />
            );
          })()
        )}
        
        {/* Drag Preview Overlay */}
        {dragPreview && (
          <div
            style={{
              position: 'absolute',
              left: dragPreview.x - 90,
              top: dragPreview.y - 50,
              width: '180px',
              height: '100px',
              border: `2px dashed ${dragPreview.valid ? '#10b981' : '#ef4444'}`,
              borderRadius: '8px',
              backgroundColor: dragPreview.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              pointerEvents: 'none',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: dragPreview.valid ? '#10b981' : '#ef4444'
            }}
          >
            {dragPreview.valid ? '✓ Valid Position' : '✗ Collision Detected'}
          </div>
        )}
        
        {/* Collision Highlight Overlay */}
        {collisionNodes.length > 0 && (
          <>
            {collisionNodes.map(nodeId => {
              const node = nodesState.find(n => n.id === nodeId);
              if (!node) return null;
              
              return (
                <div
                  key={`collision-${nodeId}`}
                  style={{
                    position: 'absolute',
                    left: node.position.x - 90,
                    top: node.position.y - 50,
                    width: '180px',
                    height: '100px',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    pointerEvents: 'none',
                    zIndex: 999,
                    animation: 'pulse 1s infinite'
                  }}
                />
              );
            })}
          </>
        )}
        {/* SVG Markers for arrows */}
        <svg>
          <defs>
            <marker
              id="arrow-parent"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#16a34a" />
            </marker>
            <marker
              id="arrow-child"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#dc2626" />
            </marker>
            <marker
              id="arrow-spouse"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#dc2626" />
            </marker>
            <marker
              id="arrow-default"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
            </marker>
          </defs>
        </svg>
        
        <Background gap={16} size={1} color="#f0f0f0" />
        <Controls showInteractive={true} />
        
        {/* Connection preview line */}
        {isConnecting && connectionStart && connectionPreview && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            <line
              x1={connectionStart.nodeId ? nodesState.find(n => n.id === connectionStart.nodeId)?.position.x || 0 : 0}
              y1={connectionStart.nodeId ? nodesState.find(n => n.id === connectionStart.nodeId)?.position.y || 0 : 0}
              x2={connectionPreview.x}
              y2={connectionPreview.y}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity={0.8}
            />
          </svg>
        )}
        
        {/* Custom Control Panel */}
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                className="h-8 w-8 p-0"
                title="Zoom Out"
              >
                <ZoomOutIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                className="h-8 w-8 p-0"
                title="Zoom In"
              >
                <ZoomInIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFitView}
                className="h-8 w-8 p-0"
                title="Fit View - Ctrl/Cmd + 0"
              >
                <MaximizeIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleExpand}
                className="h-8 w-8 p-0"
                title="Expand to Full Screen - Ctrl/Cmd + E"
              >
                {isExpanded ? (
                  <MinimizeIcon className="h-4 w-4" />
                ) : (
                  <MaximizeIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Layout Buttons */}
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant="default"
                onClick={handleSmartLayout}
                className="h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                title="Smart Layout - Intelligently arrange nodes with collision avoidance"
              >
                <TreePineIcon className="h-4 w-4 mr-1" />
                Smart Layout
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  layoutService.clearLayout();
                  // Trigger a re-render to apply default layout
                  window.location.reload();
                }}
                className="h-8 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
                title="Clear saved layout and reset to default"
              >
                <XIcon className="h-4 w-4 mr-1" />
                Clear Layout
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleHierarchyLayout}
                className="h-8 text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                title="Organize as Family Tree (Oldest → Youngest) - Ctrl/Cmd + T"
              >
                <TreePineIcon className="h-4 w-4 mr-1" />
                Pyramid Tree
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenealogicalLayout}
                className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
                title="Traditional Genealogical Tree Layout - Ctrl/Cmd + G"
              >
                <GenealogyIcon className="h-4 w-4 mr-1" />
                Genealogy Tree
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleOrientation}
                className="h-8 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
                title={`Flip Tree Orientation (Currently: ${treeOrientation === 'top-down' ? 'Top-Down' : 'Bottom-Up'}) - Ctrl/Cmd + F`}
              >
                <FlipIcon className="h-4 w-4 mr-1" />
                {treeOrientation === 'top-down' ? 'Flip to Bottom-Up' : 'Flip to Top-Down'}
              </Button>
            </div>
            
            {/* Collapse/Expand Controls */}
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-600 mb-1">Branch Controls</div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={expandAll}
                className="h-8 text-xs border-green-500 text-green-600 hover:bg-green-50"
                title="Expand all collapsed branches"
              >
                <ChevronDownIcon className="h-4 w-4 mr-1" />
                Expand All
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={collapseAll}
                className="h-8 text-xs border-red-500 text-red-600 hover:bg-red-50"
                title="Collapse all branches with descendants"
              >
                <ChevronUpIcon className="h-4 w-4 mr-1" />
                Collapse All
              </Button>
            </div>
            
            {/* Relationship Path Finder */}
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-600 mb-1">Find Relationship</div>
              <div className="text-xs text-gray-500 mb-2">
                Click two members to find how they're related
              </div>
              {pathStartMember ? (
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-blue-600 mb-1">
                    First member selected. Click another member...
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPathStartMember(null);
                      setHighlightedPath([]);
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.info('Click on the first family member to find relationship');
                    setPathStartMember('waiting');
                  }}
                  className="h-8 text-xs border-purple-500 text-purple-600 hover:bg-purple-50"
                  title="Find relationship between two members"
                >
                  <NetworkIcon className="h-4 w-4 mr-1" />
                  Find Relationship
                </Button>
              )}
              {highlightedPath.length > 0 && (
                <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                  <div className="font-semibold text-purple-800 mb-1">Relationship Found:</div>
                  <div className="text-purple-700">
                    {findPath(highlightedPath[0], highlightedPath[highlightedPath.length - 1])?.relationshipDescription || 'Related'}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setHighlightedPath([]);
                      setPathStartMember(null);
                    }}
                    className="h-6 text-xs mt-1 w-full"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            
            {/* Pedigree Type Buttons */}
            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-600 mb-1">Pedigree Types</div>
              
              <Button
                size="sm"
                variant={treeType === 'standard-pedigree' ? 'default' : 'outline'}
                onClick={() => {
                  setTreeType('standard-pedigree');
                  handleStandardPedigreeLayout();
                }}
                className="h-8 text-xs border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                title="Standard Pedigree: Shows one person and their ancestors only. Perfect for tracing lineage backwards. - Ctrl/Cmd + 1"
              >
                <PedigreeIcon className="h-4 w-4 mr-1" />
                Standard Pedigree
              </Button>
              
              <Button
                size="sm"
                variant={treeType === 'combination-pedigree' ? 'default' : 'outline'}
                onClick={() => {
                  setTreeType('combination-pedigree');
                  handleCombinationPedigreeLayout();
                }}
                className="h-8 text-xs border-teal-500 text-teal-600 hover:bg-teal-50"
                title="Combination Pedigree: Shows a couple with both ancestors and descendants. Great for complete family overview. - Ctrl/Cmd + 2"
              >
                <NetworkIcon className="h-4 w-4 mr-1" />
                Combination Pedigree
              </Button>
              
              <Button
                size="sm"
                variant={treeType === 'descendant-chart' ? 'default' : 'outline'}
                onClick={() => {
                  setTreeType('descendant-chart');
                  handleDescendantChartLayout();
                }}
                className="h-8 text-xs border-rose-500 text-rose-600 hover:bg-rose-50"
                title="Descendant Chart: Shows one person/couple and all their descendants. Perfect for seeing family growth. - Ctrl/Cmd + 3"
              >
                <DescendantIcon className="h-4 w-4 mr-1" />
                Descendant Chart
              </Button>
            </div>
          </div>
        </Panel>
        
        {minimap && (
          <MiniMap 
            nodeColor={(node) => {
              const data = node.data;
              if (data?.isCurrentUser) return '#7856FF';
              if (data?.gender === 'male') return '#93C5FD';
              if (data?.gender === 'female') return '#F9A8D4';
              return '#D1D5DB';
            }}
            maskColor="rgba(240, 240, 240, 0.6)"
            style={{ right: 20, bottom: 280 }}
            pannable={true}
            zoomable={true}
          />
        )}
        
        <Panel position="top-left" className="bg-white p-2 rounded-md shadow-sm">
          <ToggleGroup type="single" value={orientation} onValueChange={(val) => {
            if (val) setOrientation(val as 'horizontal' | 'vertical');
          }}>
            <ToggleGroupItem value="vertical" aria-label="Vertical Layout">
              <ArrowDownIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="horizontal" aria-label="Horizontal Layout">
              <ArrowRightIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </Panel>
        
        {focusMode && (
          <Panel position="bottom-center" className="bg-white p-2 rounded-md shadow-sm">
            <div className="flex items-center gap-2">
              <DotIcon className="h-3 w-3 text-heritage-purple" />
              <span className="text-sm">Focus Mode: Showing direct family connections</span>
              <Button
                variant="ghost" 
                size="sm" 
                className="ml-2 h-7 px-2"
                onClick={() => setFocusMode(false)}
              >
                <XIcon className="h-4 w-4" />
                <span className="ml-1">Exit Focus Mode</span>
              </Button>
            </div>
          </Panel>
        )}
      </ReactFlow>
      </div>
      
    </div>
    </>
  );
};

export default FamilyTreeRenderer;
