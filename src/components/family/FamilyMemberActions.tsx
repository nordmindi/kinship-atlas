import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  Trash2, 
  Unlink, 
  UserX,
  AlertTriangle
} from 'lucide-react';
import { FamilyMember } from '@/types';
import { deleteFamilyMember } from '@/services/supabaseService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface FamilyMemberActionsProps {
  member: FamilyMember;
  currentMember: FamilyMember;
  relationshipType?: 'parent' | 'child' | 'spouse' | 'sibling';
  onMemberDeleted?: () => void;
  onRelationshipRemoved?: () => void;
}

const FamilyMemberActions: React.FC<FamilyMemberActionsProps> = ({
  member,
  currentMember,
  relationshipType,
  onMemberDeleted,
  onRelationshipRemoved
}) => {
  const { user, isAdmin, canWrite } = useAuth();
  const { canEditFamilyMember, canDeleteFamilyMember } = usePermissions();
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [showDeleteMemberDialog, setShowDeleteMemberDialog] = useState(false);
  const [showRemoveRelationDialog, setShowRemoveRelationDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check permissions
  React.useEffect(() => {
    const checkPermissions = async () => {
      if (user && canWrite) {
        const editPermission = await canEditFamilyMember(member.id);
        const deletePermission = canDeleteFamilyMember();
        setCanEdit(editPermission);
        setCanDelete(deletePermission);
      } else {
        setCanEdit(false);
        setCanDelete(false);
      }
    };
    checkPermissions();
  }, [member.id, user, canWrite, canEditFamilyMember, canDeleteFamilyMember]);

  const handleRemoveRelationship = async () => {
    if (!relationshipType) return;
    
    setIsDeleting(true);
    try {
      // Find the relationship between current member and this member
      const relation = currentMember.relations.find(r => r.personId === member.id);
      
      if (!relation) {
        toast.error('Relationship not found');
        return;
      }

      const result = await familyRelationshipManager.deleteRelationship(relation.id);
      
      if (result.success) {
        toast.success('Relationship removed', {
          description: `The ${relationshipType} relationship between ${currentMember.firstName} ${currentMember.lastName} and ${member.firstName} ${member.lastName} has been removed.`
        });
        onRelationshipRemoved?.();
      } else {
        toast.error('Failed to remove relationship', {
          description: result.error || 'There was an error removing the relationship. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error removing relationship:', error);
      toast.error('Failed to remove relationship', {
        description: 'There was an error removing the relationship. Please try again.'
      });
    } finally {
      setIsDeleting(false);
      setShowRemoveRelationDialog(false);
    }
  };

  const handleDeleteMember = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteFamilyMember(member.id);
      
      if (success) {
        toast.success('Family member deleted', {
          description: `${member.firstName} ${member.lastName} and all their relationships have been removed from the family tree.`
        });
        onMemberDeleted?.();
      } else {
        toast.error('Failed to delete family member', {
          description: 'There was an error deleting the family member. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error deleting family member:', error);
      toast.error('Failed to delete family member', {
        description: 'There was an error deleting the family member. Please try again.'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteMemberDialog(false);
    }
  };

  // Don't show actions if user doesn't have write permissions
  if (!canWrite) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {relationshipType && (
            <>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRemoveRelationDialog(true);
                }}
                className="text-orange-600 focus:text-orange-600"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Remove Relationship
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {(canDelete || isAdmin) && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteMemberDialog(true);
              }}
              className="text-red-600 focus:text-red-600"
            >
              <UserX className="h-4 w-4 mr-2" />
              Delete Family Member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove Relationship Confirmation Dialog */}
      <AlertDialog open={showRemoveRelationDialog} onOpenChange={setShowRemoveRelationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlink className="h-5 w-5 text-orange-600" />
              Remove Relationship
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {relationshipType} relationship between{' '}
              <strong>{currentMember.firstName} {currentMember.lastName}</strong> and{' '}
              <strong>{member.firstName} {member.lastName}</strong>?
              <br /><br />
              This action will only remove the relationship connection, not the family members themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRelationship}
              disabled={isDeleting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDeleting ? 'Removing...' : 'Remove Relationship'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Family Member Confirmation Dialog */}
      <AlertDialog open={showDeleteMemberDialog} onOpenChange={setShowDeleteMemberDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Family Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{member.firstName} {member.lastName}</strong> from the family tree?
              <br /><br />
              <strong className="text-red-600">This action cannot be undone.</strong> It will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove all relationships with other family members</li>
                <li>Delete all associated photos and documents</li>
                <li>Remove all stories and memories</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FamilyMemberActions;
