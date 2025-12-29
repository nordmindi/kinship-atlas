import { describe, it, expect, vi, beforeEach } from 'vitest'
import { familyMemberService } from '../familyMemberService'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// Mock the toast function
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

describe('FamilyMemberService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createFamilyMember', () => {
    it('should create a family member successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockMemberData = { id: 'member-123' }
      
      // Mock auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock family member insert
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockMemberData,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any)

      // Mock setBranchRoot and addLocation
      vi.spyOn(familyMemberService as any, 'setBranchRoot').mockResolvedValue(undefined)
      vi.spyOn(familyMemberService as any, 'addLocation').mockResolvedValue(undefined)
      vi.spyOn(familyMemberService as any, 'getFamilyMember').mockResolvedValue({
        id: 'member-123',
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male'
      })

      const request = {
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1990-01-01',
        gender: 'male' as const,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          description: 'New York, NY'
        }
      }

      const result = await familyMemberService.createFamilyMember(request)

      expect(result.success).toBe(true)
      expect(result.member).toBeDefined()
      expect(mockInsert).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Smith',
        birth_date: '1990-01-01',
        death_date: null,
        birth_place: null,
        bio: null,
        gender: 'male',
        created_by: 'user-123',
        branch_root: null,
        is_root_member: false
      })
    })

    it('should handle authentication errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = {
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male' as const
      }

      const result = await familyMemberService.createFamilyMember(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You must be logged in to create family members')
    })

    it('should validate required fields', async () => {
      const request = {
        firstName: '',
        lastName: 'Smith',
        gender: 'male' as const
      }

      const result = await familyMemberService.createFamilyMember(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('First name is required')
    })

    it('should handle database errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any)

      const request = {
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male' as const
      }

      const result = await familyMemberService.createFamilyMember(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create family member in database')
    })
  })

  describe('getAllFamilyMembers', () => {
    it('should fetch all family members successfully', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          first_name: 'John',
          last_name: 'Smith',
          gender: 'male',
          relations_from: [],
          locations: []
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMembers,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any)

      const result = await familyMemberService.getAllFamilyMembers()

      expect(result).toHaveLength(1)
      expect(result[0].firstName).toBe('John')
      expect(result[0].lastName).toBe('Smith')
    })

    it('should handle empty results', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any)

      const result = await familyMemberService.getAllFamilyMembers()

      expect(result).toHaveLength(0)
    })

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any)

      const result = await familyMemberService.getAllFamilyMembers()

      expect(result).toHaveLength(0)
    })
  })

  describe('updateFamilyMember', () => {
    it('should update a family member successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockUpdatedMember = { id: 'member-123' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedMember,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any)

      vi.spyOn(familyMemberService as any, 'getFamilyMember').mockResolvedValue({
        id: 'member-123',
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male'
      })

      const request = {
        id: 'member-123',
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male' as const
      }

      const result = await familyMemberService.updateFamilyMember(request)

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Smith',
        birth_date: null,
        death_date: null,
        birth_place: null,
        bio: null,
        gender: 'male'
      })
    })
  })
})
