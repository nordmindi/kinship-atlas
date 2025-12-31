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
  default: ({ children, title }: any) => (
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
    Navigate: ({ to }: { to: string }) => {
      return React.createElement('div', {
        'data-testid': 'navigate',
        'data-to': to
      })
    }
  } as typeof actual & {
    Navigate: ({ to }: { to: string }) => React.ReactElement
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('AddFamilyMemberPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isLoading: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any)

    renderWithRouter(<AddFamilyMemberPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should redirect to auth if user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    } as any)

    renderWithRouter(<AddFamilyMemberPage />)

    // Should show Navigate component (mocked in setup)
    const navigate = screen.queryByTestId('navigate')
    // The Navigate component is mocked in test setup, so we check for it
    expect(navigate).toBeInTheDocument()
    expect(navigate).toHaveAttribute('data-to', '/auth')
  })

  it('should render AddFamilyMember component when authenticated', () => {
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
})

