import { describe, it, expect, vi, beforeEach } from 'vitest'
import { albumService } from '../albumService'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('AlbumService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllAlbums', () => {
    it('should fetch all albums for the current user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockAlbums = [
        {
          id: 'album-1',
          name: 'Family Photos',
          description: 'Photos from family gatherings',
          cover_media_id: 'media-1',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          cover_media: {
            id: 'media-1',
            url: 'https://example.com/cover.jpg',
            media_type: 'image'
          },
          album_family_groups: [],
          album_family_members: [],
          album_story_categories: [],
          album_media: []
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockAlbums,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        in: mockIn,
        order: mockOrder
      } as any)

      const result = await albumService.getAllAlbums()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('album-1')
      expect(result[0].name).toBe('Family Photos')
    })

    it('should filter albums by family group', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock the filter query for album_family_groups
      const mockFilterSelect = vi.fn().mockReturnThis()
      const mockFilterEq = vi.fn().mockResolvedValue({
        data: [{ album_id: 'album-1' }],
        error: null
      })

      // Mock the main albums query
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{
          id: 'album-1',
          name: 'Family Photos',
          description: null,
          cover_media_id: null,
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          cover_media: null,
          album_family_groups: [],
          album_family_members: [],
          album_story_categories: [],
          album_media: []
        }],
        error: null
      })

      let fromCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'album_family_groups') {
          return {
            select: mockFilterSelect,
            eq: mockFilterEq
          } as any
        }
        return {
          select: mockSelect,
          eq: mockEq,
          in: mockIn,
          order: mockOrder
        } as any
      })

      const result = await albumService.getAllAlbums({ familyGroupId: 'group-1' })

      expect(result).toHaveLength(1)
      expect(mockFilterEq).toHaveBeenCalledWith('family_group_id', 'group-1')
    })

    it('should return empty array when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await albumService.getAllAlbums()

      expect(result).toEqual([])
      expect(toast).toHaveBeenCalled()
    })

    it('should return empty array when filter matches no albums', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFilterSelect = vi.fn().mockReturnThis()
      const mockFilterEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      let fromCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'album_family_groups') {
          return {
            select: mockFilterSelect,
            eq: mockFilterEq
          } as any
        }
        return {} as any
      })

      const result = await albumService.getAllAlbums({ familyGroupId: 'group-1' })

      expect(result).toEqual([])
    })
  })

  describe('getAlbumById', () => {
    it('should fetch a single album by ID', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockAlbum = {
        id: 'album-1',
        name: 'Family Photos',
        description: 'Photos from family gatherings',
        cover_media_id: 'media-1',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        cover_media: {
          id: 'media-1',
          url: 'https://example.com/cover.jpg',
          media_type: 'image'
        },
        album_family_groups: [{
          family_groups: {
            id: 'group-1',
            name: "Mother's Side",
            description: null
          }
        }],
        album_family_members: [{
          family_members: {
            id: 'member-1',
            first_name: 'John',
            last_name: 'Doe'
          }
        }],
        album_story_categories: [{
          story_categories: {
            id: 'category-1',
            name: 'Biography',
            description: 'Personal life stories'
          }
        }],
        album_media: [{
          media: {
            id: 'media-1',
            url: 'https://example.com/image.jpg',
            media_type: 'image',
            caption: 'Test image',
            file_name: 'test.jpg'
          },
          display_order: 0
        }]
      }

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockAlbum,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await albumService.getAlbumById('album-1')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('album-1')
      expect(result?.name).toBe('Family Photos')
      expect(result?.familyGroups).toHaveLength(1)
      expect(result?.familyMembers).toHaveLength(1)
      expect(result?.storyCategories).toHaveLength(1)
      expect(result?.media).toHaveLength(1)
    })

    it('should return null when album is not found', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

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

      const result = await albumService.getAlbumById('album-999')

      expect(result).toBeNull()
    })
  })

  describe('createAlbum', () => {
    it('should create an album successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'album-1' },
        error: null
      })

      const mockInsertJunction = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      let fromCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'albums') {
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle
          } as any
        }
        // Junction tables
        return {
          insert: mockInsertJunction
        } as any
      })

      // Mock getAlbumById to return the created album
      vi.spyOn(albumService, 'getAlbumById').mockResolvedValue({
        id: 'album-1',
        name: 'New Album',
        description: 'Test description',
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        familyGroups: [],
        familyMembers: [],
        storyCategories: [],
        media: []
      })

      const result = await albumService.createAlbum({
        name: 'New Album',
        description: 'Test description',
        familyGroupIds: ['group-1'],
        familyMemberIds: ['member-1'],
        storyCategoryIds: ['category-1'],
        mediaIds: ['media-1']
      })

      expect(result).toBeTruthy()
      expect(result?.id).toBe('album-1')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should return null when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await albumService.createAlbum({
        name: 'New Album'
      })

      expect(result).toBeNull()
    })
  })

  describe('updateAlbum', () => {
    it('should update an album successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Create a chainable query builder for albums update
      const albumsQueryBuilder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }
      albumsQueryBuilder.eq.mockImplementation((key: string) => {
        if (key === 'user_id') {
          return Promise.resolve({ data: null, error: null })
        }
        return albumsQueryBuilder
      })

      // Create chainable query builders for junction tables
      const junctionQueryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      }
      junctionQueryBuilder.eq.mockImplementation((key: string) => {
        if (key === 'album_id') {
          return Promise.resolve({ data: null, error: null })
        }
        return junctionQueryBuilder
      })

      let fromCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'albums') {
          return albumsQueryBuilder
        }
        // Junction tables
        return junctionQueryBuilder
      })

      // Mock getAlbumById to return the updated album
      vi.spyOn(albumService, 'getAlbumById').mockResolvedValue({
        id: 'album-1',
        name: 'Updated Album',
        description: 'Updated description',
        userId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        familyGroups: [],
        familyMembers: [],
        storyCategories: [],
        media: []
      })

      const result = await albumService.updateAlbum({
        id: 'album-1',
        name: 'Updated Album',
        description: 'Updated description'
      })

      expect(result).toBeTruthy()
      expect(result?.name).toBe('Updated Album')
      expect(albumsQueryBuilder.update).toHaveBeenCalled()
    })
  })

  describe('deleteAlbum', () => {
    it('should delete an album successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const deleteQueryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }
      deleteQueryBuilder.eq.mockImplementation((key: string) => {
        if (key === 'user_id') {
          return Promise.resolve({ data: null, error: null })
        }
        return deleteQueryBuilder
      })

      vi.mocked(supabase.from).mockReturnValue(deleteQueryBuilder)

      const result = await albumService.deleteAlbum('album-1')

      expect(result).toBe(true)
      expect(deleteQueryBuilder.delete).toHaveBeenCalled()
    })

    it('should return false when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await albumService.deleteAlbum('album-1')

      expect(result).toBe(false)
    })
  })

  describe('addMediaToAlbum', () => {
    it('should add media to an album successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock album ownership check
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'album-1' },
        error: null
      })

      // Mock existing media query
      const mockSelectMedia = vi.fn().mockReturnThis()
      const mockEqMedia = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      // Mock insert
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      let fromCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'albums') {
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle
          } as any
        }
        if (table === 'album_media') {
          if (fromCallCount === 2) {
            // Existing media query
            return {
              select: mockSelectMedia,
              eq: mockEqMedia,
              order: mockOrder,
              limit: mockLimit
            } as any
          }
          // Insert
          return {
            insert: mockInsert
          } as any
        }
        return {} as any
      })

      const result = await albumService.addMediaToAlbum('album-1', ['media-1', 'media-2'])

      expect(result).toBe(true)
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('removeMediaFromAlbum', () => {
    it('should remove media from an album successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock album ownership check
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'album-1' },
        error: null
      })

      // Mock delete for album_media
      const albumMediaDeleteBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }
      albumMediaDeleteBuilder.eq.mockImplementation((key: string) => {
        if (key === 'media_id') {
          return Promise.resolve({ data: null, error: null })
        }
        return albumMediaDeleteBuilder
      })

      let fromCallCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'albums') {
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle
          } as any
        }
        if (table === 'album_media') {
          return albumMediaDeleteBuilder
        }
        return {} as any
      })

      const result = await albumService.removeMediaFromAlbum('album-1', 'media-1')

      expect(result).toBe(true)
      expect(albumMediaDeleteBuilder.delete).toHaveBeenCalled()
    })
  })

  describe('getStoryCategories', () => {
    it('should fetch all story categories', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          name: 'Biography',
          description: 'Personal life stories',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'category-2',
          name: 'Migration',
          description: 'Migration stories',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockCategories,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder
      } as any)

      const result = await albumService.getStoryCategories()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Biography')
      expect(result[1].name).toBe('Migration')
    })

    it('should return empty array on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder
      } as any)

      const result = await albumService.getStoryCategories()

      expect(result).toEqual([])
    })
  })

  describe('getAlbumsByFamilyGroup', () => {
    it('should fetch albums filtered by family group', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.spyOn(albumService, 'getAllAlbums').mockResolvedValue([
        {
          id: 'album-1',
          name: 'Family Photos',
          userId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          familyGroups: [{ id: 'group-1', name: "Mother's Side" }]
        }
      ])

      const result = await albumService.getAlbumsByFamilyGroup('group-1')

      expect(result).toHaveLength(1)
      expect(albumService.getAllAlbums).toHaveBeenCalledWith({ familyGroupId: 'group-1' })
    })
  })

  describe('getAlbumsByFamilyMember', () => {
    it('should fetch albums filtered by family member', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.spyOn(albumService, 'getAllAlbums').mockResolvedValue([
        {
          id: 'album-1',
          name: 'John\'s Photos',
          userId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          familyMembers: [{ id: 'member-1', firstName: 'John', lastName: 'Doe' }]
        }
      ])

      const result = await albumService.getAlbumsByFamilyMember('member-1')

      expect(result).toHaveLength(1)
      expect(albumService.getAllAlbums).toHaveBeenCalledWith({ familyMemberId: 'member-1' })
    })
  })

  describe('getAlbumsByStoryCategory', () => {
    it('should fetch albums filtered by story category', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.spyOn(albumService, 'getAllAlbums').mockResolvedValue([
        {
          id: 'album-1',
          name: 'Biography Album',
          userId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          storyCategories: [{ id: 'category-1', name: 'Biography' }]
        }
      ])

      const result = await albumService.getAlbumsByStoryCategory('category-1')

      expect(result).toHaveLength(1)
      expect(albumService.getAllAlbums).toHaveBeenCalledWith({ storyCategoryId: 'category-1' })
    })
  })
})

