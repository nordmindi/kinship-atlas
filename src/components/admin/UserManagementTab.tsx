import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Crown, UserCheck, UserX, Plus, Edit, Shield, Trash2 } from 'lucide-react';
import { UserProfile, UserRole } from '@/types';
import { CreateUserDialog, EditUserDialog, ChangePasswordDialog } from './UserDialogs';

interface UserManagementTabProps {
  users: UserProfile[];
  currentUserId?: string;
  searchQuery: string;
  updatingRole: string | null;
  isUserDialogOpen: boolean;
  isEditUserDialogOpen: boolean;
  isPasswordDialogOpen: boolean;
  editingUser: UserProfile | null;
  newUserEmail: string;
  newUserPassword: string;
  newUserDisplayName: string;
  newUserRole: UserRole;
  editingDisplayName: string;
  changingPasswordUserId: string | null;
  newPassword: string;
  confirmPassword: string;
  isCreatingUser: boolean;
  isChangingPassword: boolean;
  isUpdatingDisplayName: boolean;
  onSetIsUserDialogOpen: (open: boolean) => void;
  onSetIsEditUserDialogOpen: (open: boolean) => void;
  onSetIsPasswordDialogOpen: (open: boolean) => void;
  onSetEditingUser: (user: UserProfile | null) => void;
  onSetNewUserEmail: (email: string) => void;
  onSetNewUserPassword: (password: string) => void;
  onSetNewUserDisplayName: (name: string) => void;
  onSetNewUserRole: (role: UserRole) => void;
  onSetEditingDisplayName: (name: string) => void;
  onSetChangingPasswordUserId: (userId: string | null) => void;
  onSetNewPassword: (password: string) => void;
  onSetConfirmPassword: (password: string) => void;
  onRoleUpdate: (userId: string, newRole: UserRole) => Promise<void>;
  onDeleteUser: (userId: string, displayName: string) => Promise<void>;
  onCreateUser: () => Promise<void>;
  onUpdateDisplayName: () => Promise<void>;
  onChangePassword: () => Promise<void>;
}

/**
 * User management tab component for admin dashboard
 */
export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  currentUserId,
  searchQuery,
  updatingRole,
  isUserDialogOpen,
  isEditUserDialogOpen,
  isPasswordDialogOpen,
  editingUser,
  newUserEmail,
  newUserPassword,
  newUserDisplayName,
  newUserRole,
  editingDisplayName,
  changingPasswordUserId,
  newPassword,
  confirmPassword,
  isCreatingUser,
  isChangingPassword,
  isUpdatingDisplayName,
  onSetIsUserDialogOpen,
  onSetIsEditUserDialogOpen,
  onSetIsPasswordDialogOpen,
  onSetEditingUser,
  onSetNewUserEmail,
  onSetNewUserPassword,
  onSetNewUserDisplayName,
  onSetNewUserRole,
  onSetEditingDisplayName,
  onSetChangingPasswordUserId,
  onSetNewPassword,
  onSetConfirmPassword,
  onRoleUpdate,
  onDeleteUser,
  onCreateUser,
  onUpdateDisplayName,
  onChangePassword,
}) => {
  const navigate = useNavigate();

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      (user.displayName || '').toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const openEditUserDialog = (user: UserProfile) => {
    onSetEditingUser(user);
    onSetEditingDisplayName(user.displayName || '');
    onSetIsEditUserDialogOpen(true);
  };

  const openChangePasswordDialog = (userId: string) => {
    onSetChangingPasswordUserId(userId);
    onSetNewPassword('');
    onSetConfirmPassword('');
    onSetIsPasswordDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <Button onClick={() => onSetIsUserDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users found matching your search.' : 'No users found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.displayName || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{user.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) => 
                          onRoleUpdate(user.id, newRole)
                        }
                        disabled={updatingRole === user.id}
                      >
                        <SelectTrigger className="w-32">
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
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditUserDialog(user)}
                          aria-label={`Edit user ${user.displayName || user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChangePasswordDialog(user.id)}
                          aria-label={`Change password for ${user.displayName || user.id}`}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={user.id === currentUserId}
                              aria-label={`Delete user ${user.displayName || user.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete user {user.displayName || user.id}? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteUser(user.id, user.displayName || 'User')}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={isUserDialogOpen}
        onOpenChange={onSetIsUserDialogOpen}
        email={newUserEmail}
        password={newUserPassword}
        displayName={newUserDisplayName}
        role={newUserRole}
        isCreating={isCreatingUser}
        onEmailChange={onSetNewUserEmail}
        onPasswordChange={onSetNewUserPassword}
        onDisplayNameChange={onSetNewUserDisplayName}
        onRoleChange={onSetNewUserRole}
        onSubmit={onCreateUser}
      />

      <EditUserDialog
        open={isEditUserDialogOpen}
        onOpenChange={onSetIsEditUserDialogOpen}
        user={editingUser}
        displayName={editingDisplayName}
        isUpdating={isUpdatingDisplayName}
        onDisplayNameChange={onSetEditingDisplayName}
        onSubmit={onUpdateDisplayName}
      />

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={onSetIsPasswordDialogOpen}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        isChanging={isChangingPassword}
        onNewPasswordChange={onSetNewPassword}
        onConfirmPasswordChange={onSetConfirmPassword}
        onSubmit={onChangePassword}
      />
    </>
  );
};

