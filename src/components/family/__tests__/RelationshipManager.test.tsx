import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RelationshipManager from '../RelationshipManager'
import { FamilyMember } from '@/types'
import { familyRelationshipManager } from '@/services/familyRelationshipManager'
import { toast } from 'sonner'

// Mock the services
vi.mock('@/services/familyRelationshipManager')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

describe('RelationshipManager', () => {
  const mockCurrentMember: FamilyMember = {
    id: 'current-member-1',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2010-01-01',
    gender: 'male',
    relations: []
  }

  const mockSibling: FamilyMember = {
    id: 'sibling-1',
    firstName: 'Jane',
    lastName: 'Doe',
    birthDate: '2012-01-01',
    gender: 'female',
    relations: []
  }

  const mockParent: FamilyMember = {
    id: 'parent-1',
    firstName: 'Bob',
    lastName: 'Doe',
    birthDate: '1980-01-01',
    gender: 'male',
    relations: []
  }

  const mockOnRelationshipChanged = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(familyRelationshipManager.getRelationshipSuggestions).mockResolvedValue([])
  })

  describe('Sibling Type Display', () => {
    it('should display sibling type badge for full siblings', () => {
      const memberWithFullSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'full'
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithFullSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      expect(screen.getByText('Full')).toBeInTheDocument()
    })

    it('should display sibling type badge for half siblings', () => {
      const memberWithHalfSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'half'
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithHalfSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      expect(screen.getByText('Half')).toBeInTheDocument()
    })

    it('should display Unknown badge when sibling type is not set', () => {
      const memberWithUnknownSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id
            // siblingType is undefined
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithUnknownSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should show edit button for sibling relationships', () => {
      const memberWithSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'full'
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      // Find edit button (pencil icon)
      const editButtons = screen.getAllByTitle('Edit sibling type')
      expect(editButtons.length).toBeGreaterThan(0)
    })

    it('should not show edit button for non-sibling relationships', () => {
      const memberWithParent: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'parent',
            personId: mockParent.id
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithParent}
          allMembers={[mockParent]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      const editButtons = screen.queryAllByTitle('Edit sibling type')
      expect(editButtons.length).toBe(0)
    })
  })

  describe('Edit Sibling Type', () => {
    it('should open edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup()
      const memberWithSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'full'
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      const editButton = screen.getByTitle('Edit sibling type')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Sibling Type')).toBeInTheDocument()
      })
    })

    it('should show edit dialog with current sibling type', async () => {
      const user = userEvent.setup()
      const memberWithSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'half'
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      const editButton = screen.getByTitle('Edit sibling type')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Sibling Type')).toBeInTheDocument()
        expect(screen.getByText(/Full siblings share both parents/i)).toBeInTheDocument()
      })
    })

    it('should handle update errors gracefully', async () => {
      const user = userEvent.setup()
      const memberWithSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'full'
          }
        ]
      }

      vi.mocked(familyRelationshipManager.updateRelationship).mockResolvedValue({
        success: false,
        error: 'Failed to update relationship'
      })

      render(
        <RelationshipManager
          currentMember={memberWithSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      const editButton = screen.getByTitle('Edit sibling type')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Sibling Type')).toBeInTheDocument()
      })

      const updateButton = screen.getByText('Update')
      await user.click(updateButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to update relationship',
          expect.objectContaining({
            description: 'Failed to update relationship'
          })
        )
      })
    })

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      const memberWithSibling: FamilyMember = {
        ...mockCurrentMember,
        relations: [
          {
            id: 'rel-1',
            type: 'sibling',
            personId: mockSibling.id,
            siblingType: 'full'
          }
        ]
      }

      render(
        <RelationshipManager
          currentMember={memberWithSibling}
          allMembers={[mockSibling]}
          onRelationshipChanged={mockOnRelationshipChanged}
        />
      )

      const editButton = screen.getByTitle('Edit sibling type')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByText('Edit Sibling Type')).toBeInTheDocument()
      })

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit Sibling Type')).not.toBeInTheDocument()
      })
    })
  })
})
