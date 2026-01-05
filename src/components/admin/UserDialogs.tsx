import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfile, UserRole } from '@/types';
import { Crown, UserCheck, UserX } from 'lucide-react';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  isCreating: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onDisplayNameChange: (name: string) => void;
  onRoleChange: (role: UserRole) => void;
  onSubmit: () => void;
}

/**
 * Dialog for creating a new user
 */
export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  email,
  password,
  displayName,
  role,
  isCreating,
  onEmailChange,
  onPasswordChange,
  onDisplayNameChange,
  onRoleChange,
  onSubmit,
}) => {
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = email && password && isValidEmail(email) && password.length >= 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account. The user will be able to sign in with the provided credentials.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="user@example.com"
              aria-invalid={email && !isValidEmail(email)}
            />
            {email && !isValidEmail(email) && (
              <p className="text-sm text-destructive">Please enter a valid email address</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimum 6 characters"
              aria-invalid={password && password.length < 6}
            />
            {password && password.length < 6 && (
              <p className="text-sm text-destructive">Password must be at least 6 characters long</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={(value: UserRole) => onRoleChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div className="flex items-center">
                    <UserX className="h-4 w-4 mr-2" />
                    Viewer
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div className="flex items-center">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Editor
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center">
                    <Crown className="h-4 w-4 mr-2" />
                    Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isCreating || !isFormValid}>
            {isCreating ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  displayName: string;
  isUpdating: boolean;
  onDisplayNameChange: (name: string) => void;
  onSubmit: () => void;
}

/**
 * Dialog for editing user display name
 */
export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  displayName,
  isUpdating,
  onDisplayNameChange,
  onSubmit,
}) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the display name for this user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="editDisplayName">Display Name</Label>
            <Input
              id="editDisplayName"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Enter display name..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPassword: string;
  confirmPassword: string;
  isChanging: boolean;
  onNewPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onSubmit: () => void;
}

/**
 * Dialog for changing user password
 */
export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
  newPassword,
  confirmPassword,
  isChanging,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) => {
  const isFormValid = 
    newPassword.length >= 6 && 
    confirmPassword.length >= 6 && 
    newPassword === confirmPassword;

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          onNewPasswordChange('');
          onConfirmPasswordChange('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Password</DialogTitle>
          <DialogDescription>
            Enter a new password for this user. The password must be at least 6 characters long.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password *</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder="Minimum 6 characters"
              aria-invalid={newPassword && newPassword.length < 6}
            />
            {newPassword && newPassword.length < 6 && (
              <p className="text-sm text-destructive">Password must be at least 6 characters long</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="Re-enter password"
              aria-invalid={confirmPassword && confirmPassword !== newPassword}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Note: Direct password changes require Supabase Auth Admin API. 
            For production, implement via Edge Function with service role key.
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              onNewPasswordChange('');
              onConfirmPasswordChange('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isChanging || !isFormValid}>
            {isChanging ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

