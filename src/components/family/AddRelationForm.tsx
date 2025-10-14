
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FamilyMember } from '@/types';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getFamilyMembers } from '@/services/supabaseService';
import { familyRelationshipManager, RelationshipType, resolveRelationshipDirection } from '@/services/familyRelationshipManager';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AddRelationFormProps {
  memberId: string;
  relationType: RelationshipType;
  onSuccess?: () => void;
}

const formSchema = z.object({
  relatedMemberId: z.string().min(1, 'Please select a family member'),
});

type FormValues = z.infer<typeof formSchema>;

const relationTypeLabels: Record<RelationshipType, string> = {
  'parent': 'Parent',
  'child': 'Child',
  'spouse': 'Spouse',
  'sibling': 'Sibling'
};

const buildSuccessDescription = (
  selectedRole: RelationshipType,
  currentMember: FamilyMember | null,
  relatedMember: FamilyMember | null
): string | null => {
  if (!currentMember || !relatedMember) {
    return null;
  }

  const currentName = `${currentMember.firstName} ${currentMember.lastName}`;
  const relatedName = `${relatedMember.firstName} ${relatedMember.lastName}`;

  switch (selectedRole) {
    case 'parent':
      return `${relatedName} has been added as parent of ${currentName}.`;
    case 'child':
      return `${relatedName} has been added as child of ${currentName}.`;
    case 'spouse':
      return `${currentName} and ${relatedName} are now recorded as spouses.`;
    case 'sibling':
      return `${relatedName} has been added as sibling of ${currentName}.`;
    default:
      return null;
  }
};

const AddRelationForm: React.FC<AddRelationFormProps> = ({ 
  memberId, 
  relationType,
  onSuccess 
}) => {
  const navigate = useNavigate();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [availableMembers, setAvailableMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      relatedMemberId: '',
    },
  });
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const allMembers = await getFamilyMembers();
        const currentMember = allMembers.find(m => m.id === memberId);
        
        if (currentMember) {
          setMember(currentMember);
          
          // Filter out members that already have the specified relation
          const existingRelationIds = currentMember.relations
            .filter(r => r.type === relationType)
            .map(r => r.personId);
            
          // Don't include self
          const filteredMembers = allMembers.filter(m => 
            m.id !== memberId && !existingRelationIds.includes(m.id)
          );
          
          setAvailableMembers(filteredMembers);
        }
      } catch (error) {
        console.error('Error loading family members:', error);
        toast({
          title: 'Error',
          description: 'Could not load family members.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [memberId, relationType]);
  
  const onSubmit = async (values: FormValues) => {
    try {
      const direction = resolveRelationshipDirection(
        memberId,
        values.relatedMemberId,
        relationType
      );

      const result = await familyRelationshipManager.createRelationshipSmart(
        direction.fromMemberId,
        direction.toMemberId,
        direction.relationshipType
      );
      
      if (result.success) {
        const effectiveRole = (result.actualRelationshipType ?? direction.selectedMemberRole) as RelationshipType;
        const wasCorrected =
          Boolean(
            result.corrected &&
            result.actualRelationshipType &&
            result.actualRelationshipType !== direction.selectedMemberRole
          );
        let successDescription = buildSuccessDescription(
          effectiveRole,
          member,
          availableMembers.find(m => m.id === values.relatedMemberId) || null
        );

        if (wasCorrected) {
          successDescription = successDescription
            ? `${successDescription} Direction was adjusted automatically based on birth dates.`
            : 'Relationship direction was adjusted automatically based on birth dates.';
        }

        toast({
          title: 'Success',
          description: successDescription ?? 'Family relation added successfully.',
        });
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(`/family-member/${memberId}`);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add family relation. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding relation:', error);
      toast({
        title: 'Error',
        description: 'Failed to add relation. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="p-4">
      <div className="mb-6 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/family-member/${memberId}`)}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-xl font-medium">
          Add {relationTypeLabels[relationType]}
        </h1>
      </div>
      
      {isLoading ? (
        <div className="animate-pulse text-heritage-purple text-center p-8">Loading...</div>
      ) : member ? (
        <>
          <p className="mb-6 text-muted-foreground">
            Select a person to add as {member.firstName}'s {relationTypeLabels[relationType].toLowerCase()}.
          </p>
          
          {availableMembers.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No family members available to add as {relationTypeLabels[relationType].toLowerCase()}.
              </p>
              <Button
                onClick={() => navigate('/add-family-member')} 
                className="mt-4 bg-heritage-purple hover:bg-heritage-purple-medium"
              >
                Add New Family Member
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="relatedMemberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Family Member</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a family member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableMembers.map((availableMember) => (
                            <SelectItem key={availableMember.id} value={availableMember.id}>
                              {availableMember.firstName} {availableMember.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Adding...' : 'Add Relation'}
                </Button>
              </form>
            </Form>
          )}
        </>
      ) : (
        <div className="text-center text-muted-foreground">Member not found</div>
      )}
    </div>
  );
};

export default AddRelationForm;
