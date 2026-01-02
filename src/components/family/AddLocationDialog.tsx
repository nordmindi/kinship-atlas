import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FamilyMember, GeoLocation } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import LocationInput from '@/components/ui/location-input';
import { MapPin, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const locationSchema = z.object({
  description: z.string().min(1, 'Location description is required').max(100, 'Description is too long'),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface AddLocationDialogProps {
  member: FamilyMember;
  isOpen: boolean;
  onClose: () => void;
  onLocationAdded: () => void;
}

const AddLocationDialog: React.FC<AddLocationDialogProps> = ({
  member,
  isOpen,
  onClose,
  onLocationAdded
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      description: '',
      lat: '',
      lng: '',
    },
  });

  const onSubmit = async (values: LocationFormValues) => {
    setIsSubmitting(true);

    try {
      const location: GeoLocation = {
        description: values.description.trim(),
        lat: values.lat ? parseFloat(values.lat) : undefined,
        lng: values.lng ? parseFloat(values.lng) : undefined,
      };

      // First, remove any existing current residence locations for this member
      await supabase
        .from('locations')
        .delete()
        .eq('family_member_id', member.id)
        .eq('current_residence', true);

      // Add the new location
      const { error } = await supabase
        .from('locations')
        .insert({
          family_member_id: member.id,
          lat: location.lat || null,
          lng: location.lng || null,
          description: location.description,
          current_residence: true
        });

      if (error) {
        console.error('Error adding location:', error);
        toast({
          title: "Error",
          description: "Could not add location. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Location added for ${member.firstName} ${member.lastName}`,
      });

      form.reset();
      onLocationAdded();
      onClose();

    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Location for {member.firstName} {member.lastName}
          </DialogTitle>
          <DialogDescription>
            Add current residence location for this family member. This will help them appear on the Family Map.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
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
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Plus className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>

      </DialogContent>
    </Dialog>
  );
};

export default AddLocationDialog;
