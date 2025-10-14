
import React from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Users, Baby, Heart } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface AddRelativeMenuProps {
  memberId: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: React.ReactNode;
}

const AddRelativeMenu: React.FC<AddRelativeMenuProps> = ({ 
  memberId, 
  placement = 'right',
  trigger
}) => {
  const navigate = useNavigate();

  const handleAddRelation = (type: 'parent' | 'child' | 'spouse' | 'sibling') => {
    navigate(`/add-relation/${memberId}/${type}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button 
            size="icon" 
            className="rounded-full bg-heritage-purple hover:bg-heritage-purple-dark"
            title="Add relative"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add relative</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-56" 
        align={placement === 'left' ? 'start' : placement === 'right' ? 'end' : undefined}
        side={placement}
      >
        <div className="space-y-2">
          <h4 className="font-medium text-sm mb-2">Add Relation</h4>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start" 
            onClick={() => handleAddRelation('parent')}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Parent
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddRelation('child')}
          >
            <Baby className="mr-2 h-4 w-4" />
            Add Child
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddRelation('spouse')}
          >
            <Heart className="mr-2 h-4 w-4" />
            Add Spouse
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddRelation('sibling')}
          >
            <Users className="mr-2 h-4 w-4" />
            Add Sibling
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AddRelativeMenu;
