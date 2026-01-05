import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { UserManagementTab } from '../UserManagementTab';
import { UserProfile, UserRole } from '@/types';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockUsers: UserProfile[] = [
  {
    id: 'user-1',
    role: 'admin',
    displayName: 'Admin User',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    role: 'editor',
    displayName: 'Editor User',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const defaultProps = {
  users: mockUsers,
  currentUserId: 'admin-123',
  searchQuery: '',
  updatingRole: null,
  isUserDialogOpen: false,
  isEditUserDialogOpen: false,
  isPasswordDialogOpen: false,
  editingUser: null,
  newUserEmail: '',
  newUserPassword: '',
  newUserDisplayName: '',
  newUserRole: 'viewer' as UserRole,
  editingDisplayName: '',
  changingPasswordUserId: null,
  newPassword: '',
  confirmPassword: '',
  isCreatingUser: false,
  isChangingPassword: false,
  isUpdatingDisplayName: false,
  onSetIsUserDialogOpen: vi.fn(),
  onSetIsEditUserDialogOpen: vi.fn(),
  onSetIsPasswordDialogOpen: vi.fn(),
  onSetEditingUser: vi.fn(),
  onSetNewUserEmail: vi.fn(),
  onSetNewUserPassword: vi.fn(),
  onSetNewUserDisplayName: vi.fn(),
  onSetNewUserRole: vi.fn(),
  onSetEditingDisplayName: vi.fn(),
  onSetChangingPasswordUserId: vi.fn(),
  onSetNewPassword: vi.fn(),
  onSetConfirmPassword: vi.fn(),
  onRoleUpdate: vi.fn(),
  onDeleteUser: vi.fn(),
  onCreateUser: vi.fn(),
  onUpdateDisplayName: vi.fn(),
  onChangePassword: vi.fn(),
};

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <UserManagementTab {...defaultProps} {...props} />
    </BrowserRouter>
  );
};

describe('UserManagementTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user management table', () => {
    renderComponent();

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Editor User')).toBeInTheDocument();
  });

  it('should display empty state when no users match search', () => {
    renderComponent({ searchQuery: 'nonexistent' });

    expect(screen.getByText('No users found matching your search.')).toBeInTheDocument();
  });

  it('should filter users by search query', () => {
    renderComponent({ searchQuery: 'Admin' });

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.queryByText('Editor User')).not.toBeInTheDocument();
  });

  it('should open create user dialog when Add User button is clicked', () => {
    const onSetIsUserDialogOpen = vi.fn();
    renderComponent({ onSetIsUserDialogOpen });

    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    expect(onSetIsUserDialogOpen).toHaveBeenCalledWith(true);
  });

  it('should open edit user dialog when edit button is clicked', () => {
    const onSetEditingUser = vi.fn();
    const onSetIsEditUserDialogOpen = vi.fn();
    renderComponent({ onSetEditingUser, onSetIsEditUserDialogOpen });

    const editButtons = screen.getAllByLabelText(/Edit user/);
    fireEvent.click(editButtons[0]);

    expect(onSetEditingUser).toHaveBeenCalled();
    expect(onSetIsEditUserDialogOpen).toHaveBeenCalledWith(true);
  });

  it('should open change password dialog when password button is clicked', () => {
    const onSetChangingPasswordUserId = vi.fn();
    const onSetIsPasswordDialogOpen = vi.fn();
    renderComponent({ onSetChangingPasswordUserId, onSetIsPasswordDialogOpen });

    const passwordButtons = screen.getAllByLabelText(/Change password/);
    fireEvent.click(passwordButtons[0]);

    expect(onSetChangingPasswordUserId).toHaveBeenCalledWith('user-1');
    expect(onSetIsPasswordDialogOpen).toHaveBeenCalledWith(true);
  });

  it('should disable delete button for current user', () => {
    renderComponent({ currentUserId: 'user-1' });

    const deleteButtons = screen.getAllByLabelText(/Delete user/);
    expect(deleteButtons[0]).toBeDisabled();
  });

  it('should render create user dialog when open', () => {
    renderComponent({ isUserDialogOpen: true });

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
    expect(screen.getByLabelText('Password *')).toBeInTheDocument();
  });

  it('should validate email format in create user dialog', async () => {
    const user = userEvent.setup();
    renderComponent({ isUserDialogOpen: true });

    const emailInput = screen.getByLabelText('Email *');
    await user.type(emailInput, 'invalid-email');
    // Trigger blur to validate
    await user.tab();

    await waitFor(() => {
      const errorMessage = screen.queryByText((content, element) => {
        return element?.textContent?.includes('valid email') || element?.textContent?.includes('email address');
      });
      expect(errorMessage || screen.getByText(/valid email|email address/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate password length in create user dialog', async () => {
    const user = userEvent.setup();
    renderComponent({ isUserDialogOpen: true });

    const passwordInput = screen.getByLabelText('Password *');
    await user.type(passwordInput, '123');
    // Trigger blur to validate
    await user.tab();

    await waitFor(() => {
      const errorMessage = screen.queryByText((content, element) => {
        return element?.textContent?.includes('6 characters') || element?.textContent?.includes('at least');
      });
      expect(errorMessage || screen.getByText(/6 characters|at least/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render edit user dialog when open', () => {
    renderComponent({
      isEditUserDialogOpen: true,
      editingUser: mockUsers[0],
      editingDisplayName: 'Updated Name',
    });

    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
  });

  it('should render change password dialog when open', () => {
    renderComponent({
      isPasswordDialogOpen: true,
      changingPasswordUserId: 'user-1',
    });

    expect(screen.getByText('Change User Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password *')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password *')).toBeInTheDocument();
  });
});

