import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStorageUrl } from '../useStorageUrl'
import { getAccessibleStorageUrl } from '@/utils/storageUrl'

vi.mock('@/utils/storageUrl')

describe('useStorageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null for null URL', () => {
    const { result } = renderHook(() => useStorageUrl(null))

    expect(result.current).toBeNull()
    expect(getAccessibleStorageUrl).not.toHaveBeenCalled()
  })

  it('should return null for undefined URL', () => {
    const { result } = renderHook(() => useStorageUrl(undefined))

    expect(result.current).toBeNull()
    expect(getAccessibleStorageUrl).not.toHaveBeenCalled()
  })

  it('should return signed URL directly if already signed', () => {
    const signedUrl = 'https://example.com/storage/v1/object/sign/family-media/test.jpg?token=abc123'
    const { result } = renderHook(() => useStorageUrl(signedUrl))

    expect(result.current).toBe(signedUrl)
    expect(getAccessibleStorageUrl).not.toHaveBeenCalled()
  })

  it('should convert public URL to signed URL', async () => {
    const publicUrl = 'https://example.com/storage/v1/object/public/family-media/test.jpg'
    const signedUrl = 'https://example.com/storage/v1/object/sign/family-media/test.jpg?token=new-token'

    vi.mocked(getAccessibleStorageUrl).mockResolvedValue(signedUrl)

    const { result } = renderHook(() => useStorageUrl(publicUrl))

    await waitFor(() => {
      expect(result.current).toBe(signedUrl)
    })

    expect(getAccessibleStorageUrl).toHaveBeenCalledWith(publicUrl)
  })

  it('should handle conversion errors gracefully', async () => {
    const publicUrl = 'https://example.com/storage/v1/object/public/family-media/test.jpg'

    vi.mocked(getAccessibleStorageUrl).mockRejectedValue(new Error('Conversion failed'))

    const { result } = renderHook(() => useStorageUrl(publicUrl))

    await waitFor(() => {
      expect(result.current).toBe(publicUrl) // Falls back to original
    })
  })

  it('should update when URL changes', async () => {
    const url1 = 'https://example.com/storage/v1/object/public/family-media/test1.jpg'
    const url2 = 'https://example.com/storage/v1/object/public/family-media/test2.jpg'
    const signedUrl1 = 'https://example.com/storage/v1/object/sign/family-media/test1.jpg?token=token1'
    const signedUrl2 = 'https://example.com/storage/v1/object/sign/family-media/test2.jpg?token=token2'

    vi.mocked(getAccessibleStorageUrl)
      .mockResolvedValueOnce(signedUrl1)
      .mockResolvedValueOnce(signedUrl2)

    const { result, rerender } = renderHook(
      ({ url }) => useStorageUrl(url),
      { initialProps: { url: url1 } }
    )

    await waitFor(() => {
      expect(result.current).toBe(signedUrl1)
    })

    rerender({ url: url2 })

    await waitFor(() => {
      expect(result.current).toBe(signedUrl2)
    })

    expect(getAccessibleStorageUrl).toHaveBeenCalledTimes(2)
  })
})

