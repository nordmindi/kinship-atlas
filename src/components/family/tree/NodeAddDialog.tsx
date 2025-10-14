import React, { useState } from 'react';
import { FamilyMember } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/ui/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NodeAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newMember: Omit<FamilyMember, 'id' | 'relations'>) => void;
}

export const NodeAddDialog: React.FC<NodeAddDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [formData, setFormData] = useState<Omit<FamilyMember, 'id' | 'relations'>>({
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    bio: '',
    gender: 'male',
    avatar: '',
  });

  const handleAdd = () => {
    if (!formData.firstName || !formData.lastName) {
      alert('Please enter at least first and last name');
      return;
    }

    onAdd(formData);
    
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      birthPlace: '',
      bio: '',
      gender: 'male',
      avatar: '',
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Family Member</DialogTitle>
          <DialogDescription>
            Enter the details for the new family member
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <ImageUpload
              currentImage={formData.avatar || ''}
              onImageUploaded={(url) => {
                setFormData({ ...formData, avatar: url });
              }}
              size="md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) =>
                setFormData({ ...formData, gender: value as 'male' | 'female' | 'other' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deathDate">Death Date</Label>
              <Input
                id="deathDate"
                type="date"
                value={formData.deathDate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, deathDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthPlace">Birth Place</Label>
            <Input
              id="birthPlace"
              value={formData.birthPlace || ''}
              onChange={(e) =>
                setFormData({ ...formData, birthPlace: e.target.value })
              }
              placeholder="City, Country"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              value={formData.bio || ''}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              rows={4}
              placeholder="Brief description..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Member</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
