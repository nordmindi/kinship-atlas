import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePermissions } from '../usePermissions'
import { useAuth } from '@/contexts/AuthContext'
import { canUserEditFamilyMember } from '@/services/userService'

vi.mock('@/contexts/AuthContext')
vi.mock('@/services/userService')

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return correct permissions for admin user', async () => {
    const mockUser = { id: 'user-123', email: 'admin@example.com' } as any
    const mockUserProfile = { id: 'user-123', role: 'admin' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      session: null,
      isLoading: false,
      isAdmin: true,
      isEditor: false,
      isViewer: false,
      role: 'admin' as const,
      canWrite: true,
      canDelete: true,
      canManageUsers: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshUserProfile: vi.fn()
    } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.isAdmin).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.canAddFamilyMember()).toBe(true)
    expect(result.current.canDeleteFamilyMember()).toBe(true)
    expect(result.current.canManageUsers).toBe(true)

    const canEdit = await result.current.canEditFamilyMember('member-123')
    expect(canEdit).toBe(true)
  })

  it('should return correct permissions for regular user', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' } as any
    const mockUserProfile = { id: 'user-123', role: 'editor' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      session: null,
      isLoading: false,
      isAdmin: false,
      isEditor: true,
      isViewer: false,
      role: 'editor' as const,
      canWrite: true,
      canDelete: false,
      canManageUsers: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshUserProfile: vi.fn()
    } as any)

    vi.mocked(canUserEditFamilyMember).mockResolvedValue(true)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.canAddFamilyMember()).toBe(true)
    expect(result.current.canDeleteFamilyMember()).toBe(false)
    expect(result.current.canManageUsers).toBe(false)

    const canEdit = await result.current.canEditFamilyMember('member-123')
    expect(canEdit).toBe(true)
    expect(canUserEditFamilyMember).toHaveBeenCalledWith('member-123')
  })

  it('should return false for unauthenticated user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      userProfile: null,
      session: null,
      isLoading: false,
      isAdmin: false,
      isEditor: false,
      isViewer: false,
      role: null,
      canWrite: false,
      canDelete: false,
      canManageUsers: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshUserProfile: vi.fn()
    } as any)

    const { result } = renderHook(() => usePermissions())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.canAddFamilyMember()).toBe(false)
    expect(result.current.canDeleteFamilyMember()).toBe(false)
    expect(result.current.canManageUsers).toBe(false)

    const canEdit = await result.current.canEditFamilyMember('member-123')
    expect(canEdit).toBe(false)
  })

    it('should cache permission results', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' } as any
      const mockUserProfile = { id: 'user-123', role: 'editor' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        userProfile: mockUserProfile,
        session: null,
        isLoading: false,
        isAdmin: false,
        isEditor: true,
        isViewer: false,
        role: 'editor' as const,
        canWrite: true,
        canDelete: false,
        canManageUsers: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshUserProfile: vi.fn()
      } as any)

      vi.mocked(canUserEditFamilyMember).mockResolvedValue(true)

      const { result, rerender } = renderHook(() => usePermissions())

      // First call - this should call the service and cache the result
      const canEdit1 = await result.current.canEditFamilyMember('member-123')
      expect(canEdit1).toBe(true)
      expect(canUserEditFamilyMember).toHaveBeenCalledTimes(1)

      // Wait for React to process state updates and re-render
      await waitFor(() => {
        // Force a re-render to ensure state is updated
        rerender()
      })

      // Second call should use cache - should not call the service again
      const canEdit2 = await result.current.canEditFamilyMember('member-123')
      expect(canEdit2).toBe(true)
      // The function should still only be called once due to caching
      expect(canUserEditFamilyMember).toHaveBeenCalledTimes(1)
    })

  it('should clear cache', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' } as any
    const mockUserProfile = { id: 'user-123', role: 'editor' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      session: null,
      isLoading: false,
      isAdmin: false,
      isEditor: true,
      isViewer: false,
      role: 'editor' as const,
      canWrite: true,
      canDelete: false,
      canManageUsers: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshUserProfile: vi.fn()
    } as any)

    vi.mocked(canUserEditFamilyMember).mockResolvedValue(true)

    const { result } = renderHook(() => usePermissions())

    await result.current.canEditFamilyMember('member-123')
    expect(canUserEditFamilyMember).toHaveBeenCalledTimes(1)

    result.current.clearCache()

    await result.current.canEditFamilyMember('member-123')
    expect(canUserEditFamilyMember).toHaveBeenCalledTimes(2) // Called again after cache clear
  })

  it('should handle permission check errors', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' } as any
    const mockUserProfile = { id: 'user-123', role: 'editor' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      session: null,
      isLoading: false,
      isAdmin: false,
      isEditor: true,
      isViewer: false,
      role: 'editor' as const,
      canWrite: true,
      canDelete: false,
      canManageUsers: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshUserProfile: vi.fn()
    } as any)

    vi.mocked(canUserEditFamilyMember).mockRejectedValue(new Error('Permission check failed'))

    const { result } = renderHook(() => usePermissions())

    const canEdit = await result.current.canEditFamilyMember('member-123')
    expect(canEdit).toBe(false)
  })
})

