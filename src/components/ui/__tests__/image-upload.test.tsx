import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImageUpload from '../image-upload'
import { uploadFile } from '@/services/supabaseService'
import { toast } from '@/hooks/use-toast'

vi.mock('@/services/supabaseService')
vi.mock('@/hooks/use-toast')

describe('ImageUpload', () => {
  const mockOnImageUploaded = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('should render upload button when no image', () => {
    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should display current image if provided', () => {
    const imageUrl = 'https://example.com/image.jpg'
    render(<ImageUpload currentImage={imageUrl} onImageUploaded={mockOnImageUploaded} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', imageUrl)
  })

  it('should handle file selection', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const mockUrl = 'https://example.com/uploaded.jpg'

    vi.mocked(uploadFile).mockResolvedValue(mockUrl)

    const { container } = render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    // File input is hidden, find it in the container
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledWith(mockFile, 'images')
    }, { timeout: 3000 })
  })

  it('should reject non-image files', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    const { container } = render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)
    
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid file type'
        })
      )
    }, { timeout: 3000 })

    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('should reject files larger than 5MB', async () => {
    const user = userEvent.setup()
    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    const { container } = render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)
    
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    
    await user.upload(fileInput, largeFile)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'File too large'
        })
      )
    }, { timeout: 3000 })

    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('should show loading state during upload', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const mockUrl = 'https://example.com/uploaded.jpg'

    // Create a promise that we can control
    let resolveUpload: (value: string) => void
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve
    })

    vi.mocked(uploadFile).mockReturnValue(uploadPromise)

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    const { container } = render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)
    
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    
    await user.upload(fileInput, mockFile)

    // Should show loading state
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
    }, { timeout: 3000 })

    // Resolve the upload
    resolveUpload!(mockUrl)

    await waitFor(() => {
      expect(mockOnImageUploaded).toHaveBeenCalledWith(mockUrl)
    }, { timeout: 3000 })
  })

  it('should handle upload errors', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    vi.mocked(uploadFile).mockRejectedValue(new Error('Upload failed'))

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    const { container } = render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)
    
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive'
        })
      )
    }, { timeout: 3000 })

    expect(mockOnImageUploaded).not.toHaveBeenCalled()
  })

  it('should call onImageUploaded with uploaded URL', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const mockUrl = 'https://example.com/uploaded.jpg'

    vi.mocked(uploadFile).mockResolvedValue(mockUrl)

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)

    const { container } = render(<ImageUpload onImageUploaded={mockOnImageUploaded} />)
    
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    
    await user.upload(fileInput, mockFile)

    await waitFor(() => {
      expect(mockOnImageUploaded).toHaveBeenCalledWith(mockUrl)
    }, { timeout: 3000 })
  })

  it('should support different sizes', () => {
    const { container, rerender } = render(
      <ImageUpload onImageUploaded={mockOnImageUploaded} size="sm" />
    )

    // The size classes are on the circular image container div (the one with onClick)
    // Find the div that contains both the size classes
    const imageContainer = Array.from(container.querySelectorAll('div')).find(div => 
      div.className.includes('h-16') && div.className.includes('w-16')
    )
    expect(imageContainer).toBeInTheDocument()
    expect(imageContainer).toHaveClass('h-16', 'w-16')

    rerender(<ImageUpload onImageUploaded={mockOnImageUploaded} size="lg" />)
    const largeContainer = Array.from(container.querySelectorAll('div')).find(div => 
      div.className.includes('h-48') && div.className.includes('w-48')
    )
    expect(largeContainer).toBeInTheDocument()
    expect(largeContainer).toHaveClass('h-48', 'w-48')
  })
})

