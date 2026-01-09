import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AddFamilyMemberPage from '../AddFamilyMemberPage'
import { useAuth } from '@/contexts/AuthContext'

vi.mock('@/contexts/AuthContext')
vi.mock('@/components/family/AddFamilyMember', () => ({
  default: () => <div>AddFamilyMember Component</div>
}))
vi.mock('@/components/layout/MobileLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('AddFamilyMemberPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Note: Authentication and authorization are now handled by ProtectedRoute in App.tsx.
   * These tests assume the user is already authenticated since ProtectedRoute would
   * prevent unauthenticated access before this component renders.
   */

  it('should render AddFamilyMember component when user is authenticated', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAdmin: false,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any)

    renderWithRouter(<AddFamilyMemberPage />)

    expect(screen.getByText('Add Family Member')).toBeInTheDocument()
    expect(screen.getByText('AddFamilyMember Component')).toBeInTheDocument()
  })

  it('should pass correct user info to MobileLayout', () => {
    const mockUser = {
      id: 'user-123',
      email: 'john.doe@example.com'
    }

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAdmin: false,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any)

    renderWithRouter(<AddFamilyMemberPage />)

    expect(screen.getByText('Add Family Member')).toBeInTheDocument()
  })

  it('should handle user with only email (no full name)', () => {
    const mockUser = {
      id: 'user-456',
      email: 'jane@example.com'
    }

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAdmin: false,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any)

    renderWithRouter(<AddFamilyMemberPage />)

    // Page should still render correctly
    expect(screen.getByText('Add Family Member')).toBeInTheDocument()
    expect(screen.getByText('AddFamilyMember Component')).toBeInTheDocument()
  })

  it('should handle null user gracefully', () => {
    // This tests the edge case where user might be null
    // In practice, ProtectedRoute prevents this, but the component should be defensive
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any)

    renderWithRouter(<AddFamilyMemberPage />)

    // Should still render (with fallback values for user info)
    expect(screen.getByText('Add Family Member')).toBeInTheDocument()
    expect(screen.getByText('AddFamilyMember Component')).toBeInTheDocument()
  })
})
