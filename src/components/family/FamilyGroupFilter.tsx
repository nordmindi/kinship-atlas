/**
 * Family Group Filter Component
 * 
 * Filter component for filtering family members by family group
 */

import React, { useState, useEffect } from 'react';
import { FamilyGroup } from '@/types';
import { familyGroupService } from '@/services/familyGroupService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FamilyGroupFilterProps {
  selectedGroupIds: string[];
  onSelectionChange: (groupIds: string[]) => void;
  className?: string;
}

export const FamilyGroupFilter: React.FC<FamilyGroupFilterProps> = ({
  selectedGroupIds,
  onSelectionChange,
  className,
}) => {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const allGroups = await familyGroupService.getAllFamilyGroups();
      setGroups(allGroups);
    } catch (error) {
      console.error('Error loading family groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGroup = (groupId: string) => {
    if (!selectedGroupIds.includes(groupId)) {
      onSelectionChange([...selectedGroupIds, groupId]);
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    onSelectionChange(selectedGroupIds.filter((id) => id !== groupId));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const availableGroups = groups.filter((g) => !selectedGroupIds.includes(g.id));

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value=""
          onValueChange={handleAddGroup}
          disabled={isLoading || availableGroups.length === 0}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={isLoading ? "Loading..." : "Filter by group..."} />
          </SelectTrigger>
          <SelectContent>
            {availableGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedGroupIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        )}
      </div>

      {selectedGroupIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedGroupIds.map((groupId) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return null;

            return (
              <Badge
                key={groupId}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {group.name}
                <button
                  onClick={() => handleRemoveGroup(groupId)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

