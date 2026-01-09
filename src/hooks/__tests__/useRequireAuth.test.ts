import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRequireAuth, useIsAuthenticated, useHasRole } from '../useRequireAuth'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

// Mock dependencies
vi.mock('@/contexts/AuthContext')
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}))

describe('useRequireAuth', () => {
  const mockNavigate = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useLocation).mockReturnValue({
      pathname: '/test',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    })
  })

  describe('authentication state', () => {
    it('should return loading state when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: true,
        role: null,
      } as any)

      const { result } = renderHook(() => useRequireAuth({ skipRedirect: true }))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.showLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should return authenticated state for logged in user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123' },
        userProfile: { role: 'viewer' },
        isLoading: false,
        role: 'viewer',
      } as any)

      const { result } = renderHook(() => useRequireAuth({ skipRedirect: true }))

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      expect(result.current.role).toBe('viewer')
    })

    it('should return not authenticated for logged out user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: false,
        role: null,
      } as any)

      const { result } = renderHook(() => useRequireAuth({ skipRedirect: true }))

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAuthorized).toBe(false)
    })
  })

  describe('role-based authorization', () => {
    it('should be authorized when user has required role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123' },
        userProfile: { role: 'admin' },
        isLoading: false,
        role: 'admin',
      } as any)

      const { result } = renderHook(() => 
        useRequireAuth({ allowedRoles: ['admin'], skipRedirect: true })
      )

      expect(result.current.isAuthorized).toBe(true)
      expect(result.current.showUnauthorized).toBe(false)
    })

    it('should be authorized when user has one of multiple allowed roles', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123' },
        userProfile: { role: 'editor' },
        isLoading: false,
        role: 'editor',
      } as any)

      const { result } = renderHook(() => 
        useRequireAuth({ allowedRoles: ['admin', 'editor'], skipRedirect: true })
      )

      expect(result.current.isAuthorized).toBe(true)
    })

    it('should not be authorized when user lacks required role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123' },
        userProfile: { role: 'viewer' },
        isLoading: false,
        role: 'viewer',
      } as any)

      const { result } = renderHook(() => 
        useRequireAuth({ allowedRoles: ['admin'], skipRedirect: true })
      )

      expect(result.current.isAuthorized).toBe(false)
      expect(result.current.showUnauthorized).toBe(true)
    })
  })

  describe('redirects', () => {
    it('should redirect to /auth when not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: false,
        role: null,
      } as any)

      renderHook(() => useRequireAuth())

      expect(mockNavigate).toHaveBeenCalledWith('/auth', {
        state: { from: '/test' },
        replace: true,
      })
    })

    it('should redirect to custom path when specified', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: false,
        role: null,
      } as any)

      renderHook(() => useRequireAuth({ redirectTo: '/login' }))

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { from: '/test' },
        replace: true,
      })
    })

    it('should redirect to unauthorized path when role check fails', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123' },
        userProfile: { role: 'viewer' },
        isLoading: false,
        role: 'viewer',
      } as any)

      renderHook(() => useRequireAuth({ 
        allowedRoles: ['admin'],
        unauthorizedRedirect: '/forbidden'
      }))

      expect(mockNavigate).toHaveBeenCalledWith('/forbidden', {
        state: { from: '/test', reason: 'unauthorized' },
        replace: true,
      })
    })

    it('should not redirect when skipRedirect is true', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: false,
        role: null,
      } as any)

      renderHook(() => useRequireAuth({ skipRedirect: true }))

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should not redirect while loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: true,
        role: null,
      } as any)

      renderHook(() => useRequireAuth())

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})

describe('useIsAuthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useIsAuthenticated())

    expect(result.current).toBe(true)
  })

  it('should return false when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useIsAuthenticated())

    expect(result.current).toBe(false)
  })

  it('should return false while loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: true,
    } as any)

    const { result } = renderHook(() => useIsAuthenticated())

    expect(result.current).toBe(false)
  })
})

describe('useHasRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when user has the role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
      role: 'admin',
    } as any)

    const { result } = renderHook(() => useHasRole(['admin']))

    expect(result.current).toBe(true)
  })

  it('should return true when user has one of multiple roles', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
      role: 'editor',
    } as any)

    const { result } = renderHook(() => useHasRole(['admin', 'editor']))

    expect(result.current).toBe(true)
  })

  it('should return false when user does not have the role', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
      role: 'viewer',
    } as any)

    const { result } = renderHook(() => useHasRole(['admin']))

    expect(result.current).toBe(false)
  })

  it('should return false when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      role: null,
    } as any)

    const { result } = renderHook(() => useHasRole(['admin']))

    expect(result.current).toBe(false)
  })

  it('should return false while loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: true,
      role: 'admin',
    } as any)

    const { result } = renderHook(() => useHasRole(['admin']))

    expect(result.current).toBe(false)
  })
})
