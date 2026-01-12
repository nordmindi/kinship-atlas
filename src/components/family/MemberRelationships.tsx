
import React from 'react';
import { FamilyMember } from '@/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import { toast } from '@/hooks/use-toast';

interface MemberRelationshipsProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onRelationChange: () => void; // Callback to refresh data after a relation is removed
}

const MemberRelationships: React.FC<MemberRelationshipsProps> = ({ member, allMembers, onRelationChange }) => {
  const getRelativeName = (personId: string): string => {
    const relative = allMembers.find(m => m.id === personId);
    return relative ? `${relative.firstName} ${relative.lastName}` : "Unknown";
  };
  
  const handleRemoveRelation = async (relationId: string, relationType: string, relativeName: string) => {
    if (window.confirm(`Are you sure you want to remove this ${relationType} relationship with ${relativeName}?`)) {
      const result = await familyRelationshipManager.deleteRelationship(relationId);
      if (result.success) {
        toast({
          title: "Relationship Removed",
          description: `The ${relationType} relationship has been removed successfully.`
        });
        onRelationChange(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove relationship. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Group relations by type for better display
  const parents = member.relations.filter(rel => rel.type === 'parent');
  const children = member.relations.filter(rel => rel.type === 'child');
  const spouses = member.relations.filter(rel => rel.type === 'spouse');
  const siblings = member.relations.filter(rel => rel.type === 'sibling');
  
  // Helper to render a relationship list
  const renderRelationshipList = (relations: typeof member.relations, title: string) => (
    relations.length > 0 && (
      <div className="mb-4">
        <h3 className="text-md font-medium text-heritage-purple mb-2">{title}</h3>
        <ul className="space-y-2">
          {relations.map(relation => {
            const relativeName = getRelativeName(relation.personId);
            return (
              <li 
                key={relation.id} 
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-heritage-purple/20"
              >
                <div className="flex items-center gap-2">
                  <span>{relativeName}</span>
                  {relation.type === 'sibling' && relation.siblingType && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-0.5 ${
                        relation.siblingType === 'full' 
                          ? 'bg-purple-50 text-purple-700 border-purple-300' 
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {relation.siblingType === 'full' ? 'Full' : 'Half'}
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveRelation(relation.id, relation.type, relativeName)}
                  title={`Remove ${relation.type} relationship`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove relationship</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    )
  );
  
  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-3">Family Relationships</h2>
      
      {member.relations.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          No family relationships have been added yet.
        </p>
      ) : (
        <div>
          {renderRelationshipList(parents, "Parents")}
          {renderRelationshipList(siblings, "Siblings")}
          {renderRelationshipList(spouses, "Spouses")}
          {renderRelationshipList(children, "Children")}
        </div>
      )}
    </div>
  );
};

export default MemberRelationships;
