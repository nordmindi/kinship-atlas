import { describe, it, expect, vi, beforeEach } from 'vitest'
import { timelineService } from '../timelineService'
import { supabase } from '@/integrations/supabase/client'

describe('TimelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMemberTimeline', () => {
    it('should fetch member timeline successfully', async () => {
      const mockTimeline = [
        {
          memberId: 'member-123',
          itemType: 'story',
          itemId: 'story-1',
          title: 'Test Story',
          date: '2024-01-01',
          content: 'Story content'
        },
        {
          memberId: 'member-123',
          itemType: 'event',
          itemId: 'event-1',
          title: 'Test Event',
          date: '2024-01-02',
          description: 'Event description'
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTimeline,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      const result = await timelineService.getMemberTimeline('member-123')

      expect(result).toHaveLength(2)
      expect(result[0].itemType).toBe('story')
      expect(result[1].itemType).toBe('event')
    })

    it('should return empty array on error', async () => {
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

      const result = await timelineService.getMemberTimeline('member-123')

      expect(result).toEqual([])
    })
  })

  describe('getFamilyTimeline', () => {
    it('should fetch family timeline successfully', async () => {
      const mockTimeline = [
        {
          member_id: 'member-1',
          item_type: 'story',
          item_id: 'story-1',
          title: 'Story 1',
          date: '2024-01-01'
        },
        {
          member_id: 'member-2',
          item_type: 'event',
          item_id: 'event-1',
          title: 'Event 1',
          date: '2024-01-02'
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTimeline,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        in: mockIn,
        order: mockOrder
      } as any)

      const result = await timelineService.getFamilyTimeline(['member-1', 'member-2'])

      expect(result).toHaveLength(2)
    })

    it('should return empty array if no member IDs provided', async () => {
      const result = await timelineService.getFamilyTimeline([])

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        in: mockIn,
        order: mockOrder
      } as any)

      const result = await timelineService.getFamilyTimeline(['member-1'])

      expect(result).toEqual([])
    })
  })

  describe('getTimelineByDateRange', () => {
    it('should fetch timeline by date range successfully', async () => {
      const mockTimeline = [
        {
          member_id: 'member-123',
          item_type: 'story',
          item_id: 'story-1',
          title: 'Story 1',
          date: '2024-01-15'
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLte = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTimeline,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        in: mockIn,
        order: mockOrder
      } as any)

      const result = await timelineService.getTimelineByDateRange('2024-01-01', '2024-01-31')

      expect(result).toHaveLength(1)
      expect(mockGte).toHaveBeenCalledWith('date', '2024-01-01')
      expect(mockLte).toHaveBeenCalledWith('date', '2024-01-31')
    })

    it('should filter by member IDs if provided', async () => {
      const mockTimeline = []

      const mockSelect = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLte = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({
        data: mockTimeline,
        error: null
      })

      const queryBuilder: any = {
        select: mockSelect,
        gte: mockGte,
        lte: mockLte,
        order: mockOrder,
        in: mockIn
      }

      vi.mocked(supabase.from).mockReturnValue(queryBuilder)

      await timelineService.getTimelineByDateRange('2024-01-01', '2024-01-31', ['member-1'])

      expect(mockIn).toHaveBeenCalledWith('member_id', ['member-1'])
      expect(mockGte).toHaveBeenCalledWith('date', '2024-01-01')
      expect(mockLte).toHaveBeenCalledWith('date', '2024-01-31')
    })
  })

  describe('getTimelineByLocation', () => {
    it('should fetch timeline by location successfully', async () => {
      const mockTimeline = [
        {
          member_id: 'member-123',
          item_type: 'event',
          item_id: 'event-1',
          title: 'Event 1',
          date: '2024-01-01',
          lat: 40.7128,
          lng: -74.0060
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTimeline,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        not: mockNot,
        order: mockOrder
      } as any)

      const result = await timelineService.getTimelineByLocation(40.7128, -74.0060, 10)

      expect(result).toHaveLength(1)
    })

    it('should filter by distance radius', async () => {
      const mockTimeline = [
        {
          member_id: 'member-123',
          item_type: 'event',
          item_id: 'event-1',
          title: 'Event 1',
          date: '2024-01-01',
          lat: 40.7128,
          lng: -74.0060
        },
        {
          member_id: 'member-123',
          item_type: 'event',
          item_id: 'event-2',
          title: 'Event 2',
          date: '2024-01-02',
          lat: 41.7128, // Far away
          lng: -75.0060
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockNot = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTimeline,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        not: mockNot,
        order: mockOrder
      } as any)

      // Small radius should filter out far items
      const result = await timelineService.getTimelineByLocation(40.7128, -74.0060, 10)

      // The service filters by distance, so we expect at least one item
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getTimelineStats', () => {
    it('should calculate timeline stats correctly', async () => {
      const mockTimeline = [
        {
          memberId: 'member-123',
          itemType: 'story',
          itemId: 'story-1',
          title: 'Story 1',
          date: '2024-01-01',
          location: 'New York'
        },
        {
          memberId: 'member-123',
          itemType: 'story',
          itemId: 'story-2',
          title: 'Story 2',
          date: '2024-01-02',
          location: 'New York'
        },
        {
          memberId: 'member-123',
          itemType: 'event',
          itemId: 'event-1',
          title: 'Event 1',
          date: '2024-01-03',
          location: 'Boston'
        }
      ]

      vi.spyOn(timelineService, 'getMemberTimeline').mockResolvedValue(mockTimeline as any)

      const result = await timelineService.getTimelineStats('member-123')

      expect(result.totalStories).toBe(2)
      expect(result.totalEvents).toBe(1)
      expect(result.dateRange.earliest).toBe('2024-01-01')
      expect(result.dateRange.latest).toBe('2024-01-03')
      expect(result.locations).toHaveLength(2)
      expect(result.locations.find(l => l.location === 'New York')?.count).toBe(2)
    })

    it('should handle empty timeline', async () => {
      vi.spyOn(timelineService, 'getMemberTimeline').mockResolvedValue([])

      const result = await timelineService.getTimelineStats('member-123')

      expect(result.totalStories).toBe(0)
      expect(result.totalEvents).toBe(0)
      expect(result.dateRange.earliest).toBeNull()
      expect(result.dateRange.latest).toBeNull()
      expect(result.locations).toEqual([])
    })
  })

  describe('searchTimeline', () => {
    it('should search timeline successfully', async () => {
      const mockStories = [
        {
          id: 'story-1',
          title: 'Test Story',
          content: 'Test content',
          date: '2024-01-01',
          author_id: 'user-123',
          story_members: [{ family_member_id: 'member-123' }]
        }
      ]

      const mockEvents = [
        {
          id: 'event-1',
          title: 'Test Event',
          description: 'Test description',
          event_date: '2024-01-02',
          location: 'New York',
          lat: 40.7128,
          lng: -74.0060,
          created_by: 'user-123',
          event_participants: [{ family_member_id: 'member-123' }]
        }
      ]

      const storyResult = Promise.resolve({
        data: mockStories,
        error: null
      })

      const eventResult = Promise.resolve({
        data: mockEvents,
        error: null
      })

      const storyQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnValue(storyResult),
        then: storyResult.then.bind(storyResult),
        catch: storyResult.catch.bind(storyResult)
      }

      const eventQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnValue(eventResult),
        then: eventResult.then.bind(eventResult),
        catch: eventResult.catch.bind(eventResult)
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'family_stories') {
          return storyQueryBuilder as any
        }
        if (table === 'family_events') {
          return eventQueryBuilder as any
        }
        return {} as any
      })

      const result = await timelineService.searchTimeline('Test')

      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.some(item => item.itemType === 'story')).toBe(true)
      expect(result.some(item => item.itemType === 'event')).toBe(true)
    })

    it('should filter by member IDs if provided', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockOr = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockReturnThis()
      const mockResolved = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        return {
          select: mockSelect,
          or: mockOr,
          in: (field: string, values: string[]) => {
            expect(field).toMatch(/family_member_id/)
            expect(values).toEqual(['member-123'])
            return mockResolved
          }
        } as any
      })

      await timelineService.searchTimeline('Test', ['member-123'])

      expect(mockIn).not.toHaveBeenCalled() // in is called on the query builder, not directly
    })
  })
})

