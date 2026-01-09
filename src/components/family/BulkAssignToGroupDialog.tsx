/**
 * Bulk Assign to Group Dialog
 * 
 * Dialog for assigning multiple family members to family groups at once
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
import { Loader2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface BulkAssignToGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onUpdate?: () => void;
}

export const BulkAssignToGroupDialog: React.FC<BulkAssignToGroupDialogProps> = ({
  isOpen,
  onClose,
  members,
  onUpdate,
}) => {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Reset selections when dialog opens
      setSelectedMemberIds(new Set());
      setSelectedGroupIds(new Set());
      setMemberSearchQuery('');
      setGroupSearchQuery('');
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allGroups = await familyGroupService.getAllFamilyGroups();
      setGroups(allGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load family groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMemberIds(newSelected);
  };

  const handleToggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroupIds);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroupIds(newSelected);
  };

  const handleSelectAllMembers = () => {
    if (selectedMemberIds.size === filteredMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupIds.size === filteredGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const handleSave = async () => {
    if (selectedMemberIds.size === 0) {
      toast.error('Please select at least one family member');
      return;
    }

    if (selectedGroupIds.size === 0) {
      toast.error('Please select at least one family group');
      return;
    }

    setIsSaving(true);
    try {
      const memberIds = Array.from(selectedMemberIds);
      const groupIds = Array.from(selectedGroupIds);

      // Create all assignment operations
      const operations: Promise<{ success: boolean; error?: string }>[] = [];
      
      for (const memberId of memberIds) {
        for (const groupId of groupIds) {
          operations.push(
            familyGroupService.assignMemberToGroup({
              familyMemberId: memberId,
              familyGroupId: groupId,
            })
          );
        }
      }

      const results = await Promise.all(operations);
      const errors = results.filter(r => !r.success);
      const successCount = results.length - errors.length;

      if (errors.length > 0) {
        toast.warning(
          `Assigned ${successCount} of ${results.length} assignments. Some failed.`
        );
      } else {
        toast.success(
          `Successfully assigned ${memberIds.length} member${memberIds.length !== 1 ? 's' : ''} to ${groupIds.length} group${groupIds.length !== 1 ? 's' : ''}`
        );
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

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    if (!memberSearchQuery) return true;
    const query = memberSearchQuery.toLowerCase();
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(query);
  });

  // Filter groups based on search
  const filteredGroups = groups.filter(group => {
    if (!groupSearchQuery) return true;
    const query = groupSearchQuery.toLowerCase();
    return group.name.toLowerCase().includes(query) ||
           (group.description?.toLowerCase().includes(query) ?? false);
  });

  const allMembersSelected = filteredMembers.length > 0 && 
    selectedMemberIds.size === filteredMembers.length;

  const allGroupsSelected = filteredGroups.length > 0 && 
    selectedGroupIds.size === filteredGroups.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Assign to Family Groups</DialogTitle>
          <DialogDescription>
            Select multiple family members and assign them to one or more family groups
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
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Family Members Selection */}
              <div className="flex flex-col border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Select Family Members</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllMembers}
                      className="h-7 text-xs"
                    >
                      {allMembersSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {selectedMemberIds.size} of {filteredMembers.length} selected
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No members found
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer"
                          onClick={() => handleToggleMember(member.id)}
                        >
                          <Checkbox
                            checked={selectedMemberIds.has(member.id)}
                            onCheckedChange={() => handleToggleMember(member.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {member.firstName} {member.lastName}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Family Groups Selection */}
              <div className="flex flex-col border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Select Family Groups</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllGroups}
                      className="h-7 text-xs"
                    >
                      {allGroupsSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups..."
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {selectedGroupIds.size} of {filteredGroups.length} selected
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {filteredGroups.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No groups found
                      </div>
                    ) : (
                      filteredGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center space-x-3 p-2 rounded hover:bg-accent cursor-pointer"
                          onClick={() => handleToggleGroup(group.id)}
                        >
                          <Checkbox
                            checked={selectedGroupIds.has(group.id)}
                            onCheckedChange={() => handleToggleGroup(group.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{group.name}</div>
                            {group.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {group.description}
                              </div>
                            )}
                          </div>
                          {group.memberCount !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {group.memberCount}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Summary */}
            {selectedMemberIds.size > 0 && selectedGroupIds.size > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Will assign <strong>{selectedMemberIds.size}</strong> member{selectedMemberIds.size !== 1 ? 's' : ''} to <strong>{selectedGroupIds.size}</strong> group{selectedGroupIds.size !== 1 ? 's' : ''} 
                    {' '}({selectedMemberIds.size * selectedGroupIds.size} total assignments)
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || selectedMemberIds.size === 0 || selectedGroupIds.size === 0}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign to Groups
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
