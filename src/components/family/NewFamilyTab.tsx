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
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-heritage-dark">
            {currentMember.firstName} {currentMember.lastName}'s Family
          </h2>
          <p className="text-lg text-muted-foreground">
            Manage family relationships and add new members
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={loadFamilyMembers}
            disabled={isLoading}
            className="px-4 py-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddMemberForm(true)} className="px-4 py-2">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Family Member
          </Button>
        </div>
      </div>

      {/* Relationship Summary */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Users className="h-6 w-6" />
            Family Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 border rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-green-600 mb-2">{counts.parents}</div>
              <div className="text-sm font-medium text-green-700">Parents</div>
            </div>
            <div className="text-center p-6 border rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-blue-600 mb-2">{counts.children}</div>
              <div className="text-sm font-medium text-blue-700">Children</div>
            </div>
            <div className="text-center p-6 border rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-pink-600 mb-2">{counts.spouses}</div>
              <div className="text-sm font-medium text-pink-700">Spouses</div>
            </div>
            <div className="text-center p-6 border rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-purple-600 mb-2">{counts.siblings}</div>
              <div className="text-sm font-medium text-purple-700">Siblings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="relationships" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-auto">
          <TabsTrigger value="relationships" className="text-sm py-2 px-4">Manage Relationships</TabsTrigger>
          <TabsTrigger value="members" className="text-sm py-2 px-4">All Family Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="relationships" className="space-y-6">
          <RelationshipManager
            currentMember={currentMember}
            allMembers={allMembers}
            onRelationshipChanged={handleRelationshipChanged}
          />
        </TabsContent>
        
        <TabsContent value="members" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">All Family Members ({allMembers.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {allMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allMembers.map((member) => (
                    <Card key={member.id} className="p-6 hover:shadow-md transition-shadow border-l-4 border-l-heritage-purple">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-heritage-purple-light flex items-center justify-center text-heritage-purple font-semibold text-lg">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-lg">
                            {member.firstName} {member.lastName}
                          </h3>
                          {member.birthDate && (
                            <p className="text-sm text-muted-foreground">
                              Born {new Date(member.birthDate).getFullYear()}
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {member.relations?.map((rel, index) => (
                              <Badge key={index} variant="outline" className="text-xs px-2 py-1">
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
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <p className="text-lg font-medium mb-2">No family members found</p>
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
      <Alert className="border-l-4 border-l-blue-500 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong className="text-lg">Tips for managing family relationships:</strong>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Add family members first, then create relationships between them</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Birth dates help validate parent-child relationships</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>The system will suggest likely relationships based on ages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>You can always edit or remove relationships later</span>
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NewFamilyTab;
