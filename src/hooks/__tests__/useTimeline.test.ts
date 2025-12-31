import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useMemberTimeline,
  useFamilyTimeline,
  useTimelineSearch,
  useTimelineStats
} from '../useTimeline'
import { timelineService } from '@/services/timelineService'

vi.mock('@/services/timelineService')

describe('useMemberTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch member timeline on mount', async () => {
    const mockTimeline = [
      {
        memberId: 'member-123',
        itemType: 'story' as const,
        itemId: 'story-1',
        title: 'Story 1',
        date: '2024-01-01',
        content: 'Content 1'
      }
    ]

    vi.mocked(timelineService.getMemberTimeline).mockResolvedValue(mockTimeline)

    const { result } = renderHook(() => useMemberTimeline('member-123'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.timeline).toEqual(mockTimeline)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    vi.mocked(timelineService.getMemberTimeline).mockRejectedValue(new Error('Fetch failed'))

    const { result } = renderHook(() => useMemberTimeline('member-123'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.timeline).toEqual([])
    expect(result.current.error).toBe('Fetch failed')
  })

  it('should not fetch if memberId is empty', async () => {
    const { result } = renderHook(() => useMemberTimeline(''))

    // The hook should set isLoading to false immediately when memberId is empty
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 2000 })

    expect(timelineService.getMemberTimeline).not.toHaveBeenCalled()
    expect(result.current.timeline).toEqual([])
    expect(result.current.error).toBeNull()
  })
})

describe('useFamilyTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch family timeline on mount', async () => {
    const mockTimeline = [
      {
        memberId: 'member-1',
        itemType: 'story' as const,
        itemId: 'story-1',
        title: 'Story 1',
        date: '2024-01-01'
      }
    ]

    // Use a stable array reference to avoid dependency issues
    const memberIds = ['member-1', 'member-2']
    vi.mocked(timelineService.getFamilyTimeline).mockResolvedValue(mockTimeline)

    const { result } = renderHook(() => useFamilyTimeline(memberIds))

    expect(result.current.isLoading).toBe(true)

    // Wait for the mock to be called and loading to complete
    await waitFor(() => {
      expect(timelineService.getFamilyTimeline).toHaveBeenCalledWith(memberIds)
    }, { timeout: 1000 })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 1000 })

    expect(result.current.timeline).toEqual(mockTimeline)
    expect(result.current.error).toBeNull()
  })

  it('should return empty array if no member IDs provided', async () => {
    const { result } = renderHook(() => useFamilyTimeline([]))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.timeline).toEqual([])
    expect(timelineService.getFamilyTimeline).not.toHaveBeenCalled()
  })
})

describe('useTimelineSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should search timeline', async () => {
    const mockResults = [
      {
        memberId: 'member-123',
        itemType: 'story' as const,
        itemId: 'story-1',
        title: 'Test Story',
        date: '2024-01-01'
      }
    ]

    vi.mocked(timelineService.searchTimeline).mockResolvedValue(mockResults)

    const { result } = renderHook(() => useTimelineSearch())

    await result.current.searchTimeline('Test')

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.searchResults).toEqual(mockResults)
  })

  it('should clear search results', async () => {
    const { result } = renderHook(() => useTimelineSearch())

    result.current.clearSearch()

    expect(result.current.searchResults).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should not search if query is empty', async () => {
    const { result } = renderHook(() => useTimelineSearch())

    await result.current.searchTimeline('')

    expect(timelineService.searchTimeline).not.toHaveBeenCalled()
    expect(result.current.searchResults).toEqual([])
  })
})

describe('useTimelineStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch timeline stats', async () => {
    const mockStats = {
      totalStories: 5,
      totalEvents: 3,
      dateRange: {
        earliest: '2024-01-01',
        latest: '2024-12-31'
      },
      locations: [
        { location: 'New York', count: 3 },
        { location: 'Boston', count: 2 }
      ]
    }

    vi.mocked(timelineService.getTimelineStats).mockResolvedValue(mockStats)

    const { result } = renderHook(() => useTimelineStats('member-123'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.stats).toEqual(mockStats)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    vi.mocked(timelineService.getTimelineStats).mockRejectedValue(new Error('Fetch failed'))

    const { result } = renderHook(() => useTimelineStats('member-123'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.stats.totalStories).toBe(0)
    expect(result.current.error).toBe('Fetch failed')
  })
})

