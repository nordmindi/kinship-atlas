/**
 * Assign Member to Group Dialog
 * 
 * Dialog for assigning or removing family members from family groups
 */

import React, { useState, useEffect } from 'react';
import { FamilyMember, FamilyGroup } from '@/types';
import { familyGroupService } from '@/services/familyGroupService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface AssignMemberToGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember;
  onUpdate?: () => void;
}

export const AssignMemberToGroupDialog: React.FC<AssignMemberToGroupDialogProps> = ({
  isOpen,
  onClose,
  member,
  onUpdate,
}) => {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [memberGroups, setMemberGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      loadData();
    }
  }, [isOpen, member]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allGroups, memberGroupsList] = await Promise.all([
        familyGroupService.getAllFamilyGroups(),
        familyGroupService.getGroupsForMember(member.id),
      ]);

      setGroups(allGroups);
      setMemberGroups(new Set(memberGroupsList.map((g) => g.id)));
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load family groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGroup = (groupId: string) => {
    const newMemberGroups = new Set(memberGroups);
    if (newMemberGroups.has(groupId)) {
      newMemberGroups.delete(groupId);
    } else {
      newMemberGroups.add(groupId);
    }
    setMemberGroups(newMemberGroups);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current groups and new groups
      const currentGroupIds = Array.from(memberGroups);
      const previousGroups = await familyGroupService.getGroupsForMember(member.id);
      const previousGroupIds = new Set(previousGroups.map((g) => g.id));

      // Add new assignments
      const toAdd = currentGroupIds.filter((id) => !previousGroupIds.has(id));
      // Remove old assignments
      const toRemove = Array.from(previousGroupIds).filter((id) => !currentGroupIds.includes(id));

      // Perform all operations
      const operations = [
        ...toAdd.map((groupId) =>
          familyGroupService.assignMemberToGroup({
            familyMemberId: member.id,
            familyGroupId: groupId,
          })
        ),
        ...toRemove.map((groupId) =>
          familyGroupService.removeMemberFromGroup({
            familyMemberId: member.id,
            familyGroupId: groupId,
          })
        ),
      ];

      const results = await Promise.all(operations);
      const hasErrors = results.some((r) => !r.success);

      if (hasErrors) {
        toast.error('Some assignments failed to update');
      } else {
        toast.success('Group assignments updated successfully');
        onUpdate?.();
        onClose();
      }
    } catch (error) {
      console.error('Error updating group assignments:', error);
      toast.error('Failed to update group assignments');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Family Groups</DialogTitle>
          <DialogDescription>
            Select which family groups <strong>{member.firstName} {member.lastName}</strong> belongs to
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No family groups available</p>
            <p className="text-sm text-muted-foreground">
              Create a family group first to assign members
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleGroup(group.id)}
                  >
                    <Checkbox
                      checked={memberGroups.has(group.id)}
                      onCheckedChange={() => handleToggleGroup(group.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-muted-foreground">
                          {group.description}
                        </div>
                      )}
                    </div>
                    {group.memberCount !== undefined && (
                      <Badge variant="secondary">
                        {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

