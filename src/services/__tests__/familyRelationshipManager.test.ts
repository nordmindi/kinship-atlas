import { describe, it, expect, vi, beforeEach } from 'vitest'
import { familyRelationshipManager } from '../familyRelationshipManager'
import { supabase } from '@/integrations/supabase/client'

describe('FamilyRelationshipManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRelationship', () => {
    it('should create a relationship successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'rel-123' },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any)

      const request = {
        fromMemberId: 'member-1',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)
      expect(result.relationshipId).toBe('rel-123')
      expect(mockInsert).toHaveBeenCalledWith({
        from_member_id: 'member-1',
        to_member_id: 'member-2',
        relation_type: 'spouse'
      })
    })

    it('should handle authentication errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = {
        fromMemberId: 'member-1',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You must be logged in to create relationships')
    })

    it('should validate relationship data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = {
        fromMemberId: '',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('From member ID is required')
    })

    it('should prevent self-relationships', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = {
        fromMemberId: 'member-1',
        toMemberId: 'member-1',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('A person cannot have a relationship with themselves')
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
        fromMemberId: 'member-1',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create relationship in database')
    })
  })

  describe('deleteRelationship', () => {
    it('should delete a relationship successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any)

      const result = await familyRelationshipManager.deleteRelationship('rel-123')

      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'rel-123')
    })

    it('should handle authentication errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const result = await familyRelationshipManager.deleteRelationship('rel-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('You must be logged in to delete relationships')
    })

    it('should handle database errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error')
      })

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any)

      const result = await familyRelationshipManager.deleteRelationship('rel-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete relationship from database')
    })
  })

  describe('getFamilyMembersWithRelations', () => {
    it('should fetch family members with relations successfully', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          first_name: 'John',
          last_name: 'Smith',
          relations_from: [
            {
              id: 'rel-1',
              relation_type: 'spouse',
              to_member_id: 'member-2',
              to_member: {
                id: 'member-2',
                first_name: 'Mary',
                last_name: 'Smith'
              }
            }
          ]
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

      const result = await familyRelationshipManager.getFamilyMembersWithRelations()

      expect(result).toHaveLength(1)
      expect(result[0].relations_from).toHaveLength(1)
      expect(result[0].relations_from[0].relation_type).toBe('spouse')
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

      const result = await familyRelationshipManager.getFamilyMembersWithRelations()

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

      const result = await familyRelationshipManager.getFamilyMembersWithRelations()

      expect(result).toHaveLength(0)
    })
  })
})
