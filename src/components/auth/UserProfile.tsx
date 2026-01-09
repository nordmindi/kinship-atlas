import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  User,
  LogOut,
  Settings,
  Mail,
  Calendar,
  Shield,
  ChevronDown,
  UserCircle,
  Key,
  Database,
  Camera,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { performCompleteLogout } from '@/utils/authUtils';
import { uploadMedia } from '@/services/mediaService';
import { updateUserProfile } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileProps {
  variant?: 'dropdown' | 'page';
  onProfileClick?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  variant = 'dropdown',
  onProfileClick
}) => {
  const { user, signOut, refreshUserProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Safety timeout to prevent infinite saving state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isSaving) {
      timeoutId = setTimeout(() => {
        if (isSaving) {
          console.warn('Save operation timed out via safety effect');
          setIsSaving(false);
          toast({
            title: "Operation timed out",
            description: "The save operation took too long. Please check your connection and try again.",
            variant: "destructive"
          });
        }
      }, 30000); // 30 second absolute max timeout
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSaving]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    }
  }, [user]);

  // Helper to enforce timeouts on promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000, operationName: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Use comprehensive logout utility
      const result = await performCompleteLogout();

      if (result.success) {
        toast({
          title: "Signed out successfully",
          description: "You have been signed out of your account.",
        });
        // Refresh the page to clear any remaining state
        window.location.href = '/auth';
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    console.log('Starting profile save...');
    try {
      let avatarUrl = user.user_metadata?.avatar_url;

      // 1. Upload new avatar if selected
      if (avatarFile) {
        console.log('Uploading avatar...');
        try {
          const uploadedMedia = await withTimeout(
            uploadMedia({
              file: avatarFile,
              mediaType: 'image',
              caption: `Profile picture for ${displayName}`
            }),
            15000, // 15s for upload
            'Avatar upload'
          );

          if (uploadedMedia) {
            avatarUrl = uploadedMedia.url;
            console.log('Avatar uploaded:', avatarUrl);
          }
        } catch (uploadError) {
          console.error('Avatar upload failed:', uploadError);
          // Continue even if avatar upload fails, but warn user
          toast({
            title: "Avatar upload failed",
            description: "Could not upload profile picture, but we'll try to save your name.",
            variant: "destructive"
          });
        }
      }

      // 2. Update Supabase Auth Metadata
      console.log('Updating auth metadata...');
      const { error: authError } = await withTimeout(
        supabase.auth.updateUser({
          data: {
            full_name: displayName,
            avatar_url: avatarUrl
          }
        }),
        5000,
        'Auth update'
      );

      if (authError) throw authError;

      // 3. Update User Profile Table
      console.log('Updating user profile table...');
      const updateResult = await withTimeout(
        updateUserProfile(user.id, {
          displayName: displayName,
        }),
        5000,
        'Profile table update'
      );
      console.log('User profile table update result:', updateResult);

      // 4. Refresh context
      console.log('Refreshing user profile context...');
      try {
        await withTimeout(refreshUserProfile(), 5000, 'Profile refresh');
        console.log('User profile context refreshed');
      } catch (refreshError) {
        console.error('Error refreshing user profile:', refreshError);
        // Don't block success message if refresh fails
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "There was an error updating your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Ensure we always turn off saving state
      if (isSaving) {
        setIsSaving(false);
      }
      console.log('Profile save completed');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset display name
    setDisplayName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
  };

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const formatUserCreatedDate = (createdAt: string) => {
    try {
      return format(new Date(createdAt), 'MMMM d, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  const getUserRole = () => {
    if (user?.app_metadata?.provider === 'email') {
      return 'Email User';
    }
    return 'User';
  };

  if (!user) {
    return null;
  }

  if (variant === 'page') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                    <AvatarImage src={avatarPreview || user.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xl">
                      {getUserInitials(user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <label htmlFor="avatar-upload" className="cursor-pointer p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors">
                        <Camera className="h-6 w-6 text-white" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="display-name" className="sr-only">Display Name</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Display Name"
                        className="h-9"
                      />
                    </div>
                  ) : (
                    <CardTitle className="text-2xl">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                    </CardTitle>
                  )}

                  <CardDescription className="text-base">
                    {user.email}
                  </CardDescription>
                  <Badge variant="secondary" className="mt-1">
                    {getUserRole()}
                  </Badge>
                </div>
              </div>

              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing && (
              <div className="flex justify-end space-x-2 mb-4">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {formatUserCreatedDate(user.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Verified</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email_confirmed_at ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-sm text-muted-foreground font-mono text-xs">
                      {user.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Sign In</p>
                    <p className="text-sm text-muted-foreground">
                      {user.last_sign_in_at
                        ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy h:mm a')
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-4" />

            <div className="flex flex-col sm:flex-row gap-3">
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={onProfileClick}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={handleSignOut}
                disabled={isSigningOut || isSaving}
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs">
              {getUserInitials(user.email || '')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfileClick}>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
