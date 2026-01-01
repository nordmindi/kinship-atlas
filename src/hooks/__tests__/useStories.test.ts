import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStories, useStory, useMemberStories } from '../useStories'
import { storyService } from '@/services/storyService'

vi.mock('@/services/storyService')

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

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
        location: 'New York, USA',
        lat: 40.7128,
        lng: -74.0060,
        relatedMembers: [],
        media: [],
        artifacts: []
      }
    ]

    vi.mocked(storyService.getAllStories).mockResolvedValue(mockStories)

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockStories)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    vi.mocked(storyService.getAllStories).mockRejectedValue(new Error('Fetch failed'))

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeTruthy()
  })

  // Note: Story creation is tested via useCreateStory hook separately
  // This test is skipped as useStories only provides query functionality
  it.skip('should create a story', async () => {
    // Mutation tests should be in a separate test file for useCreateStory
  })

  it.skip('should update a story', async () => {
    const existingStory = {
      id: 'story-1',
      title: 'Old Story',
      content: 'Old content',
      date: '2024-01-01',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      attrs: null,
      location: 'New York, USA',
      lat: 40.7128,
      lng: -74.0060,
      relatedMembers: [],
      media: [],
      artifacts: []
    }

    const updatedStory = {
      ...existingStory,
      title: 'Updated Story',
      content: 'Updated content',
      location: 'Boston, USA',
      lat: 42.3601,
      lng: -71.0589
    }

    vi.mocked(storyService.getAllStories).mockResolvedValue([existingStory])
    vi.mocked(storyService.updateStory).mockResolvedValue({
      success: true,
      story: updatedStory
    })

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() })

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

  it.skip('should delete a story', async () => {
    const mockStory = {
      id: 'story-1',
      title: 'Story 1',
      content: 'Content 1',
      date: '2024-01-01',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      attrs: null,
      location: 'New York, USA',
      lat: 40.7128,
      lng: -74.0060,
      relatedMembers: [],
      media: [],
      artifacts: []
    }

    vi.mocked(storyService.getAllStories).mockResolvedValue([mockStory])
    vi.mocked(storyService.deleteStory).mockResolvedValue({
      success: true
    })

    const { result } = renderHook(() => useStories(), { wrapper: createWrapper() })

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
      location: 'New York, USA',
      lat: 40.7128,
      lng: -74.0060,
      relatedMembers: [],
      media: [],
      artifacts: []
    }

    vi.mocked(storyService.getStory).mockResolvedValue(mockStory)

    const { result } = renderHook(() => useStory('story-1'), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockStory)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    vi.mocked(storyService.getStory).mockResolvedValue(null)

    const { result } = renderHook(() => useStory('story-1'), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
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
        location: 'New York, USA',
        lat: 40.7128,
        lng: -74.0060,
        relatedMembers: [],
        media: [],
        artifacts: []
      }
    ]

    vi.mocked(storyService.getStoriesForMember).mockResolvedValue(mockStories)

    const { result } = renderHook(() => useMemberStories('member-123'), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockStories)
  })

  it('should not fetch if memberId is empty', async () => {
    const { result } = renderHook(() => useMemberStories(''), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(storyService.getStoriesForMember).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })
})

