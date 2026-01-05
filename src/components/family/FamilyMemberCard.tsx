
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FamilyMember } from '@/types';
import { calculateAge } from '@/utils/dateUtils';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PermissionIndicator, BranchIndicator } from '@/components/ui/permission-indicator';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import FamilyMemberActions from './FamilyMemberActions';

interface FamilyMemberCardProps {
  member: FamilyMember;
  onClick?: () => void;
  detailed?: boolean;
  currentMember?: FamilyMember;
  relationshipType?: 'parent' | 'child' | 'spouse' | 'sibling';
  onMemberDeleted?: () => void;
  onRelationshipRemoved?: () => void;
}

const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({ 
  member, 
  onClick,
  detailed = false,
  currentMember,
  relationshipType,
  onMemberDeleted,
  onRelationshipRemoved
}) => {
  const { user, isAdmin } = useAuth();
  const { canEditFamilyMember } = usePermissions();
  const [canEdit, setCanEdit] = React.useState(false);
  
  const age = member.birthDate ? calculateAge(member.birthDate, member.deathDate) : null;
  const isDeceased = !!member.deathDate;

  // Check permissions
  React.useEffect(() => {
    const checkPermissions = async () => {
      if (user) {
        const editPermission = await canEditFamilyMember(member.id);
        setCanEdit(editPermission);
      }
    };
    checkPermissions();
  }, [member.id, user, canEditFamilyMember]);
  
  return (
    <Card 
      className={`overflow-hidden transition-all hover:shadow-md ${isDeceased ? 'bg-muted/50' : 'bg-white'}`}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex flex-col items-center gap-3">
          {/* Avatar Section */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden relative">
              {member.avatar ? (
                <img 
                  src={member.avatar} 
                  alt={`${member.firstName} ${member.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-heritage-purple-light text-heritage-purple text-2xl font-medium">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
              )}
              
              {isDeceased && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-full">
                  <Badge variant="secondary" className="bg-white/70 text-heritage-dark text-xs">
                    {member.deathDate ? member.deathDate.substring(0, 4) : 'Deceased'}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Actions Menu - positioned absolutely over avatar */}
            {currentMember && (
              <div className="absolute -top-1 -right-1">
                <FamilyMemberActions
                  member={member}
                  currentMember={currentMember}
                  relationshipType={relationshipType}
                  onMemberDeleted={onMemberDeleted}
                  onRelationshipRemoved={onRelationshipRemoved}
                />
              </div>
            )}
          </div>
          
          {/* Name and Info Section */}
          <div className="text-center w-full">
            <h3 className="font-medium text-heritage-dark leading-tight">
              {member.firstName} {member.lastName}
            </h3>
            {age !== null && (
              <p className="text-xs text-muted-foreground">
                {isDeceased ? `${member.birthDate?.substring(0, 4)} - ${member.deathDate?.substring(0, 4)}` : `Age ${age}`}
              </p>
            )}
            
            {/* Location - shown even when not detailed */}
            {member.currentLocation && (
              <div className="flex items-center justify-center text-xs text-muted-foreground gap-1 mt-1">
                <MapPin size={10} />
                <span className="line-clamp-1">{member.currentLocation.description}</span>
              </div>
            )}
            
            {/* Permission and Branch Indicators */}
            <div className="flex justify-center items-center gap-2 mt-2">
              <PermissionIndicator
                canEdit={canEdit}
                isAdmin={isAdmin}
                memberCreatedBy={member.createdBy}
                currentUserId={user?.id}
                className="text-xs"
              />
              <BranchIndicator
                isRootMember={member.isRootMember}
                branchRoot={member.branchRoot}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      {detailed && (
        <CardContent className="p-3 pt-2">
          {member.currentLocation && (
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <MapPin size={12} />
              <span>{member.currentLocation.description}</span>
            </div>
          )}
          
          {member.bio && (
            <p className="text-sm mt-2 line-clamp-2 text-heritage-dark">
              {member.bio}
            </p>
          )}
        </CardContent>
      )}
      
      {onClick && (
        <CardFooter className="p-3 pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-heritage-purple hover:text-heritage-purple-dark hover:bg-heritage-purple-light/50"
            disabled={!canEdit && !isAdmin}
          >
            {canEdit || isAdmin ? 'View & Edit Profile' : 'View Profile'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default FamilyMemberCard;
