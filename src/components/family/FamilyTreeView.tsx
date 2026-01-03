
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyMember } from '@/types';
import FamilyMemberCard from './FamilyMemberCard';

interface FamilyTreeViewProps {
  members: FamilyMember[];
  currentMemberId: string;
  onSelectMember: (memberId: string) => void;
  onMemberDeleted?: () => void;
  onRelationshipRemoved?: () => void;
}

const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({
  members,
  currentMemberId,
  onSelectMember,
  onMemberDeleted,
  onRelationshipRemoved,
}) => {
  const navigate = useNavigate();
  const [focusedMember, setFocusedMember] = useState<FamilyMember | null>(null);
  const [relatives, setRelatives] = useState<{
    parents: FamilyMember[];
    siblings: FamilyMember[];
    spouses: FamilyMember[];
    children: FamilyMember[];
  }>({
    parents: [],
    siblings: [],
    spouses: [],
    children: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentMemberId || currentMemberId.trim() === '') {
      setFocusedMember(null);
      setRelatives({ parents: [], siblings: [], spouses: [], children: [] });
      return;
    }

    const current = members.find(m => m.id === currentMemberId);
    if (current) {
      setFocusedMember(current);
      
      // Find relatives
      const parents: FamilyMember[] = [];
      const siblings: FamilyMember[] = [];
      const spouses: FamilyMember[] = [];
      const children: FamilyMember[] = [];
      
      // Get parents
      current.relations
        .filter(r => r.type === 'parent')
        .forEach(relation => {
          const parent = members.find(m => m.id === relation.personId);
          if (parent) parents.push(parent);
        });
      
      // Get spouses
      current.relations
        .filter(r => r.type === 'spouse')
        .forEach(relation => {
          const spouse = members.find(m => m.id === relation.personId);
          if (spouse) spouses.push(spouse);
        });
      
      // Get children
      current.relations
        .filter(r => r.type === 'child')
        .forEach(relation => {
          const child = members.find(m => m.id === relation.personId);
          if (child) children.push(child);
        });
      
      // Get siblings (people who share the same parents)
      if (parents.length > 0) {
        parents.forEach(parent => {
          parent.relations
            .filter(r => r.type === 'parent' && r.personId !== current.id)
            .forEach(relation => {
              const sibling = members.find(m => m.id === relation.personId);
              if (sibling && !siblings.some(s => s.id === sibling.id)) {
                siblings.push(sibling);
              }
            });
        });
      }
      
      setRelatives({ parents, siblings, spouses, children });
    } else {
      setFocusedMember(null);
      setRelatives({ parents: [], siblings: [], spouses: [], children: [] });
    }
  }, [currentMemberId, members]);

  // This function would handle a custom SVG tree visualization in a real app
  // For now we'll use a simpler approach with cards in sections

  // Show all family members when no member is selected
  if (!focusedMember) {
    return (
      <div className="p-4" ref={containerRef}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <h2 className="text-lg font-medium text-heritage-dark mb-4">All Family Members</h2>
            {members.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {members.map(member => (
                  <FamilyMemberCard 
                    key={member.id} 
                    member={member}
                    onClick={() => {
                      onSelectMember(member.id);
                      navigate(`/family-member/${member.id}`);
                    }}
                    onMemberDeleted={onMemberDeleted}
                    onRelationshipRemoved={onRelationshipRemoved}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No family members found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" ref={containerRef}>
      <div className="space-y-6 max-w-md mx-auto">
        {/* Focused Member */}
        {focusedMember && (
          <div className="animate-scale-in">
            <h2 className="text-lg font-medium text-heritage-dark mb-3">Current Profile</h2>
            <FamilyMemberCard 
              member={focusedMember} 
              detailed 
              onClick={() => navigate(`/family-member/${focusedMember.id}`)}
            />
          </div>
        )}
        
        {/* Parents */}
        {relatives.parents.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-medium text-heritage-dark mb-3">Parents</h2>
            <div className="grid grid-cols-2 gap-4">
              {relatives.parents.map(parent => (
                <FamilyMemberCard 
                  key={parent.id} 
                  member={parent}
                  currentMember={focusedMember}
                  relationshipType="parent"
                  onClick={() => navigate(`/family-member/${parent.id}`)}
                  onMemberDeleted={onMemberDeleted}
                  onRelationshipRemoved={onRelationshipRemoved}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Siblings */}
        {relatives.siblings.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-medium text-heritage-dark mb-3">Siblings</h2>
            <div className="grid grid-cols-2 gap-4">
              {relatives.siblings.map(sibling => (
                <FamilyMemberCard 
                  key={sibling.id} 
                  member={sibling}
                  currentMember={focusedMember}
                  relationshipType="sibling"
                  onClick={() => navigate(`/family-member/${sibling.id}`)}
                  onMemberDeleted={onMemberDeleted}
                  onRelationshipRemoved={onRelationshipRemoved}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Spouses */}
        {relatives.spouses.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-medium text-heritage-dark mb-3">Spouse</h2>
            <div className="grid grid-cols-2 gap-4">
              {relatives.spouses.map(spouse => (
                <FamilyMemberCard 
                  key={spouse.id} 
                  member={spouse}
                  currentMember={focusedMember}
                  relationshipType="spouse"
                  onClick={() => navigate(`/family-member/${spouse.id}`)}
                  onMemberDeleted={onMemberDeleted}
                  onRelationshipRemoved={onRelationshipRemoved}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Children */}
        {relatives.children.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-medium text-heritage-dark mb-3">Children</h2>
            <div className="grid grid-cols-2 gap-4">
              {relatives.children.map(child => (
                <FamilyMemberCard 
                  key={child.id} 
                  member={child}
                  currentMember={focusedMember}
                  relationshipType="child"
                  onClick={() => navigate(`/family-member/${child.id}`)}
                  onMemberDeleted={onMemberDeleted}
                  onRelationshipRemoved={onRelationshipRemoved}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Add new relative button */}
        <div className="pt-4">
          <button className="w-full py-3 px-4 border-2 border-dashed border-heritage-purple/30 rounded-lg text-heritage-purple hover:bg-heritage-purple-light/30 transition-colors">
            + Add Family Member
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilyTreeView;
