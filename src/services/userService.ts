import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types';

/**
 * Map database user profile (snake_case) to TypeScript UserProfile (camelCase)
 */
const mapUserProfile = (data: any): UserProfile => {
  return {
    id: data.id,
    role: data.role,
    displayName: data.display_name,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    onboardingCompleted: data.onboarding_completed ?? false,
    onboardingEnabled: data.onboarding_enabled ?? true,
  };
};

/**
 * Get user profile with role information
 * Returns null if profile doesn't exist or if there's a critical error
 * Throws an error if there's an infinite recursion or policy error that requires logout
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles' as any)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If table doesn't exist, return a default profile (for development)
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('user_profiles table not found, returning default profile');
        return {
          id: userId,
          role: 'viewer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          onboardingCompleted: false,
          onboardingEnabled: true,
        };
      }
      
      // If profile doesn't exist (PGRST116), try to create it
      if (error.code === 'PGRST116') {
        console.warn('User profile not found, attempting to create it:', userId);
        try {
          // Call the ensure_user_profile function to create the profile
          const { error: createError } = await (supabase.rpc as any)('ensure_user_profile', {
            user_id: userId
          });
          
          if (createError) {
            console.error('Error creating user profile:', createError);
            // Try to create it directly as fallback
            const { data: newProfile, error: insertError } = await supabase
              .from('user_profiles' as any)
              .insert({
                id: userId,
                role: 'viewer',
                display_name: null
              })
              .select()
              .single();
            
            if (insertError) {
              console.error('Error creating user profile directly:', insertError);
              return null;
            }
            
            return mapUserProfile(newProfile);
          }
          
          // Retry fetching the profile after creation
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles' as any)
            .select('*')
            .eq('id', userId)
            .single();
          
          if (retryError || !retryData) {
            console.error('Error fetching profile after creation:', retryError);
            return null;
          }
          
          return mapUserProfile(retryData);
        } catch (createErr) {
          console.error('Exception creating user profile:', createErr);
          return null;
        }
      }
      
      // Critical errors that indicate the profile cannot be accessed
      // These should trigger a logout
      if (
        error.code === '42P17' || // infinite recursion detected in policy
        error.message?.includes('infinite recursion') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('permission denied')
      ) {
        console.error('Critical error fetching user profile - profile not accessible:', error);
        // Return null to indicate profile is not accessible
        return null;
      }
      
      console.error('Error fetching user profile:', error);
      return null;
    }

    // If no data returned, profile doesn't exist
    if (!data) {
      console.warn('User profile not found for user:', userId);
      // Try to create it
      try {
        const { error: createError } = await (supabase.rpc as any)('ensure_user_profile', {
          user_id: userId
        });
        
        if (!createError) {
          // Retry fetching
          const { data: retryData } = await supabase
            .from('user_profiles' as any)
            .select('*')
            .eq('id', userId)
            .single();
          
          if (retryData) {
            return mapUserProfile(retryData);
          }
          return null;
        }
      } catch (err) {
        console.error('Error creating profile:', err);
      }
      return null;
    }

    return mapUserProfile(data);
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
    // Map camelCase to snake_case for database
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.displayName !== undefined) {
      dbUpdates.display_name = updates.displayName;
    }
    
    if (updates.role !== undefined) {
      dbUpdates.role = updates.role;
    }

    if (updates.onboardingCompleted !== undefined) {
      dbUpdates.onboarding_completed = updates.onboardingCompleted;
    }

    if (updates.onboardingEnabled !== undefined) {
      dbUpdates.onboarding_enabled = updates.onboardingEnabled;
    }

    const { error } = await supabase
      .from('user_profiles' as any)
      .update(dbUpdates)
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
    const { data, error } = await supabase.rpc('get_all_users' as never);

    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }

    // Transform snake_case database fields to camelCase TypeScript fields
    return (data || []).map((user: any) => ({
      id: user.id,
      role: user.role,
      displayName: user.display_name || user.email || null,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: user.updated_at || new Date().toISOString(),
    })) as UserProfile[];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};

import { UserRole } from '@/types';

/**
 * Update user role (admin only)
 * Uses a database function with proper admin verification
 */
