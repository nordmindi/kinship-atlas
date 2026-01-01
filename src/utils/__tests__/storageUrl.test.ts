import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractFilePathFromUrl,
  getAccessibleStorageUrl
} from '../storageUrl'
import { supabase } from '@/integrations/supabase/client'

describe('storageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractFilePathFromUrl', () => {
    it('should extract file path from public URL', () => {
      const url = 'https://example.com/storage/v1/object/public/family-media/user-123/image/test.jpg'
      const result = extractFilePathFromUrl(url)

      expect(result).toBe('user-123/image/test.jpg')
    })

    it('should extract file path from signed URL', () => {
      const url = 'https://example.com/storage/v1/object/sign/family-media/user-123/image/test.jpg?token=abc123'
      const result = extractFilePathFromUrl(url)

      expect(result).toBe('user-123/image/test.jpg')
    })

    it('should handle URL-encoded paths', () => {
      const url = 'https://example.com/storage/v1/object/public/family-media/user-123/image/test%20file.jpg'
      const result = extractFilePathFromUrl(url)

      expect(result).toBe('user-123/image/test file.jpg')
    })

    it('should return null for invalid URL', () => {
      const url = 'not-a-valid-url'
      const result = extractFilePathFromUrl(url)

      expect(result).toBeNull()
    })

    it('should return null for URL without storage path', () => {
      const url = 'https://example.com/some-other-path/file.jpg'
      const result = extractFilePathFromUrl(url)

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = extractFilePathFromUrl('')

      expect(result).toBeNull()
    })
  })

  describe('getAccessibleStorageUrl', () => {
    it('should return signed URL if already signed', async () => {
      const url = 'https://example.com/storage/v1/object/sign/family-media/test.jpg?token=abc123'
      const result = await getAccessibleStorageUrl(url)

      expect(result).toBe(url)
    })

    it('should convert public URL to signed URL', async () => {
      const publicUrl = 'https://example.com/storage/v1/object/public/family-media/test.jpg'
      const signedUrl = 'https://example.com/storage/v1/object/sign/family-media/test.jpg?token=new-token'

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl },
          error: null
        })
      } as any)

      const result = await getAccessibleStorageUrl(publicUrl)

      expect(result).toBe(signedUrl)
      expect(supabase.storage.from).toHaveBeenCalledWith('family-media')
    })

    it('should return original URL if signed URL generation fails', async () => {
      const publicUrl = 'https://example.com/storage/v1/object/public/family-media/test.jpg'

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to create signed URL' }
        })
      } as any)

      const result = await getAccessibleStorageUrl(publicUrl)

      expect(result).toBe(publicUrl) // Falls back to original
      expect(supabase.storage.from).toHaveBeenCalledWith('family-media')
    })

    it('should return original URL if path extraction fails', async () => {
      const invalidUrl = 'https://example.com/invalid-path'

      const result = await getAccessibleStorageUrl(invalidUrl)

      expect(result).toBe(invalidUrl)
    })

    it('should return null for null input', async () => {
      const result = await getAccessibleStorageUrl(null)

      expect(result).toBeNull()
    })

    it('should return null for undefined input', async () => {
      const result = await getAccessibleStorageUrl(undefined)

      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      const publicUrl = 'https://example.com/storage/v1/object/public/family-media/test.jpg'

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: vi.fn().mockRejectedValue(new Error('Network error'))
      } as any)

      const result = await getAccessibleStorageUrl(publicUrl)

      expect(result).toBe(publicUrl) // Falls back to original on error
      expect(supabase.storage.from).toHaveBeenCalledWith('family-media')
    })
  })
})

