import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  performCompleteLogout,
  hasValidSession,
  getCurrentUser,
  debugAuthState
} from '../authUtils'
import { supabase } from '@/integrations/supabase/client'

describe('authUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    // Clear cookies
    document.cookie.split(';').forEach(c => {
      const eqPos = c.indexOf('=')
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
  })

  describe('performCompleteLogout', () => {
    it('should sign out from Supabase', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null
      })

      // Set up some localStorage items
      localStorage.setItem('sb-test-token', 'token123')
      localStorage.setItem('supabase-auth', 'auth123')
      sessionStorage.setItem('sb-session', 'session123')

      const result = await performCompleteLogout()

      expect(result.success).toBe(true)
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should clear localStorage items', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null
      })

      localStorage.setItem('sb-test-token', 'token123')
      localStorage.setItem('supabase-auth', 'auth123')
      localStorage.setItem('other-data', 'keep-this')

      await performCompleteLogout()

      expect(localStorage.getItem('sb-test-token')).toBeNull()
      expect(localStorage.getItem('supabase-auth')).toBeNull()
      expect(localStorage.getItem('other-data')).toBe('keep-this') // Should not be removed
    })

    it('should clear sessionStorage items', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null
      })

      sessionStorage.setItem('sb-session', 'session123')
      sessionStorage.setItem('supabase-data', 'data123')
      sessionStorage.setItem('other-data', 'keep-this')

      await performCompleteLogout()

      expect(sessionStorage.getItem('sb-session')).toBeNull()
      expect(sessionStorage.getItem('supabase-data')).toBeNull()
      expect(sessionStorage.getItem('other-data')).toBe('keep-this')
    })

    it('should handle sign out errors gracefully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed' }
      })

      const result = await performCompleteLogout()

      expect(result.success).toBe(true) // Still succeeds even if signOut has error
    })
  })

  describe('hasValidSession', () => {
    it('should return true for valid session', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token123'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await hasValidSession()

      expect(result).toBe(true)
    })

    it('should return false for no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await hasValidSession()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      })

      const result = await hasValidSession()

      expect(result).toBe(false)
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await getCurrentUser()

      expect(result).toEqual(mockUser)
    })

    it('should return null on error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Get user error' }
      })

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })

    it('should return null if no user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('debugAuthState', () => {
    it('should log authentication state', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      localStorage.setItem('sb-test-token', 'token123')
      sessionStorage.setItem('supabase-session', 'session123')

      debugAuthState()

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Authentication State Debug:')

      consoleSpy.mockRestore()
    })
  })
})

