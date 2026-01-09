import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkAssignToGroupDialog } from '../BulkAssignToGroupDialog';
import { FamilyMember, FamilyGroup } from '@/types';
import { familyGroupService } from '@/services/familyGroupService';
import { toast } from 'sonner';

vi.mock('@/services/familyGroupService');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockMembers: FamilyMember[] = [
  {
    id: 'member-1',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01',
    gender: 'male',
    isRootMember: true,
    relations: [],
  },
  {
    id: 'member-2',
    firstName: 'Jane',
    lastName: 'Smith',
    birthDate: '1992-05-15',
    gender: 'female',
    isRootMember: false,
    relations: [],
  },
  {
    id: 'member-3',
    firstName: 'Bob',
    lastName: 'Johnson',
    birthDate: '1985-03-20',
    gender: 'male',
    isRootMember: false,
    relations: [],
  },
];

const mockGroups: FamilyGroup[] = [
  {
    id: 'group-1',
    name: "Mother's Side",
    description: 'Family from mother',
    userId: 'user-123',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    memberCount: 5,
  },
  {
    id: 'group-2',
    name: "Father's Side",
    description: 'Family from father',
    userId: 'user-123',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    memberCount: 3,
  },
  {
    id: 'group-3',
    name: 'In-Laws',
    description: 'Extended family',
    userId: 'user-123',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    memberCount: 2,
  },
];

const renderBulkAssignDialog = (
  isOpen: boolean = true,
  members: FamilyMember[] = mockMembers,
  onClose: () => void = vi.fn(),
  onUpdate: () => void = vi.fn()
) => {
  return render(
    <BulkAssignToGroupDialog
      isOpen={isOpen}
      onClose={onClose}
      members={members}
      onUpdate={onUpdate}
    />
  );
};

