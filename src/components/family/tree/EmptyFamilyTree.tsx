
import React from 'react';
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const EmptyFamilyTree: React.FC = () => {
  const navigate = useNavigate();

  const handleAddFamilyMember = () => {
    navigate('/add-family-member');
  };

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
      <div className="rounded-full bg-heritage-purple-light p-6">
        <Users className="h-12 w-12 text-heritage-purple" />
      </div>
      <h2 className="text-xl font-medium">No Family Members Yet</h2>
      <p className="text-muted-foreground max-w-sm">
        Start building your family tree by adding your first family member
      </p>
      <Button 
        onClick={handleAddFamilyMember} 
        className="mt-4 bg-heritage-purple hover:bg-heritage-purple-medium"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Your First Family Member
      </Button>
    </div>
  );
};

export default EmptyFamilyTree;
