import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock components for testing
const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>
const UnauthorizedContent = () => <div data-testid="unauthorized-content">You are not authorized</div>

// Wrapper component to provide router context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when loading', () => {
    it('should show loading state', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        session: null,
        isLoading: true,
        error: null,
        role: null,
        isAdmin: false,
        isEditor: false,
        isViewer: false,
        canWrite: false,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      // Should show loading state, not protected content
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('when not authenticated', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        session: null,
        isLoading: false,
        error: null,
        role: null,
        isAdmin: false,
        isEditor: false,
        isViewer: false,
        canWrite: false,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })
    })

    it('should not render protected content when not authenticated', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      // Protected content should not be visible
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      // The Navigate mock renders a div with data-testid="navigate"
      expect(screen.getByTestId('navigate')).toBeInTheDocument()
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/auth')
    })

    it('should redirect to custom path when specified', () => {
      render(
        <TestWrapper>
          <ProtectedRoute redirectTo="/login">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login')
    })
  })

  describe('when authenticated', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
    }

    it('should render protected content for authenticated user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser as any,
        userProfile: { id: 'user-123', role: 'viewer', createdAt: '', updatedAt: '' },
        session: { access_token: 'token' } as any,
        isLoading: false,
        error: null,
        role: 'viewer',
        isAdmin: false,
        isEditor: false,
        isViewer: true,
        canWrite: false,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })
  })

  describe('role-based access', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
    }

    it('should allow access when user has required role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser as any,
        userProfile: { id: 'user-123', role: 'admin', createdAt: '', updatedAt: '' },
        session: { access_token: 'token' } as any,
        isLoading: false,
        error: null,
        role: 'admin',
        isAdmin: true,
        isEditor: false,
        isViewer: false,
        canWrite: true,
        canDelete: true,
        canManageUsers: true,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })

      render(
        <TestWrapper>
          <ProtectedRoute allowedRoles={['admin']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should allow access when user has one of multiple allowed roles', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser as any,
        userProfile: { id: 'user-123', role: 'editor', createdAt: '', updatedAt: '' },
        session: { access_token: 'token' } as any,
        isLoading: false,
        error: null,
        role: 'editor',
        isAdmin: false,
        isEditor: true,
        isViewer: false,
        canWrite: true,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })

      render(
        <TestWrapper>
          <ProtectedRoute allowedRoles={['admin', 'editor']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should deny access when user does not have required role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser as any,
        userProfile: { id: 'user-123', role: 'viewer', createdAt: '', updatedAt: '' },
        session: { access_token: 'token' } as any,
        isLoading: false,
        error: null,
        role: 'viewer',
        isAdmin: false,
        isEditor: false,
        isViewer: true,
        canWrite: false,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })

      render(
        <TestWrapper>
          <ProtectedRoute allowedRoles={['admin']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      // Protected content should not be visible
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      // Should redirect (the mock Navigate renders a div)
      expect(screen.getByTestId('navigate')).toBeInTheDocument()
    })

    it('should show custom unauthorized component when provided', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser as any,
        userProfile: { id: 'user-123', role: 'viewer', createdAt: '', updatedAt: '' },
        session: { access_token: 'token' } as any,
        isLoading: false,
        error: null,
        role: 'viewer',
        isAdmin: false,
        isEditor: false,
        isViewer: true,
        canWrite: false,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn(),
        refreshSession: vi.fn(),
        isSessionExpiringSoon: false,
      })

      render(
        <TestWrapper>
          <ProtectedRoute 
            allowedRoles={['admin']}
            unauthorizedComponent={<UnauthorizedContent />}
          >
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('unauthorized-content')).toBeInTheDocument()
    })
  })
})
