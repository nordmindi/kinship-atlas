import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUsers } from '@/services/userService';
import { getFamilyMembers } from '@/services/supabaseService';
import { familyMemberService } from '@/services/familyMemberService';
import { storyService } from '@/services/storyService';
import { getAllMedia } from '@/services/mediaService';
import { familyRelationshipManager } from '@/services/familyRelationshipManager';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/services/userService');
vi.mock('@/services/supabaseService');
vi.mock('@/services/familyMemberService');
vi.mock('@/services/storyService');
vi.mock('@/services/mediaService');
vi.mock('@/services/familyRelationshipManager');
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  id: 'admin-123',
  email: 'admin@test.com',
};

const mockUsers: any[] = [
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

const mockFamilyMembers: any[] = [
  {
    id: 'member-1',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01',
    createdBy: 'user-1',
    relations: [],
  },
];

const mockStories: any[] = [
  {
    id: 'story-1',
    title: 'Test Story',
    content: 'Story content',
    authorId: 'user-1',
    date: '2024-01-01',
    relatedMembers: [],
  },
];

const mockMedia: any[] = [
  {
    id: 'media-1',
    fileName: 'test.jpg',
    caption: 'Test image',
    mediaType: 'image',
    createdAt: '2024-01-01T00:00:00Z',
    fileSize: 1024,
  },
];

const mockRelations: any[] = [
  {
    id: 'relation-1',
    fromMemberId: 'member-1',
    toMemberId: 'member-2',
    relationType: 'parent',
    fromMember: { firstName: 'John', lastName: 'Doe' },
    toMember: { firstName: 'Jane', lastName: 'Doe' },
  },
];

const renderAdminDashboard = () => {
  return render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAdmin: true,
      userProfile: { id: 'admin-123', role: 'admin' } as any,
      session: null,
      isLoading: false,
      isEditor: false,
      isViewer: false,
      role: 'admin',
      canWrite: true,
      canDelete: true,
      canManageUsers: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshUserProfile: vi.fn(),
    });

    vi.mocked(getAllUsers).mockResolvedValue(mockUsers);
    vi.mocked(getFamilyMembers).mockResolvedValue(mockFamilyMembers);
    vi.mocked(storyService.getAllStories).mockResolvedValue(mockStories);
    vi.mocked(getAllMedia).mockResolvedValue(mockMedia);
    vi.mocked(familyRelationshipManager.getAllRelations).mockResolvedValue(mockRelations);
  });

  it('should render loading state initially', async () => {
    vi.mocked(getAllUsers).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderAdminDashboard();
    
    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument();
  });

  it('should render admin dashboard with stats cards', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      const familyMembersElements = screen.queryAllByText('Family Members');
      expect(familyMembersElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Stories')).toBeInTheDocument();
      expect(screen.getByText('Media')).toBeInTheDocument();
    });
  });

  it('should display correct user count in stats', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total users
    });
  });

  it('should render all tabs', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
      const familyMembersElements = screen.queryAllByText('Family Members');
      expect(familyMembersElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Stories')).toBeInTheDocument();
      expect(screen.getByText('Media')).toBeInTheDocument();
      expect(screen.getByText('Connections')).toBeInTheDocument();
    });
  });

  it('should render search input', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('should render back to home button', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Back to home')).toBeInTheDocument();
    });
  });

  it('should render import and export buttons', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  it('should navigate to home when back to home button is clicked', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back to Home');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle data loading errors gracefully', async () => {
    vi.mocked(getAllUsers).mockRejectedValue(new Error('Failed to load'));

    renderAdminDashboard();

    await waitFor(() => {
      // Should still render the dashboard even if data loading fails
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('should display users tab content', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Editor User')).toBeInTheDocument();
    });
  });

  it('should display family members tab content when clicked', async () => {
    renderAdminDashboard();

    await waitFor(() => {
      const membersTabs = screen.getAllByText('Family Members');
      // Click the tab button (usually the first one in the tab list)
      const tabButton = membersTabs.find(el => el.closest('button[role="tab"]'));
      if (tabButton) {
        tabButton.click();
      } else {
        membersTabs[0].click();
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Family Members Management')).toBeInTheDocument();
    });
  });
});

