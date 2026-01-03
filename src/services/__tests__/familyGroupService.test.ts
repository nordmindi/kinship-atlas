import { describe, it, expect, vi, beforeEach } from 'vitest'
import { familyGroupService } from '../familyGroupService'
import { supabase } from '@/integrations/supabase/client'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('FamilyGroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllFamilyGroups', () => {
    it('should fetch all family groups for the current user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockGroups = [
        {
          id: 'group-1',
          name: "Mother's Side",
          description: 'Family from mother',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          family_member_groups: [{ count: 5 }]
        },
        {
          id: 'group-2',
          name: "Father's Side",
          description: 'Family from father',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          family_member_groups: [{ count: 3 }]
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockGroups,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      const result = await familyGroupService.getAllFamilyGroups()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Mother's Side")
      expect(result[0].memberCount).toBe(5)
      expect(result[1].name).toBe("Father's Side")
      expect(result[1].memberCount).toBe(3)
      expect(mockSelect).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should return empty array when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await familyGroupService.getAllFamilyGroups()

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      const result = await familyGroupService.getAllFamilyGroups()

      expect(result).toEqual([])
    })
  })

  describe('getFamilyGroup', () => {
    it('should fetch a single family group by ID', async () => {
      const mockGroup = {
        id: 'group-1',
        name: "Mother's Side",
        description: 'Family from mother',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        family_member_groups: [{ count: 5 }]
      }

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockGroup,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await familyGroupService.getFamilyGroup('group-1')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('group-1')
      expect(result?.name).toBe("Mother's Side")
      expect(result?.memberCount).toBe(5)
    })

    it('should return null on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await familyGroupService.getFamilyGroup('group-1')

      expect(result).toBeNull()
    })
  })

  describe('createFamilyGroup', () => {
    it('should create a family group successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockGroup = {
        id: 'group-1',
        name: "Mother's Side",
        description: 'Family from mother',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockGroup,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      } as any)

      const result = await familyGroupService.createFamilyGroup({
        name: "Mother's Side",
        description: 'Family from mother'
      })

      expect(result.success).toBe(true)
      expect(result.group).toBeTruthy()
      expect(result.group?.name).toBe("Mother's Side")
      expect(mockInsert).toHaveBeenCalledWith({
        name: "Mother's Side",
        description: 'Family from mother',
        user_id: 'user-123'
      })
    })

    it('should return error when name is empty', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await familyGroupService.createFamilyGroup({
        name: '',
        description: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await familyGroupService.createFamilyGroup({
        name: "Mother's Side"
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('logged in')
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
        error: { message: 'Database error' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      } as any)

      const result = await familyGroupService.createFamilyGroup({
        name: "Mother's Side"
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('updateFamilyGroup', () => {
    it('should update a family group successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockGroup = {
        id: 'group-1',
        name: "Updated Name",
        description: 'Updated description',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockGroup,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle
      } as any)

      const result = await familyGroupService.updateFamilyGroup({
        id: 'group-1',
        name: 'Updated Name',
        description: 'Updated description'
      })

      expect(result.success).toBe(true)
      expect(result.group?.name).toBe('Updated Name')
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Updated Name',
        description: 'Updated description'
      })
    })

    it('should return error when name is empty', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await familyGroupService.updateFamilyGroup({
        id: 'group-1',
        name: ''
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should return error when group not found', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle
      } as any)

      const result = await familyGroupService.updateFamilyGroup({
        id: 'group-1',
        name: 'Updated Name'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('deleteFamilyGroup', () => {
    it('should delete a family group successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null
      })
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq1
      })

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete
      } as any)

      // Make the second eq call return the resolved value
      mockEq1.mockReturnValue({
        eq: mockEq2
      })

      const result = await familyGroupService.deleteFamilyGroup('group-1')

      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq1).toHaveBeenCalledWith('id', 'group-1')
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await familyGroupService.deleteFamilyGroup('group-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('logged in')
    })
  })

  describe('assignMemberToGroup', () => {
    it('should assign a member to a group successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockMemberEq = vi.fn().mockReturnThis()
      const mockMemberMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'member-1', user_id: 'user-123', created_by: 'user-123' },
        error: null
      })
      const mockMemberSelect = vi.fn().mockReturnValue({
        eq: mockMemberEq,
        maybeSingle: mockMemberMaybeSingle
      })

      const mockGroupEq1 = vi.fn().mockReturnThis()
      const mockGroupEq2 = vi.fn().mockReturnThis()
      const mockGroupMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'group-1' },
        error: null
      })
      const mockGroupSelect = vi.fn().mockReturnValue({
        eq: mockGroupEq1,
        maybeSingle: mockGroupMaybeSingle
      })

      const mockInsert = vi.fn().mockResolvedValue({
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: mockMemberSelect,
            eq: mockMemberEq,
            maybeSingle: mockMemberMaybeSingle
          } as any
        }
        if (table === 'family_groups') {
          return {
            select: mockGroupSelect,
            eq: mockGroupEq1,
            maybeSingle: mockGroupMaybeSingle
          } as any
        }
        if (table === 'family_member_groups') {
          return {
            insert: mockInsert
          } as any
        }
        return {} as any
      })

      const result = await familyGroupService.assignMemberToGroup({
        familyMemberId: 'member-1',
        familyGroupId: 'group-1'
      })

      expect(result.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith({
        family_member_id: 'member-1',
        family_group_id: 'group-1'
      })
    })

    it('should handle duplicate assignment gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockMemberEq = vi.fn().mockReturnThis()
      const mockMemberMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'member-1', user_id: 'user-123', created_by: 'user-123' },
        error: null
      })
      const mockMemberSelect = vi.fn().mockReturnValue({
        eq: mockMemberEq,
        maybeSingle: mockMemberMaybeSingle
      })

      const mockGroupEq1 = vi.fn().mockReturnThis()
      const mockGroupMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'group-1' },
        error: null
      })
      const mockGroupSelect = vi.fn().mockReturnValue({
        eq: mockGroupEq1,
        maybeSingle: mockGroupMaybeSingle
      })

      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23505', message: 'Duplicate key' }
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return {
            select: mockMemberSelect,
            eq: mockMemberEq,
            maybeSingle: mockMemberMaybeSingle
          } as any
        }
        if (table === 'family_groups') {
          return {
            select: mockGroupSelect,
            eq: mockGroupEq1,
            maybeSingle: mockGroupMaybeSingle
          } as any
        }
        if (table === 'family_member_groups') {
          return {
            insert: mockInsert
          } as any
        }
        return {} as any
      })

      const result = await familyGroupService.assignMemberToGroup({
        familyMemberId: 'member-1',
        familyGroupId: 'group-1'
      })

      expect(result.success).toBe(true) // Should treat duplicate as success
    })

    it('should return error when member not found', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        maybeSingle: mockMaybeSingle
      })

      const mockMemberCheck = {
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_members') {
          return mockMemberCheck as any
        }
        if (table === 'family_groups') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'group-1' },
              error: null
            })
          } as any
        }
        return {} as any
      })

      const result = await familyGroupService.assignMemberToGroup({
        familyMemberId: 'member-1',
        familyGroupId: 'group-1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Family member not found')
    })
  })

  describe('removeMemberFromGroup', () => {
    it('should remove a member from a group successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockGroupEq1 = vi.fn().mockReturnThis()
      const mockGroupEq2 = vi.fn().mockReturnThis()
      const mockGroupMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'group-1' },
        error: null
      })
      const mockGroupSelect = vi.fn().mockReturnValue({
        eq: mockGroupEq1,
        maybeSingle: mockGroupMaybeSingle
      })

      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockResolvedValue({
        error: null
      })
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq1
      })

      // Make the second eq call return the resolved value
      mockEq1.mockReturnValue({
        eq: mockEq2
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_groups') {
          return {
            select: mockGroupSelect,
            eq: mockGroupEq1,
            maybeSingle: mockGroupMaybeSingle
          } as any
        }
        if (table === 'family_member_groups') {
          return {
            delete: mockDelete
          } as any
        }
        return {} as any
      })

      const result = await familyGroupService.removeMemberFromGroup({
        familyMemberId: 'member-1',
        familyGroupId: 'group-1'
      })

      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq1).toHaveBeenCalledWith('family_member_id', 'member-1')
      expect(mockEq2).toHaveBeenCalledWith('family_group_id', 'group-1')
    })
  })

  describe('getMembersInGroup', () => {
    it('should fetch all members in a group', async () => {
      const mockData = [
        {
          family_member_id: 'member-1',
          family_members: {
            id: 'member-1',
            first_name: 'John',
            last_name: 'Doe',
            birth_date: '1990-01-01',
            gender: 'male',
            bio: null,
            avatar_url: null,
            birth_place: null,
            created_by: null,
            branch_root: null,
            is_root_member: false
          }
        },
        {
          family_member_id: 'member-2',
          family_members: {
            id: 'member-2',
            first_name: 'Jane',
            last_name: 'Doe',
            birth_date: '1992-01-01',
            gender: 'female',
            bio: null,
            avatar_url: null,
            birth_place: null,
            created_by: null,
            branch_root: null,
            is_root_member: false
          }
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any)

      const result = await familyGroupService.getMembersInGroup('group-1')

      expect(result).toHaveLength(2)
      expect(result[0].firstName).toBe('John')
      expect(result[1].firstName).toBe('Jane')
    })

    it('should return empty array on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any)

      const result = await familyGroupService.getMembersInGroup('group-1')

      expect(result).toEqual([])
    })
  })

  describe('getGroupsForMember', () => {
    it('should fetch all groups for a member', async () => {
      const mockData = [
        {
          family_group_id: 'group-1',
          family_groups: {
            id: 'group-1',
            name: "Mother's Side",
            description: 'Family from mother',
            user_id: 'user-123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any)

      const result = await familyGroupService.getGroupsForMember('member-1')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Mother's Side")
    })
  })

  describe('filterMembersByGroups', () => {
    it('should filter members by group IDs', async () => {
      const mockData = [
        { family_member_id: 'member-1' },
        { family_member_id: 'member-2' },
        { family_member_id: 'member-1' } // Duplicate
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        in: mockIn
      } as any)

      const result = await familyGroupService.filterMembersByGroups(['group-1', 'group-2'])

      expect(result).toHaveLength(2) // Should be unique
      expect(result).toContain('member-1')
      expect(result).toContain('member-2')
    })

    it('should return empty array when no group IDs provided', async () => {
      const result = await familyGroupService.filterMembersByGroups([])

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        in: mockIn
      } as any)

      const result = await familyGroupService.filterMembersByGroups(['group-1'])

      expect(result).toEqual([])
    })
  })
})

