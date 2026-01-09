import { describe, it, expect, vi, beforeEach } from 'vitest'
import { familyRelationshipManager } from '../familyRelationshipManager'
import { supabase } from '@/integrations/supabase/client'

describe('FamilyRelationshipManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRelationship', () => {
    it('should create a relationship successfully', async () => {
      const mockMembers = [
        { id: 'member-1', first_name: 'John', last_name: 'Smith', birth_date: '1990-01-01', gender: 'male' },
        { id: 'member-2', first_name: 'Mary', last_name: 'Smith', birth_date: '1992-01-01', gender: 'female' }
      ]

      let relationsCallCount = 0
      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'rel-123' },
          error: null
        })
      }
      const insertBuilder = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(insertSelectBuilder)
        })
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockMembers,
              error: null
            })
          } as any
        }
        if (table === 'relations') {
          const callNum = ++relationsCallCount
          // For 'spouse' relationship without metadata:
          // - checkCircularRelationship is not called (only for parent/child)
          // - supportsMetadataColumn is not called (only if request.metadata exists)
          // So the sequence is: checkExistingRelationship (call 1), insert (call 2)
          if (callNum === 1) {
            // checkExistingRelationship - no existing relationship (uses maybeSingle)
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            } as any
          }
          // insert relationship (callNum === 2 for spouse without metadata)
          return insertBuilder as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: 'member-1',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)
      expect(result.relationshipId).toBe('rel-123')
    })

    it('should handle authentication errors', async () => {
      // When not authenticated, RLS will prevent fetching members
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Permission denied' }
            })
          } as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: 'member-1',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Could not find both family members')
    })

    it('should validate relationship data', async () => {
      // Empty fromMemberId will cause validation to fail
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          } as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: '',
        toMemberId: 'member-2',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Could not find both family members')
    })

    it('should prevent self-relationships', async () => {
      const mockMember = { id: 'member-1', first_name: 'John', last_name: 'Smith', birth_date: '1990-01-01', gender: 'male' }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [mockMember], // Only one member found (same ID for both)
              error: null
            })
          } as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: 'member-1',
        toMemberId: 'member-1',
        relationshipType: 'spouse' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Could not find both family members')
    })

    it('should handle database errors', async () => {
      const mockMembers = [
        { id: 'member-1', first_name: 'John', last_name: 'Smith', birth_date: '1990-01-01', gender: 'male' },
        { id: 'member-2', first_name: 'Mary', last_name: 'Smith', birth_date: '1992-01-01', gender: 'female' }
      ]

      let relationsCallCount = 0
      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }
      const insertBuilder = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(insertSelectBuilder)
        })
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockMembers,
              error: null
            })
          } as any
        }
        if (table === 'relations') {
          const callNum = ++relationsCallCount
          if (callNum === 1) {
            // checkExistingRelationship (uses maybeSingle)
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            } as any
          }
          // insert (callNum === 2 for spouse without metadata)
          return insertBuilder as any
        }
        return {} as any
      })

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
      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          callCount++
          if (callCount === 1) {
            // Fetch relationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'rel-123' },
                error: null
              })
            } as any
          }
          // Delete relationship
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.deleteRelationship('rel-123')

      expect(result.success).toBe(true)
    })

    it('should handle authentication errors', async () => {
      // When not authenticated, RLS will prevent fetching the relationship
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Permission denied' }
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.deleteRelationship('rel-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship not found')
    })

    it('should handle database errors', async () => {
      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          callCount++
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'rel-123' },
                error: null
              })
            } as any
          }
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.deleteRelationship('rel-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete relationship')
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

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          // supportsMetadataColumn check
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'column metadata does not exist' }
            })
          } as any
        }
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockMembers,
              error: null
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.getFamilyMembersWithRelations()

      expect(result).toHaveLength(1)
      expect(result[0].relations).toHaveLength(1)
      expect(result[0].relations[0].type).toBe('spouse')
    })

    it('should handle empty results', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'column metadata does not exist' }
            })
          } as any
        }
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.getFamilyMembersWithRelations()

      expect(result).toHaveLength(0)
    })

    it('should handle database errors', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'column metadata does not exist' }
            })
          } as any
        }
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.getFamilyMembersWithRelations()

      expect(result).toHaveLength(0)
    })
  })
})
