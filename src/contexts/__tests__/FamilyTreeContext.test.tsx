import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FamilyTreeProvider, useFamilyTree } from '../FamilyTreeContext'
import { AuthProvider } from '../AuthContext'
import { supabase } from '@/integrations/supabase/client'

// Mock the supabase client
vi.mock('@/integrations/supabase/client')

// Test component to access family tree context
const TestComponent = () => {
  const { 
    selectedMemberId, 
    setSelectedMemberId,
    clearSelectedMember 
  } = useFamilyTree()
  
  return (
    <div>
      <div data-testid="selected-member">{selectedMemberId || 'None'}</div>
      <button onClick={() => setSelectedMemberId('member-1')}>Select Member</button>
      <button onClick={() => clearSelectedMember()}>Clear Selection</button>
    </div>
  )
}

describe('FamilyTreeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock supabase auth for AuthProvider
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    } as { data: { subscription: { unsubscribe: () => void } } })
    
    // Mock supabase.from for getUserProfile
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null
      })
    } as any)
    
    // Clear sessionStorage before each test
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear()
    }
  })

  describe('Initial State', () => {
    it('should provide initial selected member state', () => {
      render(
        <AuthProvider>
          <FamilyTreeProvider>
            <TestComponent />
          </FamilyTreeProvider>
        </AuthProvider>
      )

      expect(screen.getByTestId('selected-member')).toHaveTextContent('None')
    })

    it('should load selected member from sessionStorage', async () => {
      // Set up sessionStorage before rendering
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('family-tree:selected-member:user-123', 'member-1')
      }

      render(
        <AuthProvider>
          <FamilyTreeProvider>
            <TestComponent />
          </FamilyTreeProvider>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('selected-member')).toHaveTextContent('member-1')
      })
    })
  })

  describe('Member Selection', () => {
    it('should allow selecting a member', async () => {
      render(
        <AuthProvider>
          <FamilyTreeProvider>
            <TestComponent />
          </FamilyTreeProvider>
        </AuthProvider>
      )

      expect(screen.getByTestId('selected-member')).toHaveTextContent('None')

      // Click select member button
      screen.getByText('Select Member').click()

      await waitFor(() => {
        expect(screen.getByTestId('selected-member')).toHaveTextContent('member-1')
      })
    })

    it('should clear selection when clearSelectedMember is called', async () => {
      // Set up sessionStorage before rendering
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('family-tree:selected-member:user-123', 'member-1')
      }

      render(
        <AuthProvider>
          <FamilyTreeProvider>
            <TestComponent />
          </FamilyTreeProvider>
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('selected-member')).toHaveTextContent('member-1')
      })

      // Click clear selection button
      screen.getByText('Clear Selection').click()

      await waitFor(() => {
        expect(screen.getByTestId('selected-member')).toHaveTextContent('None')
      })
    })

    it('should persist selection to sessionStorage', async () => {
      const { userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <FamilyTreeProvider>
            <TestComponent />
          </FamilyTreeProvider>
        </AuthProvider>
      )

      // Click select member button
      await user.click(screen.getByText('Select Member'))

      await waitFor(() => {
        expect(screen.getByTestId('selected-member')).toHaveTextContent('member-1')
      })

      // Check that it's persisted in sessionStorage
      if (typeof window !== 'undefined') {
        expect(window.sessionStorage.getItem('family-tree:selected-member:user-123')).toBe('member-1')
      }
    })
  })

  describe('Context Provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
      }).toThrow('useFamilyTree must be used within a FamilyTreeProvider')
      
      consoleSpy.mockRestore()
    })
  })
})
