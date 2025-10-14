
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TreeNodeData } from "./types";
import { calculateAge } from "@/utils/dateUtils";
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface NodeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TreeNodeData;
  onViewProfile: () => void;
  isCurrentUser: boolean;
}

const TreeNodeDetail: React.FC<NodeDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  member, 
  onViewProfile, 
  isCurrentUser 
}) => {
  if (!isOpen) return null;

  const age = member.birthDate ? calculateAge(member.birthDate, member.deathDate) : null;
  const isDeceased = !!member.deathDate;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <DialogTitle className="text-xl font-semibold">
        {`${member.firstName} ${member.lastName}`}
      </DialogTitle>
      <DialogDescription>
        View details and relationships
      </DialogDescription>
      <div className="flex flex-col items-center mt-4">
        {member.avatar ? (
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} />
            <AvatarFallback className={isCurrentUser ? "bg-heritage-purple text-white" : ""}>
              {member.firstName[0]}{member.lastName[0]}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className={`h-24 w-24 mb-4 ${isCurrentUser ? "bg-heritage-purple" : "bg-heritage-purple-light"}`}>
            <AvatarFallback className={isCurrentUser ? "text-white" : "text-heritage-purple"}>
              {member.firstName[0]}{member.lastName[0]}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex items-center mt-1 mb-4">
          <Badge variant={isDeceased ? "outline" : "secondary"} className="mr-2">
            {isDeceased ? "Deceased" : "Living"}
          </Badge>
          {age !== null && (
            <span className="text-sm text-muted-foreground">
              {isDeceased 
                ? `${member.birthDate?.substring(0, 4)} - ${member.deathDate?.substring(0, 4)}` 
                : `Age: ${age}`}
            </span>
          )}
        </div>

        <div className="w-full">
          {member.relationship && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground">Relationship</h4>
              <p>{member.relationship}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 w-full">
          <Button className="flex-1" onClick={onViewProfile}>
            View Full Profile
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TreeNodeDetail;