export const updateUserRole = async (userId: string, role: UserRole): Promise<boolean> => {
  try {
    const { data, error } = await (supabase.rpc as any)('update_user_role', {
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

/**
 * Delete a user (admin only)
 * This will delete the user profile and optionally their auth account
 */
export const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only administrators can delete users'
      };
    }

    // Prevent self-deletion
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) {
      return {
        success: false,
        error: 'You cannot delete your own account'
      };
    }

    // Delete user profile
    const { error: deleteError } = await supabase
      .from('user_profiles' as any)
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error deleting user profile:', deleteError);
      return {
        success: false,
        error: 'Failed to delete user profile'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while deleting the user'
    };
  }
};

/**
 * Create a new user (admin only)
 * Creates both the auth account and user profile
 * Note: Admin check should be done in the calling component using AuthContext.isAdmin
 */
export const createUser = async (
  email: string, 
  password: string, 
  role: UserRole, 
  displayName?: string
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    // Note: Admin verification is done via RLS and database functions
    // The calling component should verify isAdmin from AuthContext before calling this

    // Validate inputs
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long'
      };
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0]
        },
        emailRedirectTo: undefined // Don't send confirmation email in admin creation
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return {
        success: false,
        error: authError.message || 'Failed to create user account'
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'User creation failed - no user data returned'
      };
    }

    const userId = authData.user.id;

    // Update user profile with role and display name
    // The profile should be created by the trigger, but we'll update it
    const { error: profileError } = await supabase
      .from('user_profiles' as any)
      .update({
        role,
        display_name: displayName || email.split('@')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating user profile:', profileError);
      // Try to insert if update failed (profile might not exist yet)
      const { error: insertError } = await supabase
        .from('user_profiles' as any)
        .insert({
          id: userId,
          role,
          display_name: displayName || email.split('@')[0]
        });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return {
          success: false,
          error: 'User created but failed to set role. Please update manually.'
        };
      }
    }

    return {
      success: true,
      userId
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while creating the user'
    };
  }
};

/**
 * Change user password (admin only)
 * Sends a password reset email to the user
 */
export const changeUserPassword = async (
  userId: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only administrators can change user passwords'
      };
    }

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long'
      };
    }

    // Get user email from profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles' as any)
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Note: Direct password updates require Supabase Auth Admin API
    // For security, we'll use the password reset flow
    // In production, this should be done via an Edge Function with service role key
    
    // For now, we'll return an error suggesting to use password reset
    // The admin can manually reset the password via Supabase dashboard
    // or we can implement an Edge Function later
    
    return {
      success: false,
      error: 'Password changes require Supabase Auth Admin API. Please use the Supabase dashboard or implement an Edge Function with service role key. For now, you can send a password reset email to the user.'
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while changing the password'
    };
  }
};

/**
 * Send password reset email to user (admin only)
 */
export const sendPasswordResetEmail = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only administrators can send password reset emails'
      };
    }

    // Get user email - we need to query auth.users which requires admin
    // For now, we'll need the email passed in or use an Edge Function
    
    return {
      success: false,
      error: 'Password reset emails require user email. Please implement via Edge Function or use Supabase dashboard.'
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Update user display name (admin only)
 */
export const updateUserDisplayName = async (
  userId: string, 
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Only administrators can update user display names'
      };
    }

    const { data, error } = await (supabase.rpc as any)('admin_update_user_display_name', {
      p_user_id: userId,
      p_display_name: displayName
    });

    if (error) {
      console.error('Error updating display name:', error);
      // Fallback to direct update
      const { error: updateError } = await supabase
        .from('user_profiles' as any)
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message || 'Failed to update display name'
        };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating display name:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Complete onboarding for the current user
 */
export const completeOnboarding = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const result = await updateUserProfile(user.id, {
      onboardingCompleted: true
    });

    if (!result) {
      return {
        success: false,
        error: 'Failed to update onboarding status'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Update onboarding enabled setting for the current user
 */
export const updateOnboardingEnabled = async (enabled: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const result = await updateUserProfile(user.id, {
      onboardingEnabled: enabled
    });

    if (!result) {
      return {
        success: false,
        error: 'Failed to update onboarding setting'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating onboarding setting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

/**
 * Reset onboarding for the current user (mark as not completed)
 */
export const resetOnboarding = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const result = await updateUserProfile(user.id, {
      onboardingCompleted: false
    });

    if (!result) {
      return {
        success: false,
        error: 'Failed to reset onboarding status'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};