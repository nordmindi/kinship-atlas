import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStories, useStory, useMemberStories } from '../useStories'
import { storyService } from '@/services/storyService'

vi.mock('@/services/storyService')

describe('useStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch stories on mount', async () => {
    const mockStories = [
      {
        id: 'story-1',
        title: 'Story 1',
        content: 'Content 1',
        date: '2024-01-01',
        authorId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        attrs: null,
        relatedMembers: [],
        media: []
      }
    ]

    vi.mocked(storyService.getAllStories).mockResolvedValue(mockStories)

    const { result } = renderHook(() => useStories())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stories).toEqual(mockStories)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    vi.mocked(storyService.getAllStories).mockRejectedValue(new Error('Fetch failed'))

    const { result } = renderHook(() => useStories())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stories).toEqual([])
    expect(result.current.error).toBe('Fetch failed')
  })

  it('should create a story', async () => {
    const mockStory = {
      id: 'story-1',
      title: 'New Story',
      content: 'New content',
      date: '2024-01-01',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      attrs: null,
      relatedMembers: [],
      media: []
    }

    vi.mocked(storyService.createStory).mockResolvedValue({
      success: true,
      story: mockStory
    })

    const { result } = renderHook(() => useStories())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const createResult = await result.current.createStory({
      title: 'New Story',
      content: 'New content',
      date: '2024-01-01',
      relatedMembers: [],
      mediaIds: []
    })

    expect(createResult.success).toBe(true)
    expect(result.current.stories).toContainEqual(mockStory)
  })

  it('should update a story', async () => {
    const existingStory = {
      id: 'story-1',
      title: 'Old Story',
      content: 'Old content',
      date: '2024-01-01',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      attrs: null,
      relatedMembers: [],
      media: []
    }

    const updatedStory = {
      ...existingStory,
      title: 'Updated Story',
      content: 'Updated content'
    }

    vi.mocked(storyService.getAllStories).mockResolvedValue([existingStory])
    vi.mocked(storyService.updateStory).mockResolvedValue({
      success: true,
      story: updatedStory
    })

    const { result } = renderHook(() => useStories())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const updateResult = await result.current.updateStory({
      id: 'story-1',
      title: 'Updated Story',
      content: 'Updated content'
    })

    expect(updateResult.success).toBe(true)
    expect(result.current.stories[0].title).toBe('Updated Story')
  })

  it('should delete a story', async () => {
    const mockStory = {
      id: 'story-1',
      title: 'Story 1',
      content: 'Content 1',
      date: '2024-01-01',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      attrs: null,
      relatedMembers: [],
      media: []
    }

    vi.mocked(storyService.getAllStories).mockResolvedValue([mockStory])
    vi.mocked(storyService.deleteStory).mockResolvedValue({
      success: true
    })

    const { result } = renderHook(() => useStories())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const deleteResult = await result.current.deleteStory('story-1')

    expect(deleteResult.success).toBe(true)
    expect(result.current.stories).not.toContainEqual(mockStory)
  })
})

describe('useStory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch a single story', async () => {
    const mockStory = {
      id: 'story-1',
      title: 'Story 1',
      content: 'Content 1',
      date: '2024-01-01',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      attrs: null,
      relatedMembers: [],
      media: []
    }

    vi.mocked(storyService.getStory).mockResolvedValue(mockStory)

    const { result } = renderHook(() => useStory('story-1'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.story).toEqual(mockStory)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    vi.mocked(storyService.getStory).mockResolvedValue(null)

    const { result } = renderHook(() => useStory('story-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.story).toBeNull()
  })
})

describe('useMemberStories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch stories for a member', async () => {
    const mockStories = [
      {
        id: 'story-1',
        title: 'Story 1',
        content: 'Content 1',
        date: '2024-01-01',
        authorId: 'user-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        attrs: null,
        relatedMembers: [],
        media: []
      }
    ]

    vi.mocked(storyService.getStoriesForMember).mockResolvedValue(mockStories)

    const { result } = renderHook(() => useMemberStories('member-123'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stories).toEqual(mockStories)
  })

  it('should not fetch if memberId is empty', async () => {
    const { result } = renderHook(() => useMemberStories(''))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(storyService.getStoriesForMember).not.toHaveBeenCalled()
    expect(result.current.stories).toEqual([])
  })
})

