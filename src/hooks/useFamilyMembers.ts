import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFamilyMembers, addFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/services/supabaseService';
import { FamilyMember, GeoLocation } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook to fetch all family members
 */
export const useFamilyMembers = () => {
  return useQuery({
    queryKey: queryKeys.familyMembers.list(),
    queryFn: () => getFamilyMembers(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch a single family member by ID
 */
export const useFamilyMember = (memberId: string | null) => {
  return useQuery({
    queryKey: queryKeys.familyMembers.detail(memberId || ''),
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID is required');
      const members = await getFamilyMembers();
      const member = members.find(m => m.id === memberId);
      if (!member) throw new Error('Family member not found');
      return member;
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to create a new family member
 */
export const useCreateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ member, location }: { member: Omit<FamilyMember, 'id' | 'relations'>; location?: GeoLocation }) => 
      addFamilyMember(member, location),
    onSuccess: () => {
      // Invalidate family members list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers.lists() });
    },
  });
};

/**
 * Hook to update an existing family member
 */
export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates, location }: { 
      id: string; 
      updates: Partial<Omit<FamilyMember, 'id' | 'relations'>>; 
      location?: GeoLocation 
    }) => updateFamilyMember(id, updates, location),
    onSuccess: (_, variables) => {
      // Invalidate the specific member
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.familyMembers.detail(variables.id) 
      });
      
      // Invalidate family members list
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers.lists() });
      
      // Invalidate relations for this member
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.familyMembers.relations(variables.id) 
      });
    },
  });
};

/**
 * Hook to delete a family member
 */
export const useDeleteFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => deleteFamilyMember(memberId),
    onSuccess: (_, memberId) => {
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: queryKeys.familyMembers.detail(memberId) 
      });
      
      // Invalidate family members list
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers.lists() });
      
      // Invalidate all relations (since deleting a member affects all relations)
      queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers.all });
    },
  });
};

