import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadMedia, getUserMedia, deleteMedia, updateMediaCaption } from '../mediaService'
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
    storage: {
      from: vi.fn()
    },
    from: vi.fn()
  }
}))

describe('MediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadMedia', () => {
    it('should upload media successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'user-123/image/123-test.jpg' },
        error: null
      })

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/media/test.jpg' }
      })

      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'media-123',
          url: 'https://example.com/media/test.jpg',
          caption: 'Test caption',
          media_type: 'image',
          created_at: '2024-01-01T00:00:00Z',
          user_id: 'user-123'
        },
        error: null
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle
      } as any)

      const result = await uploadMedia({
        file: mockFile,
        caption: 'Test caption',
        mediaType: 'image'
      })

      expect(result).toBeTruthy()
      expect(result?.id).toBe('media-123')
      expect(mockUpload).toHaveBeenCalled()
    })

    it('should return null if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = await uploadMedia({
        file: mockFile,
        mediaType: 'image'
      })

      expect(result).toBeNull()
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Authentication required'
        })
      )
    })

    it('should handle upload errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload
      } as any)

      const result = await uploadMedia({
        file: mockFile,
        mediaType: 'image'
      })

      expect(result).toBeNull()
    })
  })

  describe('getUserMedia', () => {
    it('should fetch media successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockMedia = [
        {
          id: 'media-1',
          url: 'https://example.com/media/1.jpg',
          caption: 'Test 1',
          media_type: 'image',
          created_at: '2024-01-01T00:00:00Z',
          user_id: 'user-123',
          file_size: 1000,
          file_name: 'test1.jpg'
        },
        {
          id: 'media-2',
          url: 'https://example.com/media/2.jpg',
          caption: 'Test 2',
          media_type: 'image',
          created_at: '2024-01-02T00:00:00Z',
          user_id: 'user-123',
          file_size: 2000,
          file_name: 'test2.jpg'
        }
      ]

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMedia,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      } as any)

      const result = await getUserMedia()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('media-1')
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await getUserMedia()

      expect(result).toEqual([])
      expect(toast).toHaveBeenCalled()
    })
  })

  describe('deleteMedia', () => {
    it('should delete media successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'media-123',
          url: 'https://example.com/media/test.jpg'
        },
        error: null
      })

      const mockDelete = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        delete: mockDelete
      } as any)

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove
      } as any)

      const result = await deleteMedia('media-123')

      expect(result).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
    })

    it('should return false if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const result = await deleteMedia('media-123')

      expect(result).toBe(false)
    })
  })

  describe('updateMediaCaption', () => {
    it('should update caption successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: { id: 'media-123', caption: 'New caption' },
        error: null
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      } as any)

      const result = await updateMediaCaption('media-123', 'New caption')

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({ caption: 'New caption' })
    })

    it('should return false on error', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      } as any)

      const result = await updateMediaCaption('media-123', 'New caption')

      expect(result).toBe(false)
    })
  })
})

