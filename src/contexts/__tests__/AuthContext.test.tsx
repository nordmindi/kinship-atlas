import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { supabase } from '@/integrations/supabase/client'

// Mock the supabase client
vi.mock('@/integrations/supabase/client')

// Test component to access auth context
const TestComponent = () => {
  const { 
    user, 
    isLoading, 
    signIn, 
    signUp, 
    signOut, 
    refreshSession,
    isSessionExpiringSoon 
  } = useAuth()
  
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="expiring-soon">{isSessionExpiringSoon ? 'Expiring soon' : 'Not expiring'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <button onClick={() => refreshSession()}>Refresh Session</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication State', () => {
    it('should provide initial loading state', () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    })

    it('should provide user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        expires_at: 9999999999,
        expires_in: 3600,
        refresh_token: 'refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })
    })

    it('should handle authentication errors', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: new Error('Authentication failed')
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })
    })
  })

  describe('Sign In', () => {
    it('should sign in successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Click sign in button
      screen.getByText('Sign In').click()

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        })
      })
    })

    it('should handle sign in errors', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid credentials')
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Click sign in button
      screen.getByText('Sign In').click()

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        })
      })
    })
  })

  describe('Sign Up', () => {
    it('should sign up successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Click sign up button
      screen.getByText('Sign Up').click()

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        })
      })
    })

    it('should handle sign up errors', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Email already registered')
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Click sign up button
      screen.getByText('Sign Up').click()

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        })
      })
    })
  })

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        expires_at: 9999999999,
        expires_in: 3600,
        refresh_token: 'refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      }, { timeout: 3000 })

      // Click sign out button
      screen.getByText('Sign Out').click()

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled()
      })
    })

    it('should handle sign out errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        expires_at: 9999999999,
        expires_in: 3600,
        refresh_token: 'refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: new Error('Sign out failed')
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      }, { timeout: 3000 })

      // Click sign out button
      screen.getByText('Sign Out').click()

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled()
      })
    })
  })

  describe('Session Refresh', () => {
    it('should refresh session successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      const mockSession = {
        user: mockUser,
        access_token: 'new-token',
        expires_at: 9999999999,
        expires_in: 3600,
        refresh_token: 'new-refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })
      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Click refresh session button
      screen.getByText('Refresh Session').click()

      await waitFor(() => {
        expect(supabase.auth.refreshSession).toHaveBeenCalled()
      })
    })

    it('should handle refresh session errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        expires_at: 9999999999,
        expires_in: 3600,
        refresh_token: 'refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })
      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Invalid Refresh Token')
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Click refresh session button
      screen.getByText('Refresh Session').click()

      await waitFor(() => {
        expect(supabase.auth.refreshSession).toHaveBeenCalled()
      })
    })
  })

  describe('Session Expiry Warning', () => {
    it('should show expiring soon when session is about to expire', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      // Session expires in 3 minutes (180 seconds)
      const expiresAt = Math.floor(Date.now() / 1000) + 180
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        expires_at: expiresAt,
        expires_in: 180,
        refresh_token: 'refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Session expires in 3 minutes, which is less than 5 minutes warning threshold
      await waitFor(() => {
        expect(screen.getByTestId('expiring-soon')).toHaveTextContent('Expiring soon')
      }, { timeout: 3000 })
    })

    it('should not show expiring soon for fresh session', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z'
      }
      // Session expires in 1 hour (3600 seconds)
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const mockSession = {
        user: mockUser,
        access_token: 'token',
        expires_at: expiresAt,
        expires_in: 3600,
        refresh_token: 'refresh',
        token_type: 'bearer'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      } as { data: { subscription: { unsubscribe: () => void } } })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      }, { timeout: 3000 })

      // Session expires in 1 hour, which is more than 5 minutes warning threshold
      expect(screen.getByTestId('expiring-soon')).toHaveTextContent('Not expiring')
    })
  })
})
