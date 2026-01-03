import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/integrations/supabase/client'

// Mock userService BEFORE importing storyService
vi.mock('../userService', () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(false)),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
  canUserEditFamilyMember: vi.fn(),
  getUserBranchMembers: vi.fn()
}))

// Import storyService after mocking userService
import { storyService } from '../storyService'

describe('StoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('createStory', () => {
    it('should create a story successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock insert().select('id') which returns an array
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'story-123' }],
        error: null
      })
      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return {
            insert: mockInsert,
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'story-123' }],
              error: null
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'story-123',
                title: 'Test Story',
                content: 'Test content',
                date: '2024-01-01',
                author_id: 'user-123',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                attrs: null,
                location: 'New York, USA',
                lat: 40.7128,
                lng: -74.0060,
                story_members: [],
                story_media: []
              },
              error: null
            })
          } as any
        }
        if (table === 'story_members' || table === 'story_media' || table === 'story_artifacts') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          } as any
        }
        if (table === 'story_artifacts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
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
        location: undefined,
        lat: undefined,
        lng: undefined,
        relatedMembers: [],
        media: [],
        artifacts: []
      })

      const result = await storyService.createStory({
        title: 'Test Story',
        content: 'Test content',
        date: '2024-01-01',
        location: 'New York, USA',
        lat: 40.7128,
        lng: -74.0060,
        relatedMembers: [],
        mediaIds: [],
        artifactIds: []
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

      // Mock insert().select('id') to return an error
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
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
        location: 'New York, USA',
        lat: 40.7128,
        lng: -74.0060,
        story_members: [],
        story_media: []
      }

      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockStory,
        error: null
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        maybeSingle: mockMaybeSingle
      })

      // Mock story_artifacts query (separate query for artifacts)
      const mockStoryArtifactsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
      const mockStoryArtifactsSelect = vi.fn().mockReturnValue({
        eq: mockStoryArtifactsEq
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return {
            select: mockSelect,
            eq: mockEq,
            maybeSingle: mockMaybeSingle
          } as any
        }
        if (table === 'story_artifacts') {
          return {
            select: mockStoryArtifactsSelect,
            eq: mockStoryArtifactsEq
          } as any
        }
        if (table === 'artifacts') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          } as any
        }
        if (table === 'artifact_media') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          } as any
        }
        if (table === 'story_groups') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          } as any
        }
        return {} as any
      })

      const result = await storyService.getStory('story-123')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('story-123')
      expect(result?.title).toBe('Test Story')
      expect(result?.location).toBe('New York, USA')
      expect(result?.lat).toBe(40.7128)
      expect(result?.lng).toBe(-74.0060)
    })

    it('should return null on error', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
        maybeSingle: mockMaybeSingle
      })

      // Mock story_artifacts query (separate query for artifacts)
      const mockStoryArtifactsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
      const mockStoryArtifactsSelect = vi.fn().mockReturnValue({
        eq: mockStoryArtifactsEq
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return {
            select: mockSelect,
            eq: mockEq,
            maybeSingle: mockMaybeSingle
          } as any
        }
        if (table === 'story_artifacts') {
          return {
            select: mockStoryArtifactsSelect,
            eq: mockStoryArtifactsEq
          } as any
        }
        return {} as any
      })

      const result = await storyService.getStory('story-123')

      expect(result).toBeNull()
      expect(mockMaybeSingle).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'story-123')
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

      // Mock story_artifacts query (separate query for artifacts)
      const mockStoryArtifactsSelect = vi.fn().mockReturnThis()
      const mockStoryArtifactsEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return {
            select: mockSelect,
            order: mockOrder
          } as any
        }
        if (table === 'story_artifacts') {
          return {
            select: mockStoryArtifactsSelect,
            eq: mockStoryArtifactsEq
          } as any
        }
        return {} as any
      })

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

      const queryBuilder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return queryBuilder as any
        }
        if (table === 'story_members' || table === 'story_media' || table === 'story_artifacts') {
          return {
            delete: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null })
          } as any
        }
        return {} as any
      })

      // Make the final eq() call resolve
      queryBuilder.eq.mockImplementation((key: string) => {
        if (key === 'author_id') {
          return Promise.resolve({ data: null, error: null })
        }
        return queryBuilder
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
        location: 'Boston, USA',
        lat: 42.3601,
        lng: -71.0589,
        relatedMembers: [],
        media: [],
        artifacts: []
      })

      const result = await storyService.updateStory({
        id: 'story-123',
        title: 'Updated Story',
        content: 'Updated content',
        location: 'Boston, USA',
        lat: 42.3601,
        lng: -71.0589
      })

      expect(result.success).toBe(true)
      expect(result.story?.title).toBe('Updated Story')
      expect(result.story?.location).toBe('Boston, USA')
      expect(mockGetStory).toHaveBeenCalledWith('story-123')
    })

  })

  describe('createArtifact', () => {
    it('should create an artifact successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'artifact-123' },
        error: null
      })

      // Mock artifact_media query (separate query for artifact media)
      const mockArtifactMediaSelect = vi.fn().mockReturnThis()
      const mockArtifactMediaEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'artifacts') {
          return {
            insert: mockInsert,
            select: mockSelect,
            single: mockSingle
          } as any
        }
        if (table === 'artifact_media') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: mockArtifactMediaSelect,
            eq: mockArtifactMediaEq
          } as any
        }
        return {} as any
      })

      // Mock getArtifact call
      vi.spyOn(storyService, 'getArtifact').mockResolvedValue({
        id: 'artifact-123',
        name: 'Grandfather\'s Watch',
        description: 'A vintage pocket watch',
        artifactType: 'heirloom',
        dateCreated: '1920-01-01',
        dateAcquired: undefined,
        condition: 'Good',
        locationStored: 'Safe',
        ownerId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        attrs: null,
        media: []
      })

      const result = await storyService.createArtifact({
        name: 'Grandfather\'s Watch',
        description: 'A vintage pocket watch',
        artifactType: 'heirloom',
        dateCreated: '1920-01-01',
        condition: 'Good',
        locationStored: 'Safe'
      })

      expect(result.success).toBe(true)
      expect(result.artifact?.name).toBe('Grandfather\'s Watch')
      expect(result.artifact?.artifactType).toBe('heirloom')
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

      const result = await storyService.createArtifact({
        name: 'Test Artifact',
        artifactType: 'document'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('logged in')
    })
  })

  describe('getArtifact', () => {
    it('should fetch an artifact successfully', async () => {
      const mockArtifact = {
        id: 'artifact-123',
        name: 'Grandfather\'s Watch',
        description: 'A vintage pocket watch',
        artifact_type: 'heirloom',
        date_created: '1920-01-01',
        date_acquired: null,
        condition: 'Good',
        location_stored: 'Safe',
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        attrs: null,
        artifact_media: []
      }

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockArtifact,
        error: null
      })

      // Mock artifact_media query (separate query for artifact media)
      const mockArtifactMediaSelect = vi.fn().mockReturnThis()
      const mockArtifactMediaEq = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'artifacts') {
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle
          } as any
        }
        if (table === 'artifact_media') {
          return {
            select: mockArtifactMediaSelect,
            eq: mockArtifactMediaEq
          } as any
        }
        return {} as any
      })

      const result = await storyService.getArtifact('artifact-123')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('artifact-123')
      expect(result?.name).toBe('Grandfather\'s Watch')
      expect(result?.artifactType).toBe('heirloom')
    })

    it('should return null on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'artifacts') {
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle
          } as any
        }
        return {} as any
      })

      const result = await storyService.getArtifact('artifact-123')

      expect(result).toBeNull()
    })
  })

  describe('getAllArtifacts', () => {
    it('should fetch all artifacts successfully', async () => {
      const mockArtifacts = [
        {
          id: 'artifact-1',
          name: 'Artifact 1',
          description: 'Description 1',
          artifact_type: 'document',
          date_created: '2020-01-01',
          date_acquired: null,
          condition: 'Good',
          location_stored: 'Archive',
          owner_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          attrs: null,
          artifact_media: []
        },
        {
          id: 'artifact-2',
          name: 'Artifact 2',
          description: 'Description 2',
          artifact_type: 'photo',
          date_created: '2021-01-01',
          date_acquired: null,
          condition: 'Excellent',
          location_stored: 'Album',
          owner_id: 'user-123',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          attrs: null,
          artifact_media: []
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockArtifacts,
        error: null
      })

      // Mock artifact_media query (separate query for artifact media)
      const mockArtifactMediaSelect = vi.fn().mockReturnThis()
      const mockArtifactMediaIn = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'artifacts') {
          return {
            select: mockSelect,
            order: mockOrder
          } as any
        }
        if (table === 'artifact_media') {
          return {
            select: mockArtifactMediaSelect,
            in: mockArtifactMediaIn
          } as any
        }
        return {} as any
      })

      const result = await storyService.getAllArtifacts()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Artifact 1')
      expect(result[1].artifactType).toBe('photo')
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

      const result = await storyService.getAllArtifacts()

      expect(result).toEqual([])
    })
  })

  describe('deleteStory', () => {
    it('should delete a story successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      queryBuilder.eq.mockImplementation((key: string) => {
        if (key === 'author_id') {
          return Promise.resolve({ data: null, error: null })
        }
        return queryBuilder
      })

      vi.mocked(supabase.from).mockReturnValue(queryBuilder as any)

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

