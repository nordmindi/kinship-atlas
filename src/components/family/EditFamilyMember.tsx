
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FamilyMember, GeoLocation } from '@/types';
import { useNavigate } from 'react-router-dom';
import { addFamilyMember, updateFamilyMember } from '@/services/supabaseService';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LocationInput from '@/components/ui/location-input';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

// Form schema validation
const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  birthPlace: z.string().optional(),
  bio: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']),
  locationDescription: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditFamilyMemberProps {
  member?: FamilyMember;
  onClose?: () => void;
  onSuccess?: (member: FamilyMember) => void;
}

const EditFamilyMember: React.FC<EditFamilyMemberProps> = ({ member, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const isEditing = !!member;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: member?.firstName || '',
      lastName: member?.lastName || '',
      birthDate: member?.birthDate || '',
      deathDate: member?.deathDate || '',
      birthPlace: member?.birthPlace || '',
      bio: member?.bio || '',
      gender: member?.gender || 'other',
      locationDescription: member?.currentLocation?.description || '',
      lat: member?.currentLocation?.lat ? member.currentLocation.lat.toString() : '',
      lng: member?.currentLocation?.lng ? member.currentLocation.lng.toString() : '',
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    try {
      // Prepare member data
      const memberData: Omit<FamilyMember, 'id' | 'relations'> = {
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate || undefined,
        deathDate: values.deathDate || undefined,
        birthPlace: values.birthPlace || undefined,
        bio: values.bio || undefined,
        gender: values.gender,
      };
      
      // Add location if provided
      let location: GeoLocation | undefined;
      if (values.locationDescription && values.lat && values.lng) {
        location = {
          description: values.locationDescription,
          lat: parseFloat(values.lat),
          lng: parseFloat(values.lng),
        };
      }
      
      let result: FamilyMember | null = null;
      
      if (isEditing && member) {
        // Update existing member
        result = await updateFamilyMember(member.id, memberData, location);
      } else {
        // Add new member
        result = await addFamilyMember(memberData, location);
      }
      
      if (result) {
        if (onSuccess) {
          onSuccess(result);
        }
        
        if (onClose) {
          onClose();
        } else {
          // Navigate back
          navigate('/family-tree');
        }
      }
    } catch (error) {
      console.error('Error with family member:', error);
      toast({
        title: "Error",
        description: `Could not ${isEditing ? 'update' : 'add'} family member. Please try again.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-heritage-dark">
          {isEditing ? 'Edit Family Member' : 'Add Family Member'}
        </h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="First name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="deathDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Death Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="birthPlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birth Place</FormLabel>
                <FormControl>
                  <Input placeholder="City, Country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Biography</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description about this person" 
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-medium mb-2">Current Location</h3>
            
            <FormField
              control={form.control}
              name="locationDescription"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LocationInput
                      description={field.value}
                      lat={form.watch('lat') ? parseFloat(form.watch('lat')) : undefined}
                      lng={form.watch('lng') ? parseFloat(form.watch('lng')) : undefined}
                      onLocationChange={(location) => {
                        field.onChange(location.description);
                        form.setValue('lat', location.lat?.toString() || '');
                        form.setValue('lng', location.lng?.toString() || '');
                      }}
                      descriptionLabel="Location Description"
                      descriptionPlaceholder="e.g., New York City, NY, USA"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="pt-6">
            <Button 
              type="submit" 
              className="w-full bg-heritage-purple hover:bg-heritage-purple-medium flex items-center justify-center gap-2"
              disabled={form.formState.isSubmitting}
            >
              <Save className="h-4 w-4" />
              {form.formState.isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Family Member'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditFamilyMember;
