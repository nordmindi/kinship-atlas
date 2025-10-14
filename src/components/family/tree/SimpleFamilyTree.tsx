import React, { useState, useEffect } from 'react';
import { FamilyMember } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Users, Plus, X, Link, Edit, Trash2 } from 'lucide-react';
import { NodeEditDialog } from './NodeEditDialog';
import { NodeAddDialog } from './NodeAddDialog';
import { addFamilyMember } from '@/services/supabaseService';
import { familyRelationshipManager, RelationshipType } from '@/services/familyRelationshipManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SimpleFamilyTreeProps {
  members: FamilyMember[];
  currentUserId?: string;
  onSelectMember: (memberId: string) => void;
}

interface TreeNode {
  id: string;
  member: FamilyMember;
  x: number;
  y: number;
  generation: number;
  children: TreeNode[];
  parents: TreeNode[];
  isCurrentUser: boolean;
}

interface TreeConnection {
  from: { x: number; y: number; id: string };
  to: { x: number; y: number; id: string };
  type: 'parent' | 'spouse' | 'child';
}

const SimpleFamilyTree: React.FC<SimpleFamilyTreeProps> = ({
  members,
  currentUserId,
  onSelectMember
}) => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [connections, setConnections] = useState<TreeConnection[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<TreeNode | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const NODE_WIDTH = 160;
  const NODE_HEIGHT = 120;
  const GENERATION_GAP = 200;
  const SIBLING_GAP = 180;

  useEffect(() => {
    if (members.length === 0) return;

    console.log('Building tree with members:', members.length);

    // Build tree structure
    const treeNodes = buildTreeStructure(members, currentUserId);
    const treeConnections = buildConnections(treeNodes);

    console.log('Generated nodes:', treeNodes.length);
    console.log('Generated connections:', treeConnections.length);

    setNodes(treeNodes);
    setConnections(treeConnections);
  }, [members, currentUserId]);

  const buildTreeStructure = (familyMembers: FamilyMember[], currentUserId?: string): TreeNode[] => {
    // Create a map of all members
    const memberMap = new Map<string, FamilyMember>();
    familyMembers.forEach(member => memberMap.set(member.id, member));

    // Find root (current user or first member)
    const rootMember = familyMembers.find(m => m.id === currentUserId) || familyMembers[0];
    if (!rootMember) return [];

    // Build generations
    const generations = new Map<number, FamilyMember[]>();
    const processed = new Set<string>();
    const memberToGeneration = new Map<string, number>();

    // Start with root at generation 0
    const addToGeneration = (member: FamilyMember, generation: number) => {
      if (processed.has(member.id)) return;
      
      processed.add(member.id);
      memberToGeneration.set(member.id, generation);
      
      if (!generations.has(generation)) {
        generations.set(generation, []);
      }
      generations.get(generation)!.push(member);

      // Add parents to previous generation
      const parents = member.relations
        .filter(r => r.type === 'parent')
        .map(r => memberMap.get(r.personId))
        .filter(Boolean) as FamilyMember[];
      
      parents.forEach(parent => {
        addToGeneration(parent, generation - 1);
      });

      // Add children to next generation
      const children = member.relations
        .filter(r => r.type === 'child')
        .map(r => memberMap.get(r.personId))
        .filter(Boolean) as FamilyMember[];
      
      children.forEach(child => {
        addToGeneration(child, generation + 1);
      });

      // Add spouses to same generation
      const spouses = member.relations
        .filter(r => r.type === 'spouse')
        .map(r => memberMap.get(r.personId))
        .filter(Boolean) as FamilyMember[];
      
      spouses.forEach(spouse => {
        addToGeneration(spouse, generation);
      });
    };

    addToGeneration(rootMember, 0);

    // Convert to tree nodes with positions
    const treeNodes: TreeNode[] = [];
    const generationKeys = Array.from(generations.keys()).sort((a, b) => a - b);
    
    // Adjust to start from top (negative generations first)
    const minGeneration = Math.min(...generationKeys);
    const maxGeneration = Math.max(...generationKeys);
    
    generationKeys.forEach(gen => {
      const membersInGen = generations.get(gen) || [];
      const adjustedGen = gen - minGeneration; // Normalize to start from 0
      
      membersInGen.forEach((member, index) => {
        const x = (index - (membersInGen.length - 1) / 2) * SIBLING_GAP;
        const y = adjustedGen * GENERATION_GAP;
        
        treeNodes.push({
          id: member.id,
          member,
          x,
          y,
          generation: adjustedGen,
          children: [],
          parents: [],
          isCurrentUser: member.id === currentUserId
        });
      });
    });

    return treeNodes;
  };

  const buildConnections = (treeNodes: TreeNode[]): TreeConnection[] => {
    const connections: TreeConnection[] = [];
    const nodeMap = new Map<string, TreeNode>();
    
    treeNodes.forEach(node => nodeMap.set(node.id, node));

    treeNodes.forEach(node => {
      const member = node.member;
      
      // Create connections for each relation
      member.relations.forEach(relation => {
        const relatedNode = nodeMap.get(relation.personId);
        if (!relatedNode) return;

        const from = { x: node.x, y: node.y, id: node.id };
        const to = { x: relatedNode.x, y: relatedNode.y, id: relatedNode.id };

        if (relation.type === 'parent' || relation.type === 'child') {
          connections.push({
            from: relation.type === 'parent' ? to : from,
            to: relation.type === 'parent' ? from : to,
            type: 'parent'
          });
        } else if (relation.type === 'spouse') {
          // Only add spouse connection once (from lower ID to higher ID)
          if (node.id < relatedNode.id) {
            connections.push({ from, to, type: 'spouse' });
          }
        }
      });
    });

    return connections;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleFitView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    onSelectMember(nodeId);
  };

  const handleDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNode(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Calculate offset from node position to mouse position
    const svg = (e.target as Element).closest('svg');
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / zoom - panX;
    const svgY = (e.clientY - rect.top) / zoom - panY;
    
    setDragOffset({ 
      x: svgX - node.x, 
      y: svgY - node.y 
    });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggedNode) return;
    
    e.preventDefault();
    
    const svg = (e.target as Element).closest('svg');
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / zoom - panX;
    const svgY = (e.clientY - rect.top) / zoom - panY;
    
    // Update node position in real-time
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === draggedNode
          ? { ...node, x: svgX - dragOffset.x, y: svgY - dragOffset.y }
          : node
      )
    );
    
    // Update connections in real-time
    const updatedNodes = nodes.map(node => 
      node.id === draggedNode
        ? { ...node, x: svgX - dragOffset.x, y: svgY - dragOffset.y }
        : node
    );
    setConnections(buildConnections(updatedNodes));
  };

  const handleDragEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode) {
      handleDragMove(e);
    } else if (isConnecting) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleStartConnection = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConnecting(true);
    setConnectionStart(node);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleEndConnection = (targetNode: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isConnecting || !connectionStart || connectionStart.id === targetNode.id) {
      setIsConnecting(false);
      setConnectionStart(null);
      return;
    }

    // Show relationship type selection
    const relationshipType = prompt(
      `Create relationship between ${connectionStart.member.firstName} and ${targetNode.member.firstName}.\n\nChoose relationship type:\n- parent (${connectionStart.member.firstName} is parent of ${targetNode.member.firstName})\n- child (${connectionStart.member.firstName} is child of ${targetNode.member.firstName})\n- spouse (married)\n- sibling (brother/sister)\n\nEnter: parent, child, spouse, or sibling`,
      'spouse'
    );

    if (relationshipType && ['parent', 'child', 'spouse', 'sibling'].includes(relationshipType)) {
      // Add the relationship
      addNewRelation(connectionStart.id, targetNode.id, relationshipType as 'parent' | 'child' | 'spouse' | 'sibling');
    }

    setIsConnecting(false);
    setConnectionStart(null);
  };

  const addNewRelation = async (fromId: string, toId: string, relationType: RelationshipType) => {
    // Add to database using smart system
    const result = await familyRelationshipManager.createRelationshipSmart(
      fromId,
      toId,
      relationType
    );
    if (!result.success) {
      toast({
        title: 'Could not create relationship',
        description: result.error || 'An unexpected error occurred while creating the relationship.',
        variant: 'destructive'
      });
      return;
    }

    const actualType = (result.actualRelationshipType ?? relationType) as RelationshipType;
    const reciprocalType = getReciprocalRelationType(actualType);
    const fromNode = nodes.find(node => node.id === fromId);
    const toNode = nodes.find(node => node.id === toId);

    // Update the nodes state to add the new relationship (and reciprocal)
    setNodes(prevNodes => {
      const timestamp = Date.now();

      const updatedNodes = prevNodes.map(node => {
        if (node.id === fromId) {
          const hasRelation = node.member.relations.some(
            r => r.personId === toId && r.type === actualType
          );

          if (hasRelation) {
            return node;
          }

          return {
            ...node,
            member: {
              ...node.member,
              relations: [
                ...node.member.relations,
                {
                  id: `rel-${timestamp}`,
                  type: actualType,
                  personId: toId
                }
              ]
            }
          };
        }

        if (reciprocalType && node.id === toId) {
          const hasReciprocal = node.member.relations.some(
            r => r.personId === fromId && r.type === reciprocalType
          );

          if (hasReciprocal) {
            return node;
          }

          return {
            ...node,
            member: {
              ...node.member,
              relations: [
                ...node.member.relations,
                {
                  id: `rel-${timestamp + 1}`,
                  type: reciprocalType,
                  personId: fromId
                }
              ]
            }
          };
        }

        return node;
      });

      setConnections(buildConnections(updatedNodes));
      return updatedNodes;
    });

    const fromName = fromNode ? `${fromNode.member.firstName} ${fromNode.member.lastName}` : 'The selected member';
    const toName = toNode ? `${toNode.member.firstName} ${toNode.member.lastName}` : 'the selected member';

    let description: string;
    switch (actualType) {
      case 'parent':
        description = `${fromName} is now recorded as parent of ${toName}.`;
        break;
      case 'child':
        description = `${fromName} is now recorded as child of ${toName}.`;
        break;
      case 'spouse':
        description = `${fromName} and ${toName} are now recorded as spouses.`;
        break;
      default:
        description = `${fromName} and ${toName} are now recorded as siblings.`;
        break;
    }

    if (result.corrected && result.actualRelationshipType && result.actualRelationshipType !== relationType) {
      description += ' Direction was adjusted automatically based on birth dates.';
    }

    toast({
      title: 'Relationship added',
      description
    });
  };

  const getReciprocalRelationType = (type: RelationshipType): RelationshipType | null => {
    switch (type) {
      case 'parent':
        return 'child';
      case 'child':
        return 'parent';
      case 'spouse':
        return 'spouse';
      case 'sibling':
        return 'sibling';
      default:
        return null;
    }
  };

  const handleRemoveConnection = async (connection: TreeConnection, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const fromNode = nodes.find(n => n.id === connection.from.id);
    const toNode = nodes.find(n => n.id === connection.to.id);
    
    if (!fromNode || !toNode) return;

    const confirmRemove = confirm(
      `Remove ${connection.type} relationship between ${fromNode.member.firstName} and ${toNode.member.firstName}?`
    );

    if (confirmRemove) {
      // Find the relation record (check both nodes in case the connection was built from either side)
      let relation = fromNode.member.relations.find(r => r.personId === toNode.id);
      if (!relation) {
        relation = toNode.member.relations.find(r => r.personId === fromNode.id);
      }

      if (!relation) {
        toast({
          title: 'Relationship not found',
          description: 'Unable to locate the selected relationship in the current view.',
          variant: 'destructive'
        });
        return;
      }

      // Remove from database using new system
      const result = await familyRelationshipManager.deleteRelationship(relation.id);
      if (!result.success) {
        toast({
          title: 'Failed to remove relationship',
          description: result.error || 'An unexpected error occurred while removing the relationship.',
          variant: 'destructive'
        });
        return;
      }

      // Remove the relationship from both nodes and rebuild connections
      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(node => {
          if (node.id === connection.from.id) {
            return {
              ...node,
              member: {
                ...node.member,
                relations: node.member.relations.filter(r => r.personId !== connection.to.id)
              }
            };
          }

          if (node.id === connection.to.id) {
            return {
              ...node,
              member: {
                ...node.member,
                relations: node.member.relations.filter(r => r.personId !== connection.from.id)
              }
            };
          }

          return node;
        });

        setConnections(buildConnections(updatedNodes));
        return updatedNodes;
      });

      const fromName = `${fromNode.member.firstName} ${fromNode.member.lastName}`;
      const toName = `${toNode.member.firstName} ${toNode.member.lastName}`;

      toast({
        title: 'Relationship removed',
        description: `${fromName} and ${toName} are no longer connected.`
      });
    }
  };

  const handleEditNode = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMember(node.member);
    setIsEditDialogOpen(true);
  };

  const handleDeleteNode = async (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmDelete = confirm(
      `Are you sure you want to delete ${node.member.firstName} ${node.member.lastName}? This will also remove all their relationships.`
    );

    if (!confirmDelete) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', node.id);

      if (error) throw error;

      // Remove from state
      setNodes(prevNodes => prevNodes.filter(n => n.id !== node.id));
      setConnections(prevConnections => 
        prevConnections.filter(c => c.from.id !== node.id && c.to.id !== node.id)
      );

      toast({
        title: "Success",
        description: `${node.member.firstName} ${node.member.lastName} has been removed.`
      });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: "Could not delete family member.",
        variant: "destructive"
      });
    }
  };

  const handleSaveEdit = async (updatedData: Partial<FamilyMember>) => {
    if (!editingMember) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .update({
          first_name: updatedData.firstName,
          last_name: updatedData.lastName,
          birth_date: updatedData.birthDate || null,
          death_date: updatedData.deathDate || null,
          birth_place: updatedData.birthPlace,
          bio: updatedData.bio,
          gender: updatedData.gender,
          avatar_url: updatedData.avatar,
        })
        .eq('id', editingMember.id);

      if (error) throw error;

      // Update state
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === editingMember.id
            ? { ...node, member: { ...node.member, ...updatedData } }
            : node
        )
      );

      toast({
        title: "Success",
        description: "Family member updated successfully."
      });
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: "Error",
        description: "Could not update family member.",
        variant: "destructive"
      });
    }
  };

  const handleAddMember = async (newMember: Omit<FamilyMember, 'id' | 'relations'>) => {
    const addedMember = await addFamilyMember(newMember, newMember.currentLocation);
    
    if (addedMember) {
      // Add to nodes
      const newNode: TreeNode = {
        id: addedMember.id,
        member: addedMember,
        x: 0,
        y: nodes.length * 200,
        generation: 0,
        children: [],
        parents: [],
        isCurrentUser: false
      };

      setNodes(prevNodes => [...prevNodes, newNode]);
    }
  };



  const renderNode = (node: TreeNode) => {
    const isSelected = selectedNode === node.id;
    const isCurrentUser = node.isCurrentUser;
    const isDragging = draggedNode === node.id;
    const isConnectionTarget = isConnecting && connectionStart?.id !== node.id;

    return (
      <g
        key={node.id}
        transform={`translate(${node.x - NODE_WIDTH/2}, ${node.y - NODE_HEIGHT/2})`}
        className={`transition-opacity duration-200 ${isDragging ? 'opacity-70 cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Draggable area overlay */}
        <rect
          x="0"
          y="0"
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          fill="transparent"
          className="cursor-grab"
          onMouseDown={(e) => handleDragStart(e, node.id)}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        
        {/* Node content */}
        <g onClick={() => handleNodeClick(node.id)}>
        <rect
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx="12"
          fill={isCurrentUser ? '#7C3AED' : isConnectionTarget ? '#10B981' : '#FFFFFF'}
          stroke={isSelected ? '#7C3AED' : isCurrentUser ? '#FFFFFF' : isConnectionTarget ? '#10B981' : '#E5E7EB'}
          strokeWidth={isSelected ? 3 : isCurrentUser ? 2 : isConnectionTarget ? 2 : 1}
          className="transition-all duration-200 pointer-events-none"
        />
        
        {/* Avatar */}
        <foreignObject x="10" y="10" width="60" height="60">
          <Avatar className="h-15 w-15">
            <AvatarImage src={node.member.avatar} alt={`${node.member.firstName} ${node.member.lastName}`} />
            <AvatarFallback className={isCurrentUser ? 'bg-white text-purple-700' : 'bg-gray-100'}>
              {node.member.firstName[0]}{node.member.lastName[0]}
            </AvatarFallback>
          </Avatar>
        </foreignObject>

        {/* Name */}
        <text
          x="80"
          y="30"
          fill={isCurrentUser ? '#FFFFFF' : '#374151'}
          fontSize="14"
          fontWeight="600"
          className="pointer-events-none"
        >
          {node.member.firstName}
        </text>
        <text
          x="80"
          y="50"
          fill={isCurrentUser ? '#FFFFFF' : '#6B7280'}
          fontSize="12"
          className="pointer-events-none"
        >
          {node.member.lastName}
        </text>

        {/* Birth/Death dates */}
        <text
          x="80"
          y="70"
          fill={isCurrentUser ? '#E5E7EB' : '#9CA3AF'}
          fontSize="10"
          className="pointer-events-none"
        >
          {node.member.birthDate ? new Date(node.member.birthDate).getFullYear() : '?'}
          {node.member.deathDate ? ` - ${new Date(node.member.deathDate).getFullYear()}` : ''}
        </text>

        {/* Current user badge */}
        {isCurrentUser && (
          <foreignObject x="10" y="80" width="100" height="25">
            <Badge className="text-xs bg-white text-purple-700">You</Badge>
          </foreignObject>
        )}

        {/* Action buttons */}
        <g className="node-actions">
          {/* Edit button */}
          <g 
            onClick={(e) => handleEditNode(node, e)}
            className="cursor-pointer hover:opacity-80"
          >
            <circle
              cx={NODE_WIDTH - 45}
              cy="15"
              r="8"
              fill="#3B82F6"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-all duration-200"
            />
            <foreignObject x={NODE_WIDTH - 50} y="10" width="10" height="10">
              <Edit className="h-3 w-3 text-white" />
            </foreignObject>
          </g>

          {/* Delete button */}
          <g 
            onClick={(e) => handleDeleteNode(node, e)}
            className="cursor-pointer hover:opacity-80"
          >
            <circle
              cx={NODE_WIDTH - 30}
              cy="15"
              r="8"
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-all duration-200"
            />
            <foreignObject x={NODE_WIDTH - 35} y="10" width="10" height="10">
              <Trash2 className="h-3 w-3 text-white" />
            </foreignObject>
          </g>

          {/* Connection handle */}
          <g 
            onClick={(e) => handleStartConnection(node, e)}
            className="cursor-pointer hover:opacity-80"
          >
            <circle
              cx={NODE_WIDTH - 15}
              cy="15"
              r="8"
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-all duration-200"
            />
            <foreignObject x={NODE_WIDTH - 20} y="10" width="10" height="10">
              <Link className="h-3 w-3 text-white" />
            </foreignObject>
          </g>
        </g>
        </g>
      </g>
    );
  };

  const renderConnection = (connection: TreeConnection, index: number) => {
    const { from, to, type } = connection;
    
    const strokeColor = type === 'spouse' ? '#EF4444' : '#6B7280';
    const strokeWidth = type === 'spouse' ? 3 : 2;
    const strokeDashArray = type === 'spouse' ? '5,5' : 'none';

    return (
      <g key={`${from.id}-${to.id}-${index}`}>
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDashArray}
          className="cursor-pointer hover:opacity-70 transition-opacity"
          onClick={(e) => handleRemoveConnection(connection, e)}
        />
        {/* Remove button on connection */}
        <g
          transform={`translate(${(from.x + to.x) / 2 - 8}, ${(from.y + to.y) / 2 - 8})`}
          onClick={(e) => handleRemoveConnection(connection, e)}
          className="cursor-pointer hover:opacity-80"
        >
          <circle
            r="8"
            fill="#EF4444"
            stroke="#FFFFFF"
            strokeWidth="1"
            className="transition-all duration-200"
          />
          <foreignObject x="-4" y="-4" width="8" height="8">
            <X className="h-2 w-2 text-white" />
          </foreignObject>
        </g>
      </g>
    );
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Users className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Building Family Tree</h3>
        <p className="text-gray-500">Processing {members.length} family members...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-50 rounded-lg border overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleFitView}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Tree SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox={`${-800 * zoom + panX} ${-400 * zoom + panY} ${1600 * zoom} ${800 * zoom}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E5E7EB" strokeWidth="1" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Connections */}
        <g>
          {connections.map((connection, index) => renderConnection(connection, index))}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map(node => renderNode(node))}
        </g>

        {/* Dynamic connection line while connecting */}
        {isConnecting && connectionStart && (
          <line
            x1={connectionStart.x}
            y1={connectionStart.y}
            x2={mousePosition.x - 400} // Approximate SVG coordinate conversion
            y2={mousePosition.y - 300}
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="pointer-events-none"
          />
        )}
      </svg>

      {/* Info */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg p-3 shadow-sm border">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{nodes.length} members</span>
          <span>•</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          {isConnecting && (
            <>
              <span>•</span>
              <span className="text-green-600">Creating connection...</span>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <NodeEditDialog
        member={editingMember}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingMember(null);
        }}
        onSave={handleSaveEdit}
      />

      <NodeAddDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddMember}
      />
    </div>
  );
};

export default SimpleFamilyTree;
