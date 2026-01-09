/**
 * Relationship Manager Component
 * 
 * A simplified, user-friendly interface for managing family relationships
 * with clear validation and helpful suggestions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FamilyMember } from '@/types';
import { familyRelationshipManager, RelationshipType, resolveRelationshipDirection } from '@/services/familyRelationshipManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Heart,
  Baby,
  UserCheck,
  Users2,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

interface RelationshipManagerProps {
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onRelationshipChanged: () => void;
  canAddRelationship?: boolean;
}

interface RelationshipSuggestion {
  member: FamilyMember;
  suggestedRelationship: RelationshipType;
  confidence: number;
  reason: string;
}

const buildRelationshipSuccessMessage = (
  selectedRole: RelationshipType,
  currentMember: FamilyMember,
  selectedMember: FamilyMember,
  wasCorrected: boolean
): string => {
  const currentName = `${currentMember.firstName} ${currentMember.lastName}`;
  const selectedName = `${selectedMember.firstName} ${selectedMember.lastName}`;
  let baseMessage: string;

  switch (selectedRole) {
    case 'parent':
      baseMessage = `${selectedName} has been added as parent of ${currentName}.`;
      break;
    case 'child':
      baseMessage = `${selectedName} has been added as child of ${currentName}.`;
      break;
    case 'spouse':
      baseMessage = `${currentName} and ${selectedName} are now recorded as spouses.`;
      break;
    case 'sibling':
    default:
      baseMessage = `${selectedName} has been added as sibling of ${currentName}.`;
      break;
  }

  if (wasCorrected) {
    return `${baseMessage} Direction was adjusted automatically based on birth dates.`;
  }

  return baseMessage;
};

const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  currentMember,
  allMembers,
  onRelationshipChanged,
  canAddRelationship = true
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType>('parent');
  const [isCreating, setIsCreating] = useState(false);
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const loadSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const relationshipSuggestions = await familyRelationshipManager.getRelationshipSuggestions(currentMember.id);
      setSuggestions(relationshipSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [currentMember.id]);

  // Load relationship suggestions
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleCreateRelationship = async () => {
    if (!selectedMember) return;

    setIsCreating(true);
    try {
      const direction = resolveRelationshipDirection(
        currentMember.id,
        selectedMember.id,
        selectedRelationshipType
      );

      const result = await familyRelationshipManager.createRelationshipSmart(
        direction.fromMemberId,
        direction.toMemberId,
        direction.relationshipType
      );

      if (result.success) {
        const effectiveRole = (result.actualRelationshipType ?? direction.selectedMemberRole) as RelationshipType;
        const wasCorrected =
          Boolean(
            result.corrected &&
            result.actualRelationshipType &&
            result.actualRelationshipType !== direction.selectedMemberRole
          );
        const successMessage = buildRelationshipSuccessMessage(
          effectiveRole,
          currentMember,
          selectedMember,
          wasCorrected
        );

        if (successMessage) {
          toast.success('Relationship created successfully', {
            description: successMessage
          });
        } else {
          toast.success('Relationship created successfully');
        }

        setIsAddDialogOpen(false);
        setSelectedMember(null);
        onRelationshipChanged();
        loadSuggestions(); // Refresh suggestions
      } else {
        toast.error('Failed to create relationship', {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Error creating relationship:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRelationship = async (relationshipId: string, memberName: string) => {
    try {
      const result = await familyRelationshipManager.deleteRelationship(relationshipId);
      
      if (result.success) {
        toast.success('Relationship deleted', {
          description: `Relationship with ${memberName} has been removed`
        });
        onRelationshipChanged();
        loadSuggestions(); // Refresh suggestions
      } else {
        toast.error('Failed to delete relationship', {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Error deleting relationship:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleBulkAddRelationships = async () => {
    if (selectedSuggestions.size === 0) return;

    setIsBulkAdding(true);
    const selectedIndices = Array.from(selectedSuggestions);
    const selectedSuggestionObjects = selectedIndices.map(index => suggestions[index]);
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const suggestion of selectedSuggestionObjects) {
      try {
        const direction = resolveRelationshipDirection(
          currentMember.id,
          suggestion.member.id,
          suggestion.suggestedRelationship
        );

        const result = await familyRelationshipManager.createRelationshipSmart(
          direction.fromMemberId,
          direction.toMemberId,
          direction.relationshipType
        );

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${suggestion.member.firstName} ${suggestion.member.lastName}: ${result.error}`);
        }
      } catch (error) {
        failCount++;
        errors.push(`${suggestion.member.firstName} ${suggestion.member.lastName}: An unexpected error occurred`);
        console.error('Error creating relationship:', error);
      }
    }

    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      toast.success(`Successfully added ${successCount} relationship${successCount > 1 ? 's' : ''}`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`Added ${successCount} relationship${successCount > 1 ? 's' : ''}, ${failCount} failed`, {
        description: errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : '')
      });
    } else {
      toast.error(`Failed to add ${failCount} relationship${failCount > 1 ? 's' : ''}`, {
        description: errors.slice(0, 3).join('; ') + (errors.length > 3 ? '...' : '')
      });
    }

    setSelectedSuggestions(new Set());
    onRelationshipChanged();
    loadSuggestions(); // Refresh suggestions
    setIsBulkAdding(false);
  };

  const toggleSuggestionSelection = (index: number) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const highConfidenceSuggestions = suggestions.filter(s => s.confidence >= 0.8);
  const hasHighConfidenceSuggestions = highConfidenceSuggestions.length > 0;

  const getRelationshipIcon = (type: RelationshipType) => {
    switch (type) {
      case 'parent':
        return <UserCheck className="h-4 w-4" />;
      case 'child':
        return <Baby className="h-4 w-4" />;
      case 'spouse':
        return <Heart className="h-4 w-4" />;
      case 'sibling':
        return <Users2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRelationshipColor = (type: RelationshipType) => {
    switch (type) {
      case 'parent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'child':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'spouse':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'sibling':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get the connected family member's name
  const getConnectedMemberName = (relation: any): string => {
    // First try to get from relation.person (if populated)
    if (relation.person?.firstName && relation.person?.lastName) {
      return `${relation.person.firstName} ${relation.person.lastName}`;
    }
    // Fallback to looking up in allMembers using personId
    const connectedMember = allMembers.find(m => m.id === relation.personId);
    if (connectedMember) {
      return `${connectedMember.firstName} ${connectedMember.lastName}`;
    }
    // Last resort
    return 'Unknown';
  };

  const availableMembers = allMembers.filter(member => 
    member.id !== currentMember.id && 
    !currentMember.relations?.some(rel => rel.personId === member.id) &&
    !member.relations?.some(rel => rel.personId === currentMember.id)
  );

  return (
    <div className="space-y-8">
      {/* Current Relationships */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Users className="h-6 w-6" />
            Current Relationships
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {currentMember.relations && currentMember.relations.length > 0 ? (
            <div className="space-y-4">
              {currentMember.relations.map((relation) => {
                const connectedMemberName = getConnectedMemberName(relation);
                return (
                  <div key={relation.id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-gray-50">
                        {getRelationshipIcon(relation.type)}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-gray-900">
                            {connectedMemberName}
                          </p>
                        </div>
                        <Badge className={`${getRelationshipColor(relation.type)} px-3 py-1 text-sm font-medium whitespace-nowrap`}>
                          {relation.type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRelationship(
                        relation.id, 
                        connectedMemberName
                      )}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <p className="text-lg font-medium mb-2">No relationships added yet</p>
              <p className="text-sm">Add family members to build your family tree</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Relationship Dialog */}
      {canAddRelationship && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full py-3 text-base">
              <UserPlus className="h-5 w-5 mr-2" />
              Add Relationship
            </Button>
          </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Relationship</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="member-select">Family Member</Label>
              <Select 
                value={selectedMember?.id || ''} 
                onValueChange={(value) => {
                  const member = availableMembers.find(m => m.id === value);
                  setSelectedMember(member || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a family member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                      {member.birthDate && (
                        <span className="text-muted-foreground ml-2">
                          (b. {new Date(member.birthDate).getFullYear()})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="relationship-select">Relationship Type</Label>
              <Select value={selectedRelationshipType} onValueChange={(value) => setSelectedRelationshipType(value as RelationshipType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Parent
                    </div>
                  </SelectItem>
                  <SelectItem value="child">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4" />
                      Child
                    </div>
                  </SelectItem>
                  <SelectItem value="spouse">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Spouse
                    </div>
                  </SelectItem>
                  <SelectItem value="sibling">
                    <div className="flex items-center gap-2">
                      <Users2 className="h-4 w-4" />
                      Sibling
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleCreateRelationship}
              disabled={!selectedMember || isCreating}
              className="w-full"
            >
              {isCreating ? 'Creating...' : 'Create Relationship'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Relationship Suggestions */}
      {suggestions.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Info className="h-6 w-6" />
                Suggested Relationships
              </CardTitle>
              {hasHighConfidenceSuggestions && selectedSuggestions.size > 0 && (
                <Button
                  onClick={handleBulkAddRelationships}
                  disabled={isBulkAdding}
                  className="ml-auto"
                  variant="default"
                >
                  {isBulkAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding {selectedSuggestions.size}...
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Bulk Add ({selectedSuggestions.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {suggestions.slice(0, 5).map((suggestion, index) => {
                const isHighConfidence = suggestion.confidence >= 0.8;
                const isSelected = selectedSuggestions.has(index);
                
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-4 border rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md transition-shadow ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {isHighConfidence && (
                        <button
                          onClick={() => toggleSuggestionSelection(index)}
                          className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors"
                          disabled={isBulkAdding}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                      <div className="p-2 rounded-lg bg-blue-100">
                        {getRelationshipIcon(suggestion.suggestedRelationship)}
                      </div>
                      <div className="space-y-2 flex-1">
                        <p className="font-semibold text-lg">
                          {suggestion.member.firstName} {suggestion.member.lastName}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getRelationshipColor(suggestion.suggestedRelationship)} px-3 py-1`}>
                            {suggestion.suggestedRelationship}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-1 ${
                              isHighConfidence 
                                ? 'bg-green-50 text-green-700 border-green-300' 
                                : 'bg-white'
                            }`}
                          >
                            {Math.round(suggestion.confidence * 100)}% confidence
                            {isHighConfidence && ' ✓'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(suggestion.member);
                        setSelectedRelationshipType(suggestion.suggestedRelationship);
                        setIsAddDialogOpen(true);
                      }}
                      className="px-4 py-2"
                      disabled={isBulkAdding}
                    >
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>
            {hasHighConfidenceSuggestions && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  High-confidence suggestions (≥80%) can be selected for bulk add
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RelationshipManager;
