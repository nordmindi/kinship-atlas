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

    // Get the family member
    const { data: member, error } = await supabase
      .from('family_members')
      .select('created_by, branch_root')
      .eq('id', memberId)
      .single();

    if (error || !member) return false;

    // Check if user created this member
    if ((member as any).created_by === user.id) return true;

    // Check if member is in user's branch
    const { data: userMembers } = await supabase
      .from('family_members')
      .select('id')
      .or(`created_by.eq.${user.id},branch_root.eq.${user.id}`);

    if (userMembers && userMembers.length > 0) {
      const userMemberIds = userMembers.map(m => m.id);
      return userMemberIds.includes((member as any).branch_root || '');
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

    const { data: members, error } = await supabase
      .from('family_members')
      .select('id')
      .or(`created_by.eq.${user.id},branch_root.eq.${user.id}`);

    if (error) {
      console.error('Error fetching user branch members:', error);
      return [];
    }

    return members?.map(m => m.id) || [];
  } catch (error) {
    console.error('Error fetching user branch members:', error);
    return [];
  }
};
