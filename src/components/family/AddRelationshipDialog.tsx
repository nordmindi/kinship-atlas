import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  User, 
  UserPlus, 
  Heart, 
  Baby, 
  Users2,
  Plus,
  X,
  MapPin
} from 'lucide-react';
import { FamilyMember } from '@/types';
import { getFamilyMembers } from '@/services/supabaseService';
import { familyMemberService } from '@/services/familyMemberService';
import { familyRelationshipManager, resolveRelationshipDirection, RelationshipType } from '@/services/familyRelationshipManager';
import { getYearRange } from '@/utils/dateUtils';
import { toast } from '@/hooks/use-toast';

interface AddRelationshipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: FamilyMember;
  relationshipType: RelationshipType;
  onRelationshipAdded: () => void;
}

const AddRelationshipDialog: React.FC<AddRelationshipDialogProps> = ({
  isOpen,
  onClose,
  currentMember,
  relationshipType,
  onRelationshipAdded
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');

  // New member form state
  const [newMemberForm, setNewMemberForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    gender: 'other' as 'male' | 'female' | 'other'
  });

  useEffect(() => {
    if (isOpen) {
      loadAllMembers();
    }
  }, [isOpen]);

  const loadAllMembers = async () => {
    setIsLoading(true);
    try {
      const members = await getFamilyMembers();
      setAllMembers(members);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: "Error",
        description: "Failed to load family members.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRelationshipIcon = (type: RelationshipType) => {
    switch (type) {
      case 'parent': return <User className="h-4 w-4" />;
      case 'child': return <Baby className="h-4 w-4" />;
      case 'spouse': return <Heart className="h-4 w-4" />;
      case 'sibling': return <Users2 className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRelationshipTitle = (type: RelationshipType) => {
    switch (type) {
      case 'parent': return 'Add Parent';
      case 'child': return 'Add Child';
      case 'spouse': return 'Add Spouse';
      case 'sibling': return 'Add Sibling';
      default: return 'Add Relationship';
    }
  };

  // Filter members based on search and exclude current member and existing relationships
  const filteredMembers = allMembers.filter(member => {
    if (member.id === currentMember.id) return false;
    
    // Check if relationship already exists (bidirectional check)
    const currentMemberHasRelation = currentMember.relations.find(r => r.personId === member.id);
    const targetMemberHasRelation = member.relations.find(r => r.personId === currentMember.id);
    
    if (currentMemberHasRelation || targetMemberHasRelation) return false;
    
    if (!searchQuery) return true;
    
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const handleAddExistingMember = async (member: FamilyMember) => {
    setIsCreating(true);
    try {
      const direction = resolveRelationshipDirection(
        currentMember.id,
        member.id,
        relationshipType
      );

      const result = await familyRelationshipManager.createRelationshipSmart(
        direction.fromMemberId,
        direction.toMemberId,
        direction.relationshipType
      );

      if (result.success) {
        const effectiveRole = (result.actualRelationshipType ?? direction.selectedMemberRole) as RelationshipType;
        let successMessage: string;

        if (effectiveRole === 'spouse') {
          successMessage = `${member.firstName} ${member.lastName} and ${currentMember.firstName} ${currentMember.lastName} are now recorded as spouses.`;
        } else if (effectiveRole === 'sibling') {
          successMessage = `${member.firstName} ${member.lastName} has been added as sibling of ${currentMember.firstName} ${currentMember.lastName}.`;
        } else if (effectiveRole === 'parent') {
          successMessage = `${member.firstName} ${member.lastName} has been added as parent of ${currentMember.firstName} ${currentMember.lastName}.`;
        } else {
          successMessage = `${member.firstName} ${member.lastName} has been added as child of ${currentMember.firstName} ${currentMember.lastName}.`;
        }

        if (
          result.corrected &&
          result.actualRelationshipType &&
          result.actualRelationshipType !== direction.selectedMemberRole
        ) {
          successMessage += ' Direction was adjusted automatically based on birth dates.';
        }
        
        toast({
          title: "Success",
          description: successMessage,
        });
        
        onRelationshipAdded();
        onClose();
      } else {
        toast({
          title: "Failed to create relationship",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding relationship:', error);
      toast({
        title: "Error",
        description: `Failed to add ${relationshipType} relationship. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateNewMember = async () => {
    if (!newMemberForm.firstName || !newMemberForm.lastName) {
      toast({
        title: "Error",
        description: "First name and last name are required.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const memberData = {
        firstName: newMemberForm.firstName,
        lastName: newMemberForm.lastName,
        birthDate: newMemberForm.birthDate || undefined,
        deathDate: newMemberForm.deathDate || undefined,
        birthPlace: newMemberForm.birthPlace || undefined,
        gender: newMemberForm.gender,
      };

      const result = await familyMemberService.createFamilyMember(memberData);
      const newMember = result.success ? result.member : null;
      
      if (newMember) {
        // Add the relationship using the smart system
        const direction = resolveRelationshipDirection(
          currentMember.id,
          newMember.id,
          relationshipType
        );

        const relationshipResult = await familyRelationshipManager.createRelationshipSmart(
          direction.fromMemberId,
          direction.toMemberId,
          direction.relationshipType
        );

        if (relationshipResult.success) {
          const effectiveRole = (relationshipResult.actualRelationshipType ?? direction.selectedMemberRole) as RelationshipType;
          let successMessage: string;

          if (effectiveRole === 'spouse') {
            successMessage = `${newMember.firstName} ${newMember.lastName} and ${currentMember.firstName} ${currentMember.lastName} are now recorded as spouses.`;
          } else if (effectiveRole === 'sibling') {
            successMessage = `${newMember.firstName} ${newMember.lastName} has been added as sibling of ${currentMember.firstName} ${currentMember.lastName}.`;
          } else if (effectiveRole === 'parent') {
            successMessage = `${newMember.firstName} ${newMember.lastName} has been created and added as parent of ${currentMember.firstName} ${currentMember.lastName}.`;
          } else {
            successMessage = `${newMember.firstName} ${newMember.lastName} has been created and added as child of ${currentMember.firstName} ${currentMember.lastName}.`;
          }

          if (
            relationshipResult.corrected &&
            relationshipResult.actualRelationshipType &&
            relationshipResult.actualRelationshipType !== direction.selectedMemberRole
          ) {
            successMessage += ' Direction was adjusted automatically based on birth dates.';
          }
          
          toast({
            title: "Success",
            description: successMessage,
          });
          
          onRelationshipAdded();
          onClose();
        } else {
          toast({
            title: "Member created but relationship failed",
            description: relationshipResult.error,
            variant: "destructive"
          });
        }
        
        // Reset form
        setNewMemberForm({
          firstName: '',
          lastName: '',
          birthDate: '',
          deathDate: '',
          birthPlace: '',
          gender: 'other'
        });
      }
    } catch (error) {
      console.error('Error creating member:', error);
      toast({
        title: "Error",
        description: "Failed to create new family member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setActiveTab('existing');
    setNewMemberForm({
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      birthPlace: '',
      gender: 'other'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getRelationshipIcon(relationshipType)}
            {getRelationshipTitle(relationshipType)}
          </DialogTitle>
          <DialogDescription>
            Add a {relationshipType} for {currentMember.firstName} {currentMember.lastName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'new')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Member</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex-1 flex flex-col">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search family members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex-1 overflow-auto space-y-2">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading members...</p>
                  </div>
                ) : filteredMembers.length > 0 ? (
                  filteredMembers.map(member => (
                    <Card 
                      key={member.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleAddExistingMember(member)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-12 w-12 rounded-full bg-cover bg-center flex-shrink-0 border border-heritage-purple/20"
                            style={{ 
                              backgroundImage: member.avatar ? `url(${member.avatar})` : 'none',
                              backgroundColor: !member.avatar ? '#e9e2f5' : undefined
                            }}
                          >
                            {!member.avatar && (
                              <div className="w-full h-full flex items-center justify-center text-heritage-purple">
                                <User className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-heritage-dark">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-heritage-neutral">
                              {getYearRange(member.birthDate, member.deathDate)}
                            </div>
                            {member.birthPlace && (
                              <div className="text-xs text-heritage-neutral flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {member.birthPlace}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isCreating}
                            className="h-8 px-3"
                            onClick={() => handleAddExistingMember(member)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {isCreating ? 'Adding...' : 'Add'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No matching members found' : 'No other family members available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="new" className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newMemberForm.firstName}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newMemberForm.lastName}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="birthDate">Birth Date</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={newMemberForm.birthDate}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, birthDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="deathDate">Death Date</Label>
                  <Input
                    id="deathDate"
                    type="date"
                    value={newMemberForm.deathDate}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, deathDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="birthPlace">Birth Place</Label>
                <Input
                  id="birthPlace"
                  value={newMemberForm.birthPlace}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, birthPlace: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={newMemberForm.gender}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleCreateNewMember}
                  disabled={isCreating || !newMemberForm.firstName || !newMemberForm.lastName}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : `Create & Add as ${relationshipType}`}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddRelationshipDialog;
