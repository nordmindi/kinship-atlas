import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/integrations/supabase/client'
import {
  completeOnboarding,
  updateOnboardingEnabled,
  resetOnboarding
} from '../userService'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('Onboarding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock supabase.from for updateUserProfile
    const mockUpdate = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({
      data: null,
      error: null
    })
    
    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      eq: mockEq
    } as any)
  })

  describe('completeOnboarding', () => {
    it('should complete onboarding successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await completeOnboarding()

      expect(result.success).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await completeOnboarding()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should return error when update fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock update failure
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      } as any)

      const result = await completeOnboarding()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update onboarding status')
    })

    it('should handle exceptions', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Network error'))

      const result = await completeOnboarding()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('updateOnboardingEnabled', () => {
    it('should enable onboarding successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await updateOnboardingEnabled(true)

      expect(result.success).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should disable onboarding successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await updateOnboardingEnabled(false)

      expect(result.success).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await updateOnboardingEnabled(true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should return error when update fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock update failure
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      } as any)

      const result = await updateOnboardingEnabled(true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update onboarding setting')
    })

    it('should handle exceptions', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Network error'))

      const result = await updateOnboardingEnabled(true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('resetOnboarding', () => {
    it('should reset onboarding successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await resetOnboarding()

      expect(result.success).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await resetOnboarding()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should return error when update fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock update failure
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      } as any)

      const result = await resetOnboarding()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to reset onboarding status')
    })

    it('should handle exceptions', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Network error'))

      const result = await resetOnboarding()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
