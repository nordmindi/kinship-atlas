import { describe, it, expect, vi, beforeEach } from 'vitest'
import { familyRelationshipManager, resolveRelationshipDirection } from '../familyRelationshipManager'
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

  describe('resolveRelationshipDirection', () => {
    it('should correctly resolve direction for parent relationship', () => {
      const currentMemberId = 'current-member-id'
      const selectedMemberId = 'selected-member-id'

      const result = resolveRelationshipDirection(
        currentMemberId,
        selectedMemberId,
        'parent'
      )

      // When adding a parent: selected member is parent, current member is child
      // Relationship: selected -> current with type 'parent'
      expect(result.fromMemberId).toBe(selectedMemberId)
      expect(result.toMemberId).toBe(currentMemberId)
      expect(result.relationshipType).toBe('parent')
      expect(result.currentMemberRole).toBe('child')
      expect(result.selectedMemberRole).toBe('parent')
    })

    it('should correctly resolve direction for child relationship', () => {
      const currentMemberId = 'current-member-id'
      const selectedMemberId = 'selected-member-id'

      const result = resolveRelationshipDirection(
        currentMemberId,
        selectedMemberId,
        'child'
      )

      // When adding a child: current member is parent, selected member is child
      // Relationship: current -> selected with type 'parent'
      expect(result.fromMemberId).toBe(currentMemberId)
      expect(result.toMemberId).toBe(selectedMemberId)
      expect(result.relationshipType).toBe('parent')
      expect(result.currentMemberRole).toBe('parent')
      expect(result.selectedMemberRole).toBe('child')
    })

    it('should correctly resolve direction for spouse relationship', () => {
      const currentMemberId = 'current-member-id'
      const selectedMemberId = 'selected-member-id'

      const result = resolveRelationshipDirection(
        currentMemberId,
        selectedMemberId,
        'spouse'
      )

      expect(result.fromMemberId).toBe(currentMemberId)
      expect(result.toMemberId).toBe(selectedMemberId)
      expect(result.relationshipType).toBe('spouse')
      expect(result.currentMemberRole).toBe('spouse')
      expect(result.selectedMemberRole).toBe('spouse')
    })

    it('should correctly resolve direction for sibling relationship', () => {
      const currentMemberId = 'current-member-id'
      const selectedMemberId = 'selected-member-id'

      const result = resolveRelationshipDirection(
        currentMemberId,
        selectedMemberId,
        'sibling'
      )

      expect(result.fromMemberId).toBe(currentMemberId)
      expect(result.toMemberId).toBe(selectedMemberId)
      expect(result.relationshipType).toBe('sibling')
      expect(result.currentMemberRole).toBe('sibling')
      expect(result.selectedMemberRole).toBe('sibling')
    })
  })

  describe('createRelationship - child relationship direction', () => {
    it('should create child relationship with correct direction (parent -> child)', async () => {
      // This test ensures that when adding a child, the relationship is created
      // as parent -> child, not child -> parent (which would be reversed)
      const parentMember = {
        id: 'parent-id',
        first_name: 'Asha',
        last_name: 'Ismail Hagi Farah',
        birth_date: '1988-02-10',
        gender: 'female'
      }
      const childMember = {
        id: 'child-id',
        first_name: 'Bilal',
        last_name: 'Ibrahim',
        birth_date: '2023-04-01',
        gender: 'male'
      }

      const insertCalls: any[] = []
      let relationsCallCount = 0

      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'rel-123' },
          error: null
        })
      }
      const insertBuilder = {
        insert: vi.fn((payload) => {
          insertCalls.push(payload)
          return {
            select: vi.fn().mockReturnValue(insertSelectBuilder)
          }
        })
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [parentMember, childMember],
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
            // checkCircularRelationship - no circular relationship
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            } as any
          }
          // insert relationship (callNum >= 3)
          return insertBuilder as any
        }
        return {} as any
      })

      // Simulate adding a child: current member is parent, selected member is child
      // Using resolveRelationshipDirection to get the correct direction
      const direction = resolveRelationshipDirection(
        parentMember.id, // current member (parent)
        childMember.id,  // selected member (child)
        'child'
      )

      const request = {
        fromMemberId: direction.fromMemberId,
        toMemberId: direction.toMemberId,
        relationshipType: direction.relationshipType
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)
      
      // Verify the main relationship is created correctly: parent -> child with type 'parent'
      const mainRelationship = insertCalls.find(call => 
        call.from_member_id === parentMember.id && 
        call.to_member_id === childMember.id
      )
      expect(mainRelationship).toBeDefined()
      expect(mainRelationship.relation_type).toBe('parent')
      expect(mainRelationship.from_member_id).toBe(parentMember.id)
      expect(mainRelationship.to_member_id).toBe(childMember.id)

      // Verify the reciprocal relationship is created: child -> parent with type 'child'
      const reciprocalRelationship = insertCalls.find(call => 
        call.from_member_id === childMember.id && 
        call.to_member_id === parentMember.id
      )
      expect(reciprocalRelationship).toBeDefined()
      expect(reciprocalRelationship.relation_type).toBe('child')
      expect(reciprocalRelationship.from_member_id).toBe(childMember.id)
      expect(reciprocalRelationship.to_member_id).toBe(parentMember.id)
    })

    it('should NOT create reversed relationship when adding child', async () => {
      // This test specifically prevents the bug where child was added as parent
      const parentMember = {
        id: 'parent-id',
        first_name: 'Asha',
        last_name: 'Ismail Hagi Farah',
        birth_date: '1988-02-10',
        gender: 'female'
      }
      const childMember = {
        id: 'child-id',
        first_name: 'Bilal',
        last_name: 'Ibrahim',
        birth_date: '2023-04-01',
        gender: 'male'
      }

      const insertCalls: any[] = []
      let relationsCallCount = 0

      const insertSelectBuilder = {
        single: vi.fn().mockResolvedValue({
          data: { id: 'rel-123' },
          error: null
        })
      }
      const insertBuilder = {
        insert: vi.fn((payload) => {
          insertCalls.push(payload)
          return {
            select: vi.fn().mockReturnValue(insertSelectBuilder)
          }
        })
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [parentMember, childMember],
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
            // checkCircularRelationship
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            } as any
          }
          // insert relationship
          return insertBuilder as any
        }
        return {} as any
      })

      // When user wants to add a child, resolveRelationshipDirection should return
      // parent -> child with type 'parent', NOT child -> parent with type 'child'
      const direction = resolveRelationshipDirection(
        parentMember.id, // current member (parent)
        childMember.id,  // selected member (child)
        'child'
      )

      // Verify the direction is correct BEFORE creating the relationship
      expect(direction.fromMemberId).toBe(parentMember.id)
      expect(direction.toMemberId).toBe(childMember.id)
      expect(direction.relationshipType).toBe('parent')
      expect(direction.currentMemberRole).toBe('parent')
      expect(direction.selectedMemberRole).toBe('child')

      const request = {
        fromMemberId: direction.fromMemberId,
        toMemberId: direction.toMemberId,
        relationshipType: direction.relationshipType
      }

      const result = await familyRelationshipManager.createRelationship(request)

      expect(result.success).toBe(true)

      // CRITICAL: Ensure the relationship is NOT reversed
      // The main relationship should be parent -> child with type 'parent'
      const mainRelationship = insertCalls.find(call => 
        call.from_member_id === parentMember.id && 
        call.to_member_id === childMember.id &&
        call.relation_type === 'parent'
      )
      expect(mainRelationship).toBeDefined()
      expect(mainRelationship.from_member_id).toBe(parentMember.id)
      expect(mainRelationship.to_member_id).toBe(childMember.id)
      expect(mainRelationship.relation_type).toBe('parent')

      // Ensure the reciprocal relationship is created correctly: child -> parent with type 'child'
      const reciprocalRelationship = insertCalls.find(call => 
        call.from_member_id === childMember.id && 
        call.to_member_id === parentMember.id &&
        call.relation_type === 'child'
      )
      expect(reciprocalRelationship).toBeDefined()
      expect(reciprocalRelationship.from_member_id).toBe(childMember.id)
      expect(reciprocalRelationship.to_member_id).toBe(parentMember.id)
      expect(reciprocalRelationship.relation_type).toBe('child')

      // CRITICAL: Ensure we did NOT create a reversed relationship as the main one
      // (i.e., child -> parent with type 'parent' should NOT be the first/main relationship)
      const reversedMainRelationship = insertCalls.find(call => 
        call.from_member_id === childMember.id && 
        call.to_member_id === parentMember.id &&
        call.relation_type === 'parent'
      )
      // This should NOT exist - the main relationship should be parent -> child
      expect(reversedMainRelationship).toBeUndefined()
    })
  })
})