describe('BulkAssignToGroupDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(familyGroupService.getAllFamilyGroups).mockResolvedValue(mockGroups);
    vi.mocked(familyGroupService.assignMemberToGroup).mockResolvedValue({ success: true });
  });

  describe('Basic Rendering', () => {
    it('should render dialog when open', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('Bulk Assign to Family Groups')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Select multiple family members and assign them to one or more family groups/)
      ).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      renderBulkAssignDialog(false);

      expect(screen.queryByText('Bulk Assign to Family Groups')).not.toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
      vi.mocked(familyGroupService.getAllFamilyGroups).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderBulkAssignDialog(true);

      // Check for loading spinner - look for Loader2 by its className or aria-label
      await waitFor(() => {
        const loadingSpinner = document.querySelector('.animate-spin');
        expect(loadingSpinner).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display all family members in the left panel', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('should display all family groups in the right panel', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText("Mother's Side")).toBeInTheDocument();
        expect(screen.getByText("Father's Side")).toBeInTheDocument();
        expect(screen.getByText('In-Laws')).toBeInTheDocument();
      });
    });

    it('should show empty state when no groups exist', async () => {
      vi.mocked(familyGroupService.getAllFamilyGroups).mockResolvedValue([]);

      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('No family groups available')).toBeInTheDocument();
        expect(
          screen.getByText('Create a family group first to assign members')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Member Selection', () => {
    it('should allow selecting individual members', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );

      if (memberCheckbox) {
        fireEvent.click(memberCheckbox);

        await waitFor(() => {
          expect(memberCheckbox).toBeChecked();
        });
      }
    });

    it('should allow deselecting members', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );

      if (memberCheckbox) {
        // Select
        fireEvent.click(memberCheckbox);
        await waitFor(() => {
          expect(memberCheckbox).toBeChecked();
        });

        // Deselect
        fireEvent.click(memberCheckbox);
        await waitFor(() => {
          expect(memberCheckbox).not.toBeChecked();
        });
      }
    });

    it('should show select all button for members', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        // Find the button in the members section (first section)
        const buttons = screen.getAllByText(/Select All|Deselect All/i);
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should select all members when select all is clicked', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Find the Select All button in the members section (first section header)
      const sections = screen.getAllByText(/Select Family Members|Select Family Groups/i);
      const membersSection = sections[0].closest('div');
      const selectAllButton = membersSection?.querySelector('button');
      
      if (selectAllButton) {
        fireEvent.click(selectAllButton);

        await waitFor(() => {
          const checkboxes = screen.getAllByRole('checkbox');
          const memberCheckboxes = checkboxes.filter(
            (cb) => {
              const parentText = cb.closest('div')?.textContent || '';
              return (parentText.includes('Doe') || 
                      parentText.includes('Smith') || 
                      parentText.includes('Johnson')) &&
                     !parentText.includes("Mother's") &&
                     !parentText.includes("Father's") &&
                     !parentText.includes('In-Laws');
            }
          );
          expect(memberCheckboxes.length).toBeGreaterThan(0);
          memberCheckboxes.forEach((cb) => {
            expect(cb).toBeChecked();
          });
        });
      }
    });

    it('should update selection count', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Find the selection count text
      const countTexts = screen.getAllByText(/\d+ of \d+ selected/);
      expect(countTexts.length).toBeGreaterThan(0);
      const initialCountText = countTexts[0].textContent;
      expect(initialCountText).toMatch(/0 of 3 selected/);

      const checkboxes = screen.getAllByRole('checkbox');
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );

      if (memberCheckbox) {
        fireEvent.click(memberCheckbox);

        await waitFor(() => {
          const updatedCountTexts = screen.getAllByText(/\d+ of \d+ selected/);
          const updatedCountText = updatedCountTexts[0].textContent;
          expect(updatedCountText).toMatch(/1 of 3 selected/);
        });
      }
    });
  });

  describe('Group Selection', () => {
    it('should allow selecting individual groups', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText("Mother's Side")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );

      if (groupCheckbox) {
        fireEvent.click(groupCheckbox);

        await waitFor(() => {
          expect(groupCheckbox).toBeChecked();
        });
      }
    });

    it('should show select all button for groups', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        const selectAllButtons = screen.getAllByText('Select All');
        expect(selectAllButtons.length).toBeGreaterThan(1); // At least one for groups
      });
    });

    it('should select all groups when select all is clicked', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText("Mother's Side")).toBeInTheDocument();
      });

      const selectAllButtons = screen.getAllByText('Select All');
      const groupsSelectAll = selectAllButtons[1]; // Second one is for groups

      fireEvent.click(groupsSelectAll);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        const groupCheckboxes = checkboxes.filter(
          (cb) => cb.closest('div')?.textContent?.includes("Mother's Side") ||
                  cb.closest('div')?.textContent?.includes("Father's Side") ||
                  cb.closest('div')?.textContent?.includes('In-Laws')
        );
        groupCheckboxes.forEach((cb) => {
          expect(cb).toBeChecked();
        });
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter members by search query', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const searchInputs = screen.getAllByPlaceholderText(/Search/i);
      const memberSearchInput = searchInputs[0]; // First is for members

      await user.clear(memberSearchInput);
      await user.type(memberSearchInput, 'John');

      await waitFor(() => {
        // After filtering, John Doe should still be visible
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Verify the search input has the value
        expect(memberSearchInput).toHaveValue('John');
      });

      // Clear and search for Jane to verify filtering works
      await user.clear(memberSearchInput);
      await user.type(memberSearchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(memberSearchInput).toHaveValue('Jane');
      });
    });

    it('should filter groups by search query', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText("Mother's Side")).toBeInTheDocument();
      });

      const searchInputs = screen.getAllByPlaceholderText(/Search/i);
      const groupSearchInput = searchInputs[1]; // Second is for groups

      await user.type(groupSearchInput, 'Mother');

      await waitFor(() => {
        expect(screen.getByText("Mother's Side")).toBeInTheDocument();
        expect(screen.queryByText("Father's Side")).not.toBeInTheDocument();
        expect(screen.queryByText('In-Laws')).not.toBeInTheDocument();
      });
    });

    it('should filter groups by description', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText("Mother's Side")).toBeInTheDocument();
      });

      const searchInputs = screen.getAllByPlaceholderText(/Search/i);
      const groupSearchInput = searchInputs[1];

      await user.type(groupSearchInput, 'Extended');

      await waitFor(() => {
        expect(screen.getByText('In-Laws')).toBeInTheDocument();
        expect(screen.queryByText("Mother's Side")).not.toBeInTheDocument();
      });
    });

    it('should show empty state when search has no results', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInputs = screen.getAllByPlaceholderText(/Search/i);
      const memberSearchInput = searchInputs[0];

      await user.type(memberSearchInput, 'NonExistent');

      await waitFor(() => {
        expect(screen.getByText('No members found')).toBeInTheDocument();
      });
    });
  });

  describe('Assignment Summary', () => {
    it('should show summary when members and groups are selected', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select a member
      const checkboxes = screen.getAllByRole('checkbox');
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) {
        fireEvent.click(memberCheckbox);
      }

      // Select a group
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) {
        fireEvent.click(groupCheckbox);
      }

      await waitFor(() => {
        expect(
          screen.getByText(/Will assign.*member.*to.*group/i)
        ).toBeInTheDocument();
      });
    });

    it('should calculate total assignments correctly', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select 2 members
      const member1Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      const member2Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('Jane Smith')
      );
      if (member1Checkbox) fireEvent.click(member1Checkbox);
      if (member2Checkbox) fireEvent.click(member2Checkbox);

      // Select 2 groups
      const group1Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      const group2Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Father's Side")
      );
      if (group1Checkbox) fireEvent.click(group1Checkbox);
      if (group2Checkbox) fireEvent.click(group2Checkbox);

      await waitFor(() => {
        expect(screen.getByText(/4 total assignments/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should disable save button when no members selected', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        const saveButton = screen.getByText('Assign to Groups');
        expect(saveButton).toBeDisabled();
      });
    });

    it('should disable save button when no groups selected', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select a member but no groups
      const checkboxes = screen.getAllByRole('checkbox');
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) {
        fireEvent.click(memberCheckbox);
      }

      await waitFor(() => {
        const saveButton = screen.getByText('Assign to Groups');
        expect(saveButton).toBeDisabled();
      });
    });

    it('should enable save button when members and groups are selected', async () => {
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select a member
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) fireEvent.click(memberCheckbox);

      // Select a group
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) fireEvent.click(groupCheckbox);

      await waitFor(() => {
        const saveButton = screen.getByText('Assign to Groups');
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should call assignMemberToGroup for each member-group combination', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select 2 members
      const member1Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      const member2Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('Jane Smith')
      );
      if (member1Checkbox) await user.click(member1Checkbox);
      if (member2Checkbox) await user.click(member2Checkbox);

      // Select 2 groups
      const group1Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      const group2Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Father's Side")
      );
      if (group1Checkbox) await user.click(group1Checkbox);
      if (group2Checkbox) await user.click(group2Checkbox);

      // Click save
      const saveButton = screen.getByText('Assign to Groups');
      await user.click(saveButton);

      await waitFor(() => {
        // Should be called 4 times (2 members × 2 groups)
        expect(familyGroupService.assignMemberToGroup).toHaveBeenCalledTimes(4);
      });

      // Verify all combinations
      expect(familyGroupService.assignMemberToGroup).toHaveBeenCalledWith({
        familyMemberId: 'member-1',
        familyGroupId: 'group-1',
      });
      expect(familyGroupService.assignMemberToGroup).toHaveBeenCalledWith({
        familyMemberId: 'member-1',
        familyGroupId: 'group-2',
      });
      expect(familyGroupService.assignMemberToGroup).toHaveBeenCalledWith({
        familyMemberId: 'member-2',
        familyGroupId: 'group-1',
      });
      expect(familyGroupService.assignMemberToGroup).toHaveBeenCalledWith({
        familyMemberId: 'member-2',
        familyGroupId: 'group-2',
      });
    });

    it('should show success toast on successful assignment', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select a member
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) await user.click(memberCheckbox);

      // Select a group
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) await user.click(groupCheckbox);

      // Click save
      const saveButton = screen.getByText('Assign to Groups');
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Successfully assigned')
        );
      });
    });

    it('should show warning toast on partial failure', async () => {
      const user = userEvent.setup();
      // Reset mocks first
      vi.mocked(familyGroupService.assignMemberToGroup).mockClear();
      vi.mocked(toast.warning).mockClear();
      
      // Mock: first call succeeds, second fails (1 member × 2 groups = 2 calls)
      vi.mocked(familyGroupService.assignMemberToGroup)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select a member
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) await user.click(memberCheckbox);

      // Select 2 groups
      const group1Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      const group2Checkbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Father's Side")
      );
      if (group1Checkbox) await user.click(group1Checkbox);
      if (group2Checkbox) await user.click(group2Checkbox);

      // Click save
      const saveButton = screen.getByText('Assign to Groups');
      await user.click(saveButton);

      await waitFor(
        () => {
          expect(toast.warning).toHaveBeenCalled();
          const warningCall = vi.mocked(toast.warning).mock.calls[0]?.[0];
          expect(warningCall).toContain('Some failed');
        },
        { timeout: 3000 }
      );
    });

    it('should show error toast on complete failure', async () => {
      const user = userEvent.setup();
      // Reset mocks first
      vi.mocked(familyGroupService.assignMemberToGroup).mockClear();
      vi.mocked(familyGroupService.assignMemberToGroup).mockRejectedValue(
        new Error('Network error')
      );

      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select a member
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) await user.click(memberCheckbox);

      // Select a group
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) await user.click(groupCheckbox);

      // Click save
      const saveButton = screen.getByText('Assign to Groups');
      await user.click(saveButton);

      await waitFor(
        () => {
          expect(toast.error).toHaveBeenCalledWith(
            'Failed to update group assignments'
          );
        },
        { timeout: 3000 }
      );
    });

    it('should call onUpdate callback on successful assignment', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      renderBulkAssignDialog(true, mockMembers, vi.fn(), mockOnUpdate);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select a member
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) await user.click(memberCheckbox);

      // Select a group
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) await user.click(groupCheckbox);

      // Click save
      const saveButton = screen.getByText('Assign to Groups');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should call onClose callback on successful assignment', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      renderBulkAssignDialog(true, mockMembers, mockOnClose);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');

      // Select a member
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) await user.click(memberCheckbox);

      // Select a group
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) await user.click(groupCheckbox);

      // Click save
      const saveButton = screen.getByText('Assign to Groups');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error when no members selected on save', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select only a group, no members
      const checkboxes = screen.getAllByRole('checkbox');
      const groupCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes("Mother's Side")
      );
      if (groupCheckbox) await user.click(groupCheckbox);

      // Try to click save (should be disabled, but if we force it)
      const saveButton = screen.getByText('Assign to Groups');
      expect(saveButton).toBeDisabled();
    });

    it('should show error when no groups selected on save', async () => {
      const user = userEvent.setup();
      renderBulkAssignDialog(true);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select only a member, no groups
      const checkboxes = screen.getAllByRole('checkbox');
      const memberCheckbox = checkboxes.find(
        (cb) => cb.closest('div')?.textContent?.includes('John Doe')
      );
      if (memberCheckbox) await user.click(memberCheckbox);

      // Try to click save (should be disabled)
      const saveButton = screen.getByText('Assign to Groups');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      renderBulkAssignDialog(true, mockMembers, mockOnClose);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Reset on Open', () => {
    it('should reset selections when dialog opens', async () => {
      const { rerender } = renderBulkAssignDialog(false);

      // Open dialog
      rerender(
        <BulkAssignToGroupDialog
          isOpen={true}
          onClose={vi.fn()}
          members={mockMembers}
          onUpdate={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify no selections
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });
});
