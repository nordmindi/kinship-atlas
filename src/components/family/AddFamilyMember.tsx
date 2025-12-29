
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FamilyMember, GeoLocation } from '@/types';
import { useNavigate } from 'react-router-dom';
import { familyMemberService } from '@/services/familyMemberService';
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
import { toast } from '@/hooks/use-toast';
import { X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

interface AddFamilyMemberProps {
  onClose?: () => void;
  onSuccess?: (member: FamilyMember) => void;
}

const AddFamilyMember: React.FC<AddFamilyMemberProps> = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      birthPlace: '',
      bio: '',
      gender: 'other',
      locationDescription: '',
      lat: '',
      lng: '',
    },
  });
  
  const attemptSubmission = async (values: FormValues, attempt: number = 1): Promise<FamilyMember | null> => {
    console.log(`🚀 Attempt ${attempt} - Starting family member creation from form...`);
    
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
    
    console.log('📝 Calling addFamilyMember service...');
    console.log('📍 Location data:', location);
    
    // Add overall timeout to prevent hanging
    const submissionPromise = familyMemberService.createFamilyMember({
      ...memberData,
      location
    });
    const overallTimeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Form submission timeout - please try again')), 30000)
    );
    
    const result = await Promise.race([submissionPromise, overallTimeoutPromise]);
    return result.success ? result.member : null;
  };
  
  const onSubmit = async (values: FormValues) => {
    // Check authentication before submission
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create family members.",
        variant: "destructive"
      });
      return;
    }

    // Additional session validation
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      toast({
        title: "Authentication Error",
        description: "Unable to verify your session. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newMember = await attemptSubmission(values, retryCount + 1);
      
      if (newMember) {
        console.log('✅ Family member created successfully');
        toast({
          title: "Success",
          description: `${values.firstName} ${values.lastName} has been added to your family tree.`,
        });
        
        // Reset retry count on success
        setRetryCount(0);
        
        if (onSuccess) {
          onSuccess(newMember);
        }
        
        if (onClose) {
          onClose();
        } else {
          // Navigate back to the tree view or home
          navigate('/');
        }
      } else {
        console.error('❌ addFamilyMember returned null');
        toast({
          title: "Error",
          description: "Failed to create family member. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error adding family member:', error);
      
      // Check if we should retry
      if (retryCount < 2 && (error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('network') ||
        error.message.includes('fetch')
      ))) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Retrying...",
          description: `Attempt ${retryCount + 2} of 3. Please wait...`,
        });
        
        // Wait a bit before retrying
        setTimeout(() => {
          setIsRetrying(true);
          onSubmit(values).finally(() => setIsRetrying(false));
        }, 2000);
        return;
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not add family member. Please try again.",
        variant: "destructive"
      });
      
      // Reset retry count on final failure
      setRetryCount(0);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-heritage-dark">Add Family Member</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      {/* Authentication Status */}
      {isLoading ? (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">Loading authentication...</p>
        </div>
      ) : !user ? (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">⚠️ Please log in to create family members.</p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">✅ Logged in as {user.email}</p>
        </div>
      )}

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
                  <FormLabel>Location Description</FormLabel>
                  <FormControl>
                    <Input placeholder="City, Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 40.7128" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. -74.0060" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
              disabled={form.formState.isSubmitting || isRetrying || !user || isLoading}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying... (Attempt {retryCount + 1}/3)
                </>
              ) : form.formState.isSubmitting ? (
                'Adding...'
              ) : (
                'Add Family Member'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddFamilyMember;
