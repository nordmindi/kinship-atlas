
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FamilyMemberNode } from "./types";
import { calculateAge } from "@/utils/dateUtils";
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, Edit, UserPlus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FamilyMemberDetailProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMemberNode | null;
  onViewProfile: () => void;
  onEdit: () => void;
  onAddRelative: (memberId?: string) => void;
  isCurrentUser: boolean;
}

const FamilyMemberDetail: React.FC<FamilyMemberDetailProps> = ({ 
  isOpen, 
  onClose, 
  member, 
  onViewProfile, 
  onEdit,
  onAddRelative,
  isCurrentUser 
}) => {
  const navigate = useNavigate();
  
  if (!isOpen || !member || !member.data) return null;
  
  const data = member.data;
  const age = data.birthDate ? calculateAge(data.birthDate, data.deathDate) : null;
  const isDeceased = !!data.deathDate;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <DialogTitle className="text-xl font-semibold">
        {`${data.firstName} ${data.lastName}`}
        {isCurrentUser && <span className="text-heritage-purple ml-2">(You)</span>}
      </DialogTitle>
      <DialogDescription>
        View details and manage relationships
      </DialogDescription>
      <div className="flex flex-col items-center mt-4">
        <Avatar className={`h-24 w-24 mb-4 ${isCurrentUser ? "ring-2 ring-heritage-purple" : ""}`}>
          <AvatarImage src={data.avatar} alt={`${data.firstName} ${data.lastName}`} />
          <AvatarFallback className={isCurrentUser ? "bg-heritage-purple text-white" : ""}>
            {data.firstName[0]}{data.lastName[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center mt-1 mb-4">
          <Badge variant={isDeceased ? "outline" : "secondary"} className="mr-2">
            {isDeceased ? "Deceased" : "Living"}
          </Badge>
          {age !== null && (
            <span className="text-sm text-muted-foreground">
              {isDeceased 
                ? `${data.birthDate?.substring(0, 4)} - ${data.deathDate?.substring(0, 4)}` 
                : `Age: ${age}`}
            </span>
          )}
        </div>

        <div className="w-full space-y-4">
          {data.relationship && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground">Relationship</h4>
              <p>{data.relationship}</p>
            </div>
          )}
          
          {data.currentLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{data.currentLocation.description}</span>
            </div>
          )}

          {data.bio && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Bio</h4>
              <p className="text-sm">{data.bio}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 w-full">
          <Button onClick={onViewProfile} className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            View Profile
          </Button>
          
          <Button variant="outline" onClick={() => onAddRelative(data.id)} className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            Add Relation
          </Button>
          
          <Button variant="secondary" onClick={onEdit} className="flex items-center gap-1">
            <Edit className="h-4 w-4" />
            Edit Details
          </Button>
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FamilyMemberDetail;
