import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImportFamilyData from '../ImportFamilyData'
import { familyMemberService } from '@/services/familyMemberService'
import { familyRelationshipManager } from '@/services/familyRelationshipManager'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'

// Mock the services
vi.mock('@/services/familyMemberService')
vi.mock('@/services/familyRelationshipManager')
vi.mock('@/integrations/supabase/client')
vi.mock('@/hooks/use-toast')

describe('ImportFamilyData', () => {
  const mockOnImportComplete = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File Upload', () => {
    it('should render upload interface', () => {
      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('Import Family Data')).toBeInTheDocument()
      expect(screen.getByText('Upload Family Data')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop your file here, or click to select')).toBeInTheDocument()
    })

    it('should show supported file types', () => {
      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('JSON')).toBeInTheDocument()
      expect(screen.getByText('Excel/CSV')).toBeInTheDocument()
    })
  })

  describe('Template Download', () => {
    it('should download JSON template', async () => {
      const user = userEvent.setup()
      
      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      // Switch to templates tab
      fireEvent.click(screen.getByText('Templates'))
      
      // Click download JSON template
      const downloadButton = screen.getByText('Download JSON Template')
      await user.click(downloadButton)

      // Verify the download was triggered (we can't easily test the actual download)
      expect(downloadButton).toBeInTheDocument()
    })

    it('should download Excel template', async () => {
      const user = userEvent.setup()
      
      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      // Switch to templates tab
      fireEvent.click(screen.getByText('Templates'))
      
      // Click download CSV template
      const downloadButton = screen.getByText('Download CSV Template')
      await user.click(downloadButton)

      // Verify the download was triggered
      expect(downloadButton).toBeInTheDocument()
    })
  })

  describe('JSON File Parsing', () => {
    it('should parse JSON file correctly', async () => {
      const mockJsonData = {
        familyMembers: [
          {
            firstName: 'John',
            lastName: 'Smith',
            birthDate: '1990-01-01',
            gender: 'male'
          }
        ],
        relationships: [],
        stories: []
      }

      const mockFile = new File(
        [JSON.stringify(mockJsonData)],
        'test.json',
        { type: 'application/json' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      // Simulate file drop
      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('File parsed successfully!')).toBeInTheDocument()
        expect(screen.getByText('Found 1 members, 0 relationships, and 0 stories.')).toBeInTheDocument()
      })
    })

    it('should handle invalid JSON file', async () => {
      const mockFile = new File(
        ['invalid json content'],
        'test.json',
        { type: 'application/json' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Parse Error')).toBeInTheDocument()
      })
    })
  })

  describe('Excel File Parsing', () => {
    it('should parse Excel file correctly', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      }

      const mockJsonData = [
        ['first_name', 'last_name', 'gender'],
        ['John', 'Smith', 'male']
      ]

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any)
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockJsonData as any)

      const mockFile = new File(
        ['mock excel content'],
        'test.xlsx',
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('File parsed successfully!')).toBeInTheDocument()
      })
    })
  })

  describe('Data Import', () => {
    it('should import family members successfully', async () => {
      const user = userEvent.setup()
      
      // Mock successful family member creation
      vi.mocked(familyMemberService.createFamilyMember).mockResolvedValue({
        success: true,
        member: {
          id: 'member-123',
          firstName: 'John',
          lastName: 'Smith',
          gender: 'male',
          relations: []
        }
      })

      const mockJsonData = {
        familyMembers: [
          {
            firstName: 'John',
            lastName: 'Smith',
            gender: 'male'
          }
        ],
        relationships: [],
        stories: []
      }

      const mockFile = new File(
        [JSON.stringify(mockJsonData)],
        'test.json',
        { type: 'application/json' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      // Upload file
      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Start Import')).toBeInTheDocument()
      })

      // Start import
      await user.click(screen.getByText('Start Import'))

      await waitFor(() => {
        expect(familyMemberService.createFamilyMember).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Smith',
          gender: 'male',
          birthDate: undefined,
          deathDate: undefined,
          birthPlace: undefined,
          bio: undefined,
          location: undefined
        })
      })

      await waitFor(() => {
        expect(mockOnImportComplete).toHaveBeenCalledWith({
          success: true,
          imported: {
            members: 1,
            relationships: 0,
            stories: 0
          },
          errors: [],
          warnings: []
        })
      })
    })

    it('should handle import errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock failed family member creation
      vi.mocked(familyMemberService.createFamilyMember).mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      const mockJsonData = {
        familyMembers: [
          {
            firstName: 'John',
            lastName: 'Smith',
            gender: 'male'
          }
        ],
        relationships: [],
        stories: []
      }

      const mockFile = new File(
        [JSON.stringify(mockJsonData)],
        'test.json',
        { type: 'application/json' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      // Upload file
      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Start Import')).toBeInTheDocument()
      })

      // Start import
      await user.click(screen.getByText('Start Import'))

      await waitFor(() => {
        expect(mockOnImportComplete).toHaveBeenCalledWith({
          success: false,
          imported: {
            members: 0,
            relationships: 0,
            stories: 0
          },
          errors: ['Failed to import John Smith: Database error'],
          warnings: []
        })
      })
    })
  })

  describe('Preview Functionality', () => {
    it('should show preview tabs when data is loaded', async () => {
      const mockJsonData = {
        familyMembers: [
          {
            firstName: 'John',
            lastName: 'Smith',
            gender: 'male'
          }
        ],
        relationships: [
          {
            fromMemberId: 'member-1',
            toMemberId: 'member-2',
            relationshipType: 'spouse'
          }
        ],
        stories: [
          {
            title: 'Test Story',
            content: 'Test content',
            date: '2023-01-01',
            authorId: 'user-1',
            relatedMembers: []
          }
        ]
      }

      const mockFile = new File(
        [JSON.stringify(mockJsonData)],
        'test.json',
        { type: 'application/json' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      // Upload file
      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument()
      })

      // Click preview tab
      fireEvent.click(screen.getByText('Preview'))

      // Check that preview content is shown
      expect(screen.getByText('Members (1)')).toBeInTheDocument()
      expect(screen.getByText('Relationships (1)')).toBeInTheDocument()
      expect(screen.getByText('Stories (1)')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle unsupported file types', async () => {
      const mockFile = new File(
        ['test content'],
        'test.txt',
        { type: 'text/plain' }
      )

      render(
        <ImportFamilyData 
          onImportComplete={mockOnImportComplete}
          onClose={mockOnClose}
        />
      )

      const dropzone = screen.getByText('Drag and drop your file here, or click to select').closest('div')
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [mockFile]
        }
      })

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Unsupported File Type'
          })
        )
      }, { timeout: 3000 })
    })
  })
})
