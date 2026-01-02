/**
 * Family Group Manager Component
 * 
 * Manages family groups (create, edit, delete, view)
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FamilyGroup } from '@/types';
import { familyGroupService } from '@/services/familyGroupService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Family group name is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FamilyGroupManagerProps {
  onGroupChange?: () => void;
}

export const FamilyGroupManager: React.FC<FamilyGroupManagerProps> = ({ onGroupChange }) => {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FamilyGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<FamilyGroup | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const allGroups = await familyGroupService.getAllFamilyGroups();
      setGroups(allGroups);
    } catch (error) {
      console.error('Error loading family groups:', error);
      toast.error('Failed to load family groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (values: FormValues) => {
    try {
      const result = await familyGroupService.createFamilyGroup({
        name: values.name,
        description: values.description,
      });

      if (result.success && result.group) {
        toast.success('Family group created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        await loadGroups();
        onGroupChange?.();
      } else {
        toast.error(result.error || 'Failed to create family group');
      }
    } catch (error) {
      console.error('Error creating family group:', error);
      toast.error('Failed to create family group');
    }
  };

  const handleEditGroup = async (values: FormValues) => {
    if (!editingGroup) return;

    try {
      const result = await familyGroupService.updateFamilyGroup({
        id: editingGroup.id,
        name: values.name,
        description: values.description,
      });

      if (result.success && result.group) {
        toast.success('Family group updated successfully');
        setEditingGroup(null);
        form.reset();
        await loadGroups();
        onGroupChange?.();
      } else {
        toast.error(result.error || 'Failed to update family group');
      }
    } catch (error) {
      console.error('Error updating family group:', error);
      toast.error('Failed to update family group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      const result = await familyGroupService.deleteFamilyGroup(deletingGroup.id);

      if (result.success) {
        toast.success('Family group deleted successfully');
        setIsDeleteDialogOpen(false);
        setDeletingGroup(null);
        await loadGroups();
        onGroupChange?.();
      } else {
        toast.error(result.error || 'Failed to delete family group');
      }
    } catch (error) {
      console.error('Error deleting family group:', error);
      toast.error('Failed to delete family group');
    }
  };

  const openEditDialog = (group: FamilyGroup) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      description: group.description || '',
    });
  };

  const openDeleteDialog = (group: FamilyGroup) => {
    setDeletingGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditingGroup(null);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Family Groups</h2>
          <p className="text-muted-foreground">
            Organize your family members into groups like "Mother's Side", "Father's Side", "In-Laws", etc.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Family Group</DialogTitle>
              <DialogDescription>
                Create a new family group to organize your family members
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateGroup)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mother's Side" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a description for this group..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Group</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading groups...</div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No family groups yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="mt-1">{group.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {group.memberCount || 0} member{group.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Family Group</DialogTitle>
            <DialogDescription>
              Update the family group details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditGroup)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mother's Side" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a description for this group..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditDialog}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This will remove all
              member assignments to this group, but will not delete the family members themselves.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingGroup(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

