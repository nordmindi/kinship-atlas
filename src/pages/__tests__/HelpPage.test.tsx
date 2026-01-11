import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import HelpPage from '../HelpPage'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import * as routerDom from 'react-router-dom'

vi.mock('@/contexts/AuthContext')
vi.mock('@/hooks/usePermissions')
vi.mock('@/components/layout/MobileLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="mobile-layout">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  )
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('HelpPage', () => {
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useNavigate
    vi.mocked(routerDom.useNavigate).mockReturnValue(mockNavigate)
    
    // Default mock for usePermissions
    vi.mocked(usePermissions).mockReturnValue({
      canAddFamilyMember: () => false,
      canCreateStory: () => false,
      canUploadMedia: () => false,
      canManageUsers: false,
      canEditFamilyMember: async () => false,
      canDeleteFamilyMember: () => false,
      canEditStory: () => false,
      canDeleteStory: () => false,
      canEditMedia: () => false,
      canDeleteMedia: () => false,
      checkPermission: () => false,
      clearCache: vi.fn(),
      isAdmin: false,
      isEditor: false,
      isViewer: false,
      canWrite: false,
      canDelete: false,
      isAuthenticated: true,
      role: 'viewer',
    })
  })

  describe('Basic Rendering', () => {
    it('should render help page with title and description', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      expect(screen.getByText('Help & User Guide')).toBeInTheDocument()
      expect(screen.getByText(/Learn how to use Kinship Atlas/i)).toBeInTheDocument()
    })

    it('should render getting started section', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      expect(screen.getAllByText('Getting Started').length).toBeGreaterThan(0)
      expect(screen.getByText(/Kinship Atlas is a comprehensive platform/i)).toBeInTheDocument()
    })
  })

  describe('Role-Based Section Filtering', () => {
    it('should show all sections for viewer role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      // Sections that should be visible to viewers - use getAllByText for sections that appear multiple times
      expect(screen.getAllByText('Getting Started').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Members').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Relationships').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Stories').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Artifacts').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Media & Photos').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Tree').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Groups').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Map').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Timeline').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Search').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Tips & Best Practices').length).toBeGreaterThan(0)

      // Import/Export should NOT be visible to viewers
      expect(screen.queryByText('Import & Export')).not.toBeInTheDocument()
    })

    it('should show import/export section for editor role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'editor' },
        isViewer: false,
        isEditor: true,
        isAdmin: false,
        role: 'editor',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: false,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => false,
        canEditStory: () => true,
        canDeleteStory: () => false,
        canEditMedia: () => true,
        canDeleteMedia: () => false,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: false,
        isEditor: true,
        isViewer: false,
        canWrite: true,
        canDelete: false,
        isAuthenticated: true,
        role: 'editor',
      })

      renderWithRouter(<HelpPage />)

      expect(screen.getAllByText('Import & Export').length).toBeGreaterThan(0)
    })

    it('should show import/export section for admin role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'admin' },
        isViewer: false,
        isEditor: false,
        isAdmin: true,
        role: 'admin',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: true,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => true,
        canEditStory: () => true,
        canDeleteStory: () => true,
        canEditMedia: () => true,
        canDeleteMedia: () => true,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: true,
        isEditor: false,
        isViewer: false,
        canWrite: true,
        canDelete: true,
        isAuthenticated: true,
        role: 'admin',
      })

      renderWithRouter(<HelpPage />)

      expect(screen.getAllByText('Import & Export').length).toBeGreaterThan(0)
    })
  })

  describe('Role-Specific Content', () => {
    it('should show viewing instructions for viewer role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      // Check for viewer-specific content - the text is conditional based on role
      expect(screen.getByText(/Kinship Atlas is a comprehensive platform/i)).toBeInTheDocument()
      expect(screen.getByText('Viewing Family Members')).toBeInTheDocument()
      expect(screen.getByText('Viewing Stories')).toBeInTheDocument()
      expect(screen.getByText('Viewing Media')).toBeInTheDocument()
    })

    it('should show editing instructions for editor role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'editor' },
        isViewer: false,
        isEditor: true,
        isAdmin: false,
        role: 'editor',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: false,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => false,
        canEditStory: () => true,
        canDeleteStory: () => false,
        canEditMedia: () => true,
        canDeleteMedia: () => false,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: false,
        isEditor: true,
        isViewer: false,
        canWrite: true,
        canDelete: false,
        isAuthenticated: true,
        role: 'editor',
      })

      renderWithRouter(<HelpPage />)

      // Check for editor-specific content
      expect(screen.getByText(/Kinship Atlas is a comprehensive platform/i)).toBeInTheDocument()
      expect(screen.getByText('How to Add a Family Member')).toBeInTheDocument()
      expect(screen.getByText('How to Create a Story')).toBeInTheDocument()
      expect(screen.getByText('How to Upload Media')).toBeInTheDocument()
    })

    it('should show admin instructions for admin role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'admin' },
        isViewer: false,
        isEditor: false,
        isAdmin: true,
        role: 'admin',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: true,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => true,
        canEditStory: () => true,
        canDeleteStory: () => true,
        canEditMedia: () => true,
        canDeleteMedia: () => true,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: true,
        isEditor: false,
        isViewer: false,
        canWrite: true,
        canDelete: true,
        isAuthenticated: true,
        role: 'admin',
      })

      renderWithRouter(<HelpPage />)

      // Check for admin-specific content - the text might be slightly different
      const adminText = screen.getByText(/comprehensive platform/i)
      expect(adminText).toBeInTheDocument()
    })
  })

  describe('Permission-Aware Buttons', () => {
    it('should not show action buttons for viewer role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      // Should not show "Try Adding" buttons
      expect(screen.queryByText(/Try Adding a Family Member/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Try Creating a Story/i)).not.toBeInTheDocument()
      
      // Should show "View" buttons instead
      expect(screen.getByText('View Albums')).toBeInTheDocument()
    })

    it('should show action buttons for editor role when permissions allow', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'editor' },
        isViewer: false,
        isEditor: true,
        isAdmin: false,
        role: 'editor',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: false,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => false,
        canEditStory: () => true,
        canDeleteStory: () => false,
        canEditMedia: () => true,
        canDeleteMedia: () => false,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: false,
        isEditor: true,
        isViewer: false,
        canWrite: true,
        canDelete: false,
        isAuthenticated: true,
        role: 'editor',
      })

      renderWithRouter(<HelpPage />)

      expect(screen.getByText('Try Adding a Family Member')).toBeInTheDocument()
      expect(screen.getByText('Try Creating a Story')).toBeInTheDocument()
    })

    it('should show admin dashboard link for admin role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'admin' },
        isViewer: false,
        isEditor: false,
        isAdmin: true,
        role: 'admin',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: true,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => true,
        canEditStory: () => true,
        canDeleteStory: () => true,
        canEditMedia: () => true,
        canDeleteMedia: () => true,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: true,
        isEditor: false,
        isViewer: false,
        canWrite: true,
        canDelete: true,
        isAuthenticated: true,
        role: 'admin',
      })

      renderWithRouter(<HelpPage />)

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate when clicking on action buttons', async () => {
      const user = userEvent.setup()
      
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'editor' },
        isViewer: false,
        isEditor: true,
        isAdmin: false,
        role: 'editor',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: false,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => false,
        canEditStory: () => true,
        canDeleteStory: () => false,
        canEditMedia: () => true,
        canDeleteMedia: () => false,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: false,
        isEditor: true,
        isViewer: false,
        canWrite: true,
        canDelete: false,
        isAuthenticated: true,
        role: 'editor',
      })

      renderWithRouter(<HelpPage />)

      const addMemberButton = screen.getByText('Try Adding a Family Member')
      await user.click(addMemberButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/add-family-member')
      })
    })

    it('should navigate to family tree when clicking view tree button', async () => {
      const user = userEvent.setup()
      
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      const viewTreeButton = screen.getByText('View Family Tree')
      await user.click(viewTreeButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/family-tree')
      })
    })
  })

  describe('Quick Links Section', () => {
    it('should render quick links section', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      expect(screen.getAllByText('Quick Links').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Tree').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Stories').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Albums').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Map').length).toBeGreaterThan(0)
    })

    it('should show admin dashboard link in quick links for admin', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'admin' },
        isViewer: false,
        isEditor: false,
        isAdmin: true,
        role: 'admin',
      } as any)

      vi.mocked(usePermissions).mockReturnValue({
        canAddFamilyMember: () => true,
        canCreateStory: () => true,
        canUploadMedia: () => true,
        canManageUsers: true,
        canEditFamilyMember: async () => true,
        canDeleteFamilyMember: () => true,
        canEditStory: () => true,
        canDeleteStory: () => true,
        canEditMedia: () => true,
        canDeleteMedia: () => true,
        checkPermission: () => true,
        clearCache: vi.fn(),
        isAdmin: true,
        isEditor: false,
        isViewer: false,
        canWrite: true,
        canDelete: true,
        isAuthenticated: true,
        role: 'admin',
      })

      renderWithRouter(<HelpPage />)

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  describe('Support Section', () => {
    it('should render support section with onboarding link for editors', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'editor' },
        isViewer: false,
        isEditor: true,
        isAdmin: false,
        role: 'editor',
      } as any)

      renderWithRouter(<HelpPage />)

      expect(screen.getByText('Need More Help?')).toBeInTheDocument()
      expect(screen.getByText('View Onboarding Tutorial')).toBeInTheDocument()
    })

    it('should not show onboarding link for viewers', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      expect(screen.getByText('Need More Help?')).toBeInTheDocument()
      expect(screen.queryByText('View Onboarding Tutorial')).not.toBeInTheDocument()
    })
  })

  describe('Content Sections', () => {
    it('should render all main content sections', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        userProfile: { id: 'user-123', role: 'viewer' },
        isViewer: true,
        isEditor: false,
        isAdmin: false,
        role: 'viewer',
      } as any)

      renderWithRouter(<HelpPage />)

      // Check for main sections - use getAllByText for sections that appear multiple times
      expect(screen.getAllByText('Family Members').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Relationships').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Stories').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Artifacts').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Media & Photos').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Tree').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Groups').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Map').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Timeline').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Search').length).toBeGreaterThan(0)
    })
  })
})
