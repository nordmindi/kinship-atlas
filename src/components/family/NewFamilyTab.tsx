/**
 * New Family Tab Component
 * 
 * A completely redesigned, simplified family management interface
 * that replaces the complex drag-to-connect system with a clear,
 * user-friendly approach.
 */

import React, { useState, useEffect } from 'react';
import { FamilyMember } from '@/types';
import { familyMemberService } from '@/services/familyMemberService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import RelationshipManager from './RelationshipManager';
import AddFamilyMemberForm from './AddFamilyMemberForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface NewFamilyTabProps {
  currentMember: FamilyMember;
  onMemberChanged: () => void;
}

const NewFamilyTab: React.FC<NewFamilyTabProps> = ({
  currentMember,
  onMemberChanged
}) => {
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  // Load all family members
  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const members = await familyMemberService.getAllFamilyMembers();
      setAllMembers(members);
    } catch (error) {
      console.error('Error loading family members:', error);
      setError('Failed to load family members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberCreated = (newMember: FamilyMember) => {
    setAllMembers(prev => [...prev, newMember]);
    setShowAddMemberForm(false);
    onMemberChanged();
    toast.success('Family member created successfully');
  };

  const handleRelationshipChanged = () => {
    loadFamilyMembers(); // Refresh to get updated relationships
    onMemberChanged();
  };

  const getRelationshipCounts = () => {
    const relations = currentMember.relations || [];
    return {
      parents: relations.filter(r => r.type === 'parent').length,
      children: relations.filter(r => r.type === 'child').length,
      spouses: relations.filter(r => r.type === 'spouse').length,
      siblings: relations.filter(r => r.type === 'sibling').length
    };
  };

  const counts = getRelationshipCounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading family members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadFamilyMembers}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-heritage-dark">
            {currentMember.firstName} {currentMember.lastName}'s Family
          </h2>
          <p className="text-muted-foreground">
            Manage family relationships and add new members
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadFamilyMembers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddMemberForm(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Family Member
          </Button>
        </div>
      </div>

      {/* Relationship Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{counts.parents}</div>
              <div className="text-sm text-muted-foreground">Parents</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{counts.children}</div>
              <div className="text-sm text-muted-foreground">Children</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{counts.spouses}</div>
              <div className="text-sm text-muted-foreground">Spouses</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{counts.siblings}</div>
              <div className="text-sm text-muted-foreground">Siblings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="relationships" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="relationships">Manage Relationships</TabsTrigger>
          <TabsTrigger value="members">All Family Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="relationships" className="space-y-4">
          <RelationshipManager
            currentMember={currentMember}
            allMembers={allMembers}
            onRelationshipChanged={handleRelationshipChanged}
          />
        </TabsContent>
        
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Family Members ({allMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {allMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMembers.map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-heritage-purple-light flex items-center justify-center text-heritage-purple font-medium">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {member.firstName} {member.lastName}
                          </h3>
                          {member.birthDate && (
                            <p className="text-sm text-muted-foreground">
                              Born {new Date(member.birthDate).getFullYear()}
                            </p>
                          )}
                          <div className="flex gap-1 mt-1">
                            {member.relations?.map((rel, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {rel.type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No family members found</p>
                  <p className="text-sm">Add your first family member to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Form Dialog */}
      {showAddMemberForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AddFamilyMemberForm
              onSuccess={handleMemberCreated}
              onCancel={() => setShowAddMemberForm(false)}
            />
          </div>
        </div>
      )}

      {/* Helpful Tips */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips for managing family relationships:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Add family members first, then create relationships between them</li>
            <li>• Birth dates help validate parent-child relationships</li>
            <li>• The system will suggest likely relationships based on ages</li>
            <li>• You can always edit or remove relationships later</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NewFamilyTab;
