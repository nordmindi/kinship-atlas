import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Album, CreateAlbumRequest, StoryCategory } from '@/types/albums';
import type { FamilyGroup } from '@/types';
import type { FamilyMember } from '@/types';

interface AlbumFormProps {
  album?: Album;
  onSubmit: (request: CreateAlbumRequest | any) => void;
  onCancel: () => void;
  familyGroups: FamilyGroup[];
  familyMembers: FamilyMember[];
  storyCategories: StoryCategory[];
}

const AlbumForm: React.FC<AlbumFormProps> = ({
  album,
  onSubmit,
  onCancel,
  familyGroups,
  familyMembers,
  storyCategories
}) => {
  const [name, setName] = useState(album?.name || '');
  const [description, setDescription] = useState(album?.description || '');
  const [selectedFamilyGroups, setSelectedFamilyGroups] = useState<string[]>(
    album?.familyGroups?.map(fg => fg.id) || []
  );
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>(
    album?.familyMembers?.map(fm => fm.id) || []
  );
  const [selectedStoryCategories, setSelectedStoryCategories] = useState<string[]>(
    album?.storyCategories?.map(sc => sc.id) || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const request: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      familyGroupIds: selectedFamilyGroups.length > 0 ? selectedFamilyGroups : undefined,
      familyMemberIds: selectedFamilyMembers.length > 0 ? selectedFamilyMembers : undefined,
      storyCategoryIds: selectedStoryCategories.length > 0 ? selectedStoryCategories : undefined,
    };

    if (album) {
      request.id = album.id;
    }

    onSubmit(request);
  };

  const toggleFamilyGroup = (groupId: string) => {
    setSelectedFamilyGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleFamilyMember = (memberId: string) => {
    setSelectedFamilyMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleStoryCategory = (categoryId: string) => {
    setSelectedStoryCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Album Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter album name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter album description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Family Groups</Label>
        <ScrollArea className="h-32 border rounded-md p-2">
          {familyGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No family groups available
            </p>
          ) : (
            <div className="space-y-2">
              {familyGroups.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={selectedFamilyGroups.includes(group.id)}
                    onCheckedChange={() => toggleFamilyGroup(group.id)}
                  />
                  <label
                    htmlFor={`group-${group.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {group.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <Label>Family Members</Label>
        <ScrollArea className="h-32 border rounded-md p-2">
          {familyMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No family members available
            </p>
          ) : (
            <div className="space-y-2">
              {familyMembers.map(member => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selectedFamilyMembers.includes(member.id)}
                    onCheckedChange={() => toggleFamilyMember(member.id)}
                  />
                  <label
                    htmlFor={`member-${member.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {member.firstName} {member.lastName}
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <Label>Story Categories</Label>
        <ScrollArea className="h-32 border rounded-md p-2">
          {storyCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No story categories available
            </p>
          ) : (
            <div className="space-y-2">
              {storyCategories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedStoryCategories.includes(category.id)}
                    onCheckedChange={() => toggleStoryCategory(category.id)}
                  />
                  <label
                    htmlFor={`category-${category.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {album ? 'Update' : 'Create'} Album
        </Button>
      </div>
    </form>
  );
};

export default AlbumForm;

