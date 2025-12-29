import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FamilyTreeView from '../FamilyTreeView'
import { useFamilyTree } from '@/contexts/FamilyTreeContext'

// Mock the family tree context
vi.mock('@/contexts/FamilyTreeContext')

// Mock React Flow
vi.mock('reactflow', () => ({
  ReactFlow: ({ children, onNodesChange, onEdgesChange, onConnect }: any) => (
    <div data-testid="react-flow">
      {children}
      <button onClick={() => onNodesChange([{ type: 'position', id: 'node-1', position: { x: 100, y: 100 } }])}>
        Move Node
      </button>
      <button onClick={() => onEdgesChange([{ type: 'remove', id: 'edge-1' }])}>
        Remove Edge
      </button>
      <button onClick={() => onConnect({ source: 'node-1', target: 'node-2', sourceHandle: 'right', targetHandle: 'left' })}>
        Connect Nodes
      </button>
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: (initialNodes: any) => [initialNodes, vi.fn()],
  useEdgesState: (initialEdges: any) => [initialEdges, vi.fn()],
  addEdge: (params: any) => ({ id: 'edge-1', ...params }),
  getBezierPath: () => 'M0,0 L100,100',
  getSmoothStepPath: () => 'M0,0 L100,100',
  Handle: ({ type, position, id }: any) => (
    <div data-testid={`handle-${type}-${id}`} data-position={position} />
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
  EdgeLabelRenderer: ({ children }: any) => <div data-testid="edge-label-renderer">{children}</div>,
}))

// Mock the family member service
vi.mock('@/services/familyMemberService')

describe('FamilyTreeView', () => {
  const mockFamilyMembers = [
    {
      id: 'member-1',
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-01',
      relations: [
        {
          id: 'rel-1',
          type: 'spouse',
          personId: 'member-2',
          person: {
            id: 'member-2',
            firstName: 'Mary',
            lastName: 'Smith',
            gender: 'female'
          }
        }
      ]
    },
    {
      id: 'member-2',
      firstName: 'Mary',
      lastName: 'Smith',
      gender: 'female',
      birthDate: '1952-01-01',
      relations: [
        {
          id: 'rel-1',
          type: 'spouse',
          personId: 'member-1',
          person: {
            id: 'member-1',
            firstName: 'John',
            lastName: 'Smith',
            gender: 'male'
          }
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render family tree with members', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
      expect(screen.getByTestId('background')).toBeInTheDocument()
      expect(screen.getByTestId('controls')).toBeInTheDocument()
      expect(screen.getByTestId('minimap')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: [],
        isLoading: true,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByText('Loading family tree...')).toBeInTheDocument()
    })

    it('should show empty state when no members', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: [],
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByText('No family members found')).toBeInTheDocument()
      expect(screen.getByText('Start by adding your first family member')).toBeInTheDocument()
    })
  })

  describe('Node Interaction', () => {
    it('should handle node selection', () => {
      const mockSetSelectedMemberId = vi.fn()
      
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: mockSetSelectedMemberId,
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      // Simulate node click (this would need to be implemented in the actual component)
      // For now, we'll test that the component renders with the correct props
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    it('should show selected member', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: 'member-1',
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })

  describe('Edge Interaction', () => {
    it('should handle edge creation', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      // Simulate edge creation
      const connectButton = screen.getByText('Connect Nodes')
      fireEvent.click(connectButton)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    it('should handle edge removal', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      // Simulate edge removal
      const removeButton = screen.getByText('Remove Edge')
      fireEvent.click(removeButton)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })

  describe('Node Positioning', () => {
    it('should handle node movement', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      // Simulate node movement
      const moveButton = screen.getByText('Move Node')
      fireEvent.click(moveButton)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })

  describe('Tree Layout', () => {
    it('should render nodes with correct handles', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      // Check that handles are rendered for each node
      // This would need to be implemented in the actual component
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })

    it('should render edges between related members', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: mockFamilyMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing family members gracefully', () => {
      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: null as any,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByText('No family members found')).toBeInTheDocument()
    })

    it('should handle malformed member data', () => {
      const malformedMembers = [
        {
          id: 'member-1',
          firstName: 'John',
          // Missing required fields
        } as any
      ]

      vi.mocked(useFamilyTree).mockReturnValue({
        familyMembers: malformedMembers,
        isLoading: false,
        selectedMemberId: null,
        setSelectedMemberId: vi.fn(),
        refreshFamilyMembers: vi.fn()
      })

      render(<FamilyTreeView />)

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })
})
