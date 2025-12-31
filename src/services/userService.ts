import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types';

/**
 * Get user profile with role information
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles' as any)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If table doesn't exist, return a default profile
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('user_profiles table not found, returning default profile');
        return {
          id: userId,
          role: 'family_member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles' as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase.rpc('get_all_users' as any);

    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }

    return (data || []) as UserProfile[];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};

/**
 * Update user role (admin only)
 * Uses a database function with proper admin verification
 */
export const updateUserRole = async (userId: string, role: 'admin' | 'family_member'): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('update_user_role' as any, {
      target_user_id: userId,
      new_role: role
    });

    if (error) {
      console.error('Error updating user role:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
};

/**
 * Check if current user is admin
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await getUserProfile(user.id);
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Check if user can edit a family member
 */
export const canUserEditFamilyMember = async (memberId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (isAdmin) return true;

    // Get the family member - handle missing created_by column gracefully
    const { data: member, error } = await supabase
      .from('family_members')
      .select('user_id, created_by, branch_root')
      .eq('id', memberId)
      .single();

    if (error || !member) return false;

    const memberData = member as any;
    
    // Check if user created this member (use created_by if available, fallback to user_id)
    const createdBy = memberData.created_by || memberData.user_id;
    if (createdBy === user.id) return true;

    // Check if member is in user's branch (only if created_by column exists)
    if (memberData.created_by !== undefined) {
      const { data: userMembers } = await supabase
        .from('family_members')
        .select('id')
        .or(`created_by.eq.${user.id},branch_root.eq.${user.id}`);

      if (userMembers && userMembers.length > 0) {
        const userMemberIds = userMembers.map(m => m.id);
        return userMemberIds.includes((member as any).branch_root || '');
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking edit permission:', error);
    return false;
  }
};

/**
 * Get user's branch members
 */
export const getUserBranchMembers = async (): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Try to get members by created_by, fallback to user_id if column doesn't exist
    let members;
    const { data: membersByCreatedBy, error: error1 } = await supabase
      .from('family_members')
      .select('id')
      .or(`created_by.eq.${user.id},branch_root.eq.${user.id}`);
    
    if (error1 && error1.code === '42703') {
      // Column doesn't exist, use user_id instead
      const { data: membersByUserId, error: error2 } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', user.id);
      
      if (error2) {
        console.error('Error fetching user branch members:', error2);
        return [];
      }
      members = membersByUserId;
    } else {
      if (error1) {
        console.error('Error fetching user branch members:', error1);
        return [];
      }
      members = membersByCreatedBy;
    }

    return members?.map(m => m.id) || [];
  } catch (error) {
    console.error('Error fetching user branch members:', error);
    return [];
  }
};
