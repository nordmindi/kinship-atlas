import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storyService } from '../storyService'
import { supabase } from '@/integrations/supabase/client'

describe('StoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createStory', () => {
    it('should create a story successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'story-123' },
        error: null
      })

      const mockStorySelect = vi.fn().mockReturnThis()
      const mockStoryEq = vi.fn().mockReturnThis()
      const mockStorySingle = vi.fn().mockResolvedValue({
        data: {
          id: 'story-123',
          title: 'Test Story',
          content: 'Test content',
          date: '2024-01-01',
          author_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          attrs: null,
          story_members: [],
          story_media: []
        },
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle,
            eq: mockStoryEq,
            order: vi.fn().mockReturnThis()
          } as any
        }
        if (table === 'story_members' || table === 'story_media') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          } as any
        }
        return {} as any
      })

      // Mock getStory call
      vi.spyOn(storyService, 'getStory').mockResolvedValue({
        id: 'story-123',
        title: 'Test Story',
        content: 'Test content',
        date: '2024-01-01',
        authorId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        attrs: null,
        relatedMembers: [],
        media: []
      })

      const result = await storyService.createStory({
        title: 'Test Story',
        content: 'Test content',
        date: '2024-01-01',
        relatedMembers: [],
        mediaIds: []
      })

      expect(result.success).toBe(true)
      expect(result.story?.title).toBe('Test Story')
    })

    it('should return error if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await storyService.createStory({
        title: 'Test Story',
        content: 'Test content',
        relatedMembers: [],
        mediaIds: []
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

      const result = await storyService.createStory({
        title: 'Test Story',
        content: 'Test content',
        relatedMembers: [],
        mediaIds: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to create story')
    })
  })

  describe('getStory', () => {
    it('should fetch a story successfully', async () => {
      const mockStory = {
        id: 'story-123',
        title: 'Test Story',
        content: 'Test content',
        date: '2024-01-01',
        author_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        attrs: null,
        story_members: [],
        story_media: []
      }

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockStory,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await storyService.getStory('story-123')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('story-123')
      expect(result?.title).toBe('Test Story')
    })

    it('should return null on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any)

      const result = await storyService.getStory('story-123')

      expect(result).toBeNull()
    })
  })

  describe('getAllStories', () => {
    it('should fetch all stories successfully', async () => {
      const mockStories = [
        {
          id: 'story-1',
          title: 'Story 1',
          content: 'Content 1',
          date: '2024-01-01',
          author_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          attrs: null,
          story_members: [],
          story_media: []
        },
        {
          id: 'story-2',
          title: 'Story 2',
          content: 'Content 2',
          date: '2024-01-02',
          author_id: 'user-123',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          attrs: null,
          story_members: [],
          story_media: []
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockStories,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder
      } as any)

      const result = await storyService.getAllStories()

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Story 1')
    })

    it('should return empty array on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder
      } as any)

      const result = await storyService.getAllStories()

      expect(result).toEqual([])
    })
  })

  describe('updateStory', () => {
    it('should update a story successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return {
            update: mockUpdate,
            eq: mockEq
          } as any
        }
        if (table === 'story_members' || table === 'story_media') {
          return {
            delete: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null })
          } as any
        }
        return {} as any
      })

      // Mock getStory to return the updated story
      const mockGetStory = vi.spyOn(storyService, 'getStory').mockResolvedValue({
        id: 'story-123',
        title: 'Updated Story',
        content: 'Updated content',
        date: '2024-01-01',
        authorId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        attrs: null,
        relatedMembers: [],
        media: []
      })

      const result = await storyService.updateStory({
        id: 'story-123',
        title: 'Updated Story',
        content: 'Updated content'
      })

      expect(result.success).toBe(true)
      expect(result.story?.title).toBe('Updated Story')
      expect(mockGetStory).toHaveBeenCalledWith('story-123')
    })
  })

  describe('deleteStory', () => {
    it('should delete a story successfully', async () => {
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
        eq: mockEq
      } as any)

      const result = await storyService.deleteStory('story-123')

      expect(result.success).toBe(true)
    })

    it('should return error if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await storyService.deleteStory('story-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('logged in')
    })
  })
})

