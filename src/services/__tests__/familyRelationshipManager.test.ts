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
    it('should delete a relationship and its reciprocal successfully', async () => {
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
                data: { 
                  id: 'rel-123',
                  from_member_id: 'member-1',
                  to_member_id: 'member-2',
                  relation_type: 'parent'
                },
                error: null
              })
            } as any
          }
          // Delete relationship (both primary and reciprocal)
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis()
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
            // First call: fetch the relationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { 
                  id: 'rel-123',
                  from_member_id: 'member-1',
                  to_member_id: 'member-2',
                  relation_type: 'parent'
                },
                error: null
              })
            } as any
          }
          // Second call: delete the primary relationship - mock to return an error
          // Create a proper chainable mock that returns the error properly
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
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

  describe('determineSiblingType', () => {
    it('should detect full siblings (share both parents)', async () => {
      const mockMembers = [
        { id: 'sibling-1', first_name: 'John', last_name: 'Smith', birth_date: '1990-01-01', gender: 'male' },
        { id: 'sibling-2', first_name: 'Jane', last_name: 'Smith', birth_date: '1992-01-01', gender: 'female' }
      ]

      let relationsCallCount = 0
      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'rel-123', sibling_type: 'full' },
          error: null
        })
      }
      const insertBuilder = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(insertSelectBuilder)
        })
      }

      // Mock for determineSiblingType queries
      // The query is: .select('to_member_id').eq('from_member_id', id).eq('relation_type', 'parent')
      const createParentQueryMock = (parents: string[]) => {
        const mockEq2 = vi.fn().mockResolvedValue({
          data: parents.map(id => ({ to_member_id: id })),
          error: null
        })
        const mockEq1 = vi.fn().mockReturnValue({
          eq: mockEq2
        })
        return {
          select: vi.fn().mockReturnValue({
            eq: mockEq1
          })
        }
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
            // checkExistingRelationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            } as any
          }
          if (callNum === 2) {
            // determineSiblingType - first sibling's parents (both parents shared)
            return createParentQueryMock(['parent-1', 'parent-2']) as any
          }
          if (callNum === 3) {
            // determineSiblingType - second sibling's parents (both parents shared)
            return createParentQueryMock(['parent-1', 'parent-2']) as any
          }
          // insert relationship
          return insertBuilder as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: 'sibling-1',
        toMemberId: 'sibling-2',
        relationshipType: 'sibling' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)
      // Verify that sibling_type was included in the insert
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          sibling_type: 'full'
        })
      )
    })

    it('should detect half siblings (share one parent)', async () => {
      const mockMembers = [
        { id: 'sibling-1', first_name: 'John', last_name: 'Smith', birth_date: '1990-01-01', gender: 'male' },
        { id: 'sibling-2', first_name: 'Jane', last_name: 'Doe', birth_date: '1992-01-01', gender: 'female' }
      ]

      let relationsCallCount = 0
      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'rel-123', sibling_type: 'half' },
          error: null
        })
      }
      const insertBuilder = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(insertSelectBuilder)
        })
      }

      const createParentQueryMock = (parents: string[]) => {
        const mockEq2 = vi.fn().mockResolvedValue({
          data: parents.map(id => ({ to_member_id: id })),
          error: null
        })
        const mockEq1 = vi.fn().mockReturnValue({
          eq: mockEq2
        })
        return {
          select: vi.fn().mockReturnValue({
            eq: mockEq1
          })
        }
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
            // checkExistingRelationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            } as any
          }
          if (callNum === 2) {
            // determineSiblingType - first sibling's parents
            return createParentQueryMock(['parent-1', 'parent-2']) as any
          }
          if (callNum === 3) {
            // determineSiblingType - second sibling's parents (only shares parent-1)
            return createParentQueryMock(['parent-1', 'parent-3']) as any
          }
          // insert relationship
          return insertBuilder as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: 'sibling-1',
        toMemberId: 'sibling-2',
        relationshipType: 'sibling' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)
      // Verify that sibling_type was set to 'half'
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          sibling_type: 'half'
        })
      )
    })

    it('should return null when siblings have no shared parents', async () => {
      const mockMembers = [
        { id: 'sibling-1', first_name: 'John', last_name: 'Smith', birth_date: '1990-01-01', gender: 'male' },
        { id: 'sibling-2', first_name: 'Jane', last_name: 'Doe', birth_date: '1992-01-01', gender: 'female' }
      ]

      let relationsCallCount = 0
      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'rel-123', sibling_type: null },
          error: null
        })
      }
      const insertBuilder = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(insertSelectBuilder)
        })
      }

      const createParentQueryMock = (parents: string[]) => {
        const mockEq2 = vi.fn().mockResolvedValue({
          data: parents.map(id => ({ to_member_id: id })),
          error: null
        })
        const mockEq1 = vi.fn().mockReturnValue({
          eq: mockEq2
        })
        return {
          select: vi.fn().mockReturnValue({
            eq: mockEq1
          })
        }
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
            // checkExistingRelationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            } as any
          }
          if (callNum === 2) {
            // determineSiblingType - first sibling's parents
            return createParentQueryMock(['parent-1', 'parent-2']) as any
          }
          if (callNum === 3) {
            // determineSiblingType - second sibling's parents (completely different)
            return createParentQueryMock(['parent-3', 'parent-4']) as any
          }
          // insert relationship
          return insertBuilder as any
        }
        return {} as any
      })

      const request = {
        fromMemberId: 'sibling-1',
        toMemberId: 'sibling-2',
        relationshipType: 'sibling' as const
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)
      // When no shared parents, sibling_type should not be included (or be null)
      expect(insertBuilder.insert).toHaveBeenCalled()
    })
  })

  describe('updateRelationship', () => {
    it('should update sibling type successfully', async () => {
      let callCount = 0
      const mockRelationship = {
        id: 'rel-123',
        from_member_id: 'sibling-1',
        to_member_id: 'sibling-2',
        relation_type: 'sibling',
        sibling_type: null
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          callCount++
          if (callCount === 1) {
            // Fetch relationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockRelationship,
                error: null
              })
            } as any
          }
          if (callCount === 2) {
            // Update main relationship
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...mockRelationship, sibling_type: 'full' },
                error: null
              })
            } as any
          }
          if (callCount === 3) {
            // Update reciprocal relationship
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis().mockReturnThis().mockReturnThis(),
              select: vi.fn().mockResolvedValue({
                data: [{ ...mockRelationship, sibling_type: 'full' }],
                error: null
              })
            } as any
          }
        }
        return {} as any
      })

      const result = await familyRelationshipManager.updateRelationship('rel-123', {
        siblingType: 'full'
      })

      expect(result.success).toBe(true)
    })

    it('should update sibling type to half', async () => {
      let callCount = 0
      const mockRelationship = {
        id: 'rel-123',
        from_member_id: 'sibling-1',
        to_member_id: 'sibling-2',
        relation_type: 'sibling',
        sibling_type: 'full'
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          callCount++
          if (callCount === 1) {
            // Fetch relationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockRelationship,
                error: null
              })
            } as any
          }
          if (callCount === 2) {
            // Update main relationship
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...mockRelationship, sibling_type: 'half' },
                error: null
              })
            } as any
          }
          if (callCount === 3) {
            // Update reciprocal relationship
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis().mockReturnThis().mockReturnThis(),
              select: vi.fn().mockResolvedValue({
                data: [{ ...mockRelationship, sibling_type: 'half' }],
                error: null
              })
            } as any
          }
        }
        return {} as any
      })

      const result = await familyRelationshipManager.updateRelationship('rel-123', {
        siblingType: 'half'
      })

      expect(result.success).toBe(true)
    })

    it('should auto-detect sibling type when set to null', async () => {
      let callCount = 0
      const mockRelationship = {
        id: 'rel-123',
        from_member_id: 'sibling-1',
        to_member_id: 'sibling-2',
        relation_type: 'sibling',
        sibling_type: 'half'
      }

      const createParentQueryMock = (parents: string[]) => {
        const mockEq2 = vi.fn().mockResolvedValue({
          data: parents.map(id => ({ to_member_id: id })),
          error: null
        })
        const mockEq1 = vi.fn().mockReturnValue({
          eq: mockEq2
        })
        return {
          select: vi.fn().mockReturnValue({
            eq: mockEq1
          })
        }
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          callCount++
          if (callCount === 1) {
            // Fetch relationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockRelationship,
                error: null
              })
            } as any
          }
          if (callCount === 2) {
            // determineSiblingType - first sibling's parents
            return createParentQueryMock(['parent-1', 'parent-2']) as any
          }
          if (callCount === 3) {
            // determineSiblingType - second sibling's parents
            return createParentQueryMock(['parent-1', 'parent-2']) as any
          }
          if (callCount === 4) {
            // Update main relationship
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...mockRelationship, sibling_type: 'full' },
                error: null
              })
            } as any
          }
          if (callCount === 5) {
            // Update reciprocal relationship
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis().mockReturnThis().mockReturnThis(),
              select: vi.fn().mockResolvedValue({
                data: [{ ...mockRelationship, sibling_type: 'full' }],
                error: null
              })
            } as any
          }
        }
        return {} as any
      })

      const result = await familyRelationshipManager.updateRelationship('rel-123', {
        siblingType: null
      })

      expect(result.success).toBe(true)
    })

    it('should return error when relationship not found', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.updateRelationship('rel-123', {
        siblingType: 'full'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship not found')
    })

    it('should return error when trying to update non-sibling relationship', async () => {
      const mockRelationship = {
        id: 'rel-123',
        from_member_id: 'parent-1',
        to_member_id: 'child-1',
        relation_type: 'parent',
        sibling_type: null
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockRelationship,
              error: null
            })
          } as any
        }
        return {} as any
      })

      const result = await familyRelationshipManager.updateRelationship('rel-123', {
        siblingType: 'full'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Can only update sibling_type for sibling relationships')
    })

    it('should handle database errors during update', async () => {
      let callCount = 0
      const mockRelationship = {
        id: 'rel-123',
        from_member_id: 'sibling-1',
        to_member_id: 'sibling-2',
        relation_type: 'sibling',
        sibling_type: null
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'relations') {
          callCount++
          if (callCount === 1) {
            // Fetch relationship
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockRelationship,
                error: null
              })
            } as any
          }
          if (callCount === 2) {
            // Update main relationship - return error
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            } as any
          }
        }
        return {} as any
      })

      const result = await familyRelationshipManager.updateRelationship('rel-123', {
        siblingType: 'full'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to update relationship')
    })
  })
})
