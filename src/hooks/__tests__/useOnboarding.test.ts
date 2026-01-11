import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOnboarding } from '../useOnboarding'
import { useAuth } from '@/contexts/AuthContext'
import { completeOnboarding, updateOnboardingEnabled, resetOnboarding } from '@/services/userService'
import { toast } from '@/hooks/use-toast'

vi.mock('@/contexts/AuthContext')
vi.mock('@/services/userService')
vi.mock('@/hooks/use-toast')

describe('useOnboarding', () => {
  const mockRefreshUserProfile = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRefreshUserProfile.mockResolvedValue(undefined)
  })

  describe('shouldShowOnboarding', () => {
    it('should show onboarding for editor who has not completed it and has it enabled', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: false,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      const { result } = renderHook(() => useOnboarding())

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })

      expect(result.current.shouldShowOnboarding).toBe(true)
      expect(result.current.isOnboardingCompleted).toBe(false)
      expect(result.current.isOnboardingEnabled).toBe(true)
    })

    it('should not show onboarding for editor who has completed it', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: true,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      const { result } = renderHook(() => useOnboarding())

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })

      expect(result.current.shouldShowOnboarding).toBe(false)
      expect(result.current.isOnboardingCompleted).toBe(true)
    })

    it('should not show onboarding for editor who has it disabled', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: false,
        onboardingEnabled: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      const { result } = renderHook(() => useOnboarding())

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })

      expect(result.current.shouldShowOnboarding).toBe(false)
      expect(result.current.isOnboardingEnabled).toBe(false)
    })

    it('should not show onboarding for non-editor users', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'viewer' as const,
        onboardingCompleted: false,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: false
      } as any)

      const { result } = renderHook(() => useOnboarding())

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })

      expect(result.current.shouldShowOnboarding).toBe(false)
    })

    it('should handle null user profile', async () => {
      vi.mocked(useAuth).mockReturnValue({
        userProfile: null,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: false
      } as any)

      const { result } = renderHook(() => useOnboarding())

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })

      expect(result.current.shouldShowOnboarding).toBe(false)
    })

    it('should default onboardingEnabled to true when undefined', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: false,
        onboardingEnabled: undefined,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      const { result } = renderHook(() => useOnboarding())

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false)
      })

      expect(result.current.isOnboardingEnabled).toBe(true)
      expect(result.current.shouldShowOnboarding).toBe(true)
    })
  })

  describe('markOnboardingComplete', () => {
    it('should complete onboarding successfully', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: false,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(completeOnboarding).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.markOnboardingComplete()

      expect(success).toBe(true)
      expect(completeOnboarding).toHaveBeenCalledOnce()
      expect(mockRefreshUserProfile).toHaveBeenCalledOnce()
      // Toast is only called on error, not on success
      expect(toast).not.toHaveBeenCalled()
    })

    it('should handle completion error', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: false,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(completeOnboarding).mockResolvedValue({
        success: false,
        error: 'Failed to complete onboarding'
      })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.markOnboardingComplete()

      expect(success).toBe(false)
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to complete onboarding',
        variant: 'destructive',
      })
    })

    it('should handle exceptions', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: false,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(completeOnboarding).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.markOnboardingComplete()

      expect(success).toBe(false)
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    })
  })

  describe('toggleOnboardingEnabled', () => {
    it('should enable onboarding successfully', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: true,
        onboardingEnabled: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(updateOnboardingEnabled).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.toggleOnboardingEnabled(true)

      expect(success).toBe(true)
      expect(updateOnboardingEnabled).toHaveBeenCalledWith(true)
      expect(mockRefreshUserProfile).toHaveBeenCalledOnce()
    })

    it('should disable onboarding successfully', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: true,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(updateOnboardingEnabled).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.toggleOnboardingEnabled(false)

      expect(success).toBe(true)
      expect(updateOnboardingEnabled).toHaveBeenCalledWith(false)
      expect(mockRefreshUserProfile).toHaveBeenCalledOnce()
    })

    it('should handle toggle error', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: true,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(updateOnboardingEnabled).mockResolvedValue({
        success: false,
        error: 'Failed to update setting'
      })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.toggleOnboardingEnabled(false)

      expect(success).toBe(false)
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      })
    })
  })

  describe('restartOnboarding', () => {
    it('should reset onboarding successfully', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: true,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(resetOnboarding).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.restartOnboarding()

      expect(success).toBe(true)
      expect(resetOnboarding).toHaveBeenCalledOnce()
      expect(mockRefreshUserProfile).toHaveBeenCalledOnce()
    })

    it('should handle reset error', async () => {
      const mockUserProfile = {
        id: 'user-123',
        role: 'editor' as const,
        onboardingCompleted: true,
        onboardingEnabled: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }

      vi.mocked(useAuth).mockReturnValue({
        userProfile: mockUserProfile,
        refreshUserProfile: mockRefreshUserProfile,
        isEditor: true
      } as any)

      vi.mocked(resetOnboarding).mockResolvedValue({
        success: false,
        error: 'Failed to reset onboarding'
      })

      const { result } = renderHook(() => useOnboarding())

      const success = await result.current.restartOnboarding()

      expect(success).toBe(false)
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to reset onboarding',
        variant: 'destructive',
      })
    })
  })
})
