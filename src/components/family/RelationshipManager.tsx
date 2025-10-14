/**
 * Relationship Manager Component
 * 
 * A simplified, user-friendly interface for managing family relationships
 * with clear validation and helpful suggestions.
 */

import React, { useState, useEffect } from 'react';
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
  Users2
} from 'lucide-react';
import { toast } from 'sonner';

interface RelationshipManagerProps {
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onRelationshipChanged: () => void;
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
  onRelationshipChanged
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType>('parent');
  const [isCreating, setIsCreating] = useState(false);
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Load relationship suggestions
  useEffect(() => {
    loadSuggestions();
  }, [currentMember.id]);

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const relationshipSuggestions = await familyRelationshipManager.getRelationshipSuggestions(currentMember.id);
      setSuggestions(relationshipSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

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

  const availableMembers = allMembers.filter(member => 
    member.id !== currentMember.id && 
    !currentMember.relations?.some(rel => rel.personId === member.id) &&
    !member.relations?.some(rel => rel.personId === currentMember.id)
  );

  return (
    <div className="space-y-6">
      {/* Current Relationships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentMember.relations && currentMember.relations.length > 0 ? (
            <div className="space-y-3">
              {currentMember.relations.map((relation) => (
                <div key={relation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getRelationshipIcon(relation.type)}
                    <div>
                      <p className="font-medium">
                        {relation.person?.firstName} {relation.person?.lastName}
                      </p>
                      <Badge className={getRelationshipColor(relation.type)}>
                        {relation.type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRelationship(
                      relation.id, 
                      `${relation.person?.firstName} ${relation.person?.lastName}`
                    )}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No relationships added yet</p>
              <p className="text-sm">Add family members to build your family tree</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Relationship Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
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
              <Select onValueChange={(value) => {
                const member = availableMembers.find(m => m.id === value);
                setSelectedMember(member || null);
              }}>
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

      {/* Relationship Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Suggested Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.slice(0, 5).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getRelationshipIcon(suggestion.suggestedRelationship)}
                    <div>
                      <p className="font-medium">
                        {suggestion.member.firstName} {suggestion.member.lastName}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={getRelationshipColor(suggestion.suggestedRelationship)}>
                          {suggestion.suggestedRelationship}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
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
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RelationshipManager;
