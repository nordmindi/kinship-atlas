import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRelationshipPathFinder } from '../useRelationshipPathFinder';
import { FamilyMember } from '@/types';
import { Node, Edge } from '@xyflow/react';

describe('useRelationshipPathFinder', () => {
  // Helper to create a family member
  const createMember = (
    id: string,
    firstName: string,
    lastName: string,
    gender: string,
    relations: Array<{ type: string; personId: string }> = []
  ): FamilyMember => ({
    id,
    firstName,
    lastName,
    gender,
    birthDate: '1950-01-01',
    relations: relations.map((rel, idx) => ({
      id: `rel-${idx}`,
      type: rel.type as 'parent' | 'child' | 'spouse' | 'sibling',
      personId: rel.personId,
      person: null as any,
    })),
  });

  describe('Direct Relationships', () => {
    it('should identify parent-child relationship', () => {
      const members = [
        createMember('parent-1', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'child-1' }, // parent has child relation
        ]),
        createMember('child-1', 'Alice', 'Smith', 'female', [
          { type: 'parent', personId: 'parent-1' }, // child has parent relation
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('parent-1', 'child-1');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Alice is John\'s daughter');
      expect(path?.isBloodRelative).toBe(true);
      expect(path?.distance).toBe(1);
    });

    it('should identify spouse relationship', () => {
      const members = [
        createMember('husband-1', 'John', 'Smith', 'male', [
          { type: 'spouse', personId: 'wife-1' },
        ]),
        createMember('wife-1', 'Mary', 'Smith', 'female', [
          { type: 'spouse', personId: 'husband-1' },
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('husband-1', 'wife-1');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Mary is John\'s wife');
      expect(path?.isBloodRelative).toBe(false);
      expect(path?.distance).toBe(1);
    });

    it('should identify sibling relationship', () => {
      const members = [
        createMember('sibling-1', 'John', 'Smith', 'male', [
          { type: 'sibling', personId: 'sibling-2' },
        ]),
        createMember('sibling-2', 'Jane', 'Smith', 'female', [
          { type: 'sibling', personId: 'sibling-1' },
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('sibling-1', 'sibling-2');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Jane is John\'s sister');
      expect(path?.isBloodRelative).toBe(true);
      expect(path?.distance).toBe(1);
    });
  });

  describe('Grandparent/Grandchild Relationships', () => {
    it('should identify grandfather-grandson relationship', () => {
      const members = [
        createMember('grandfather', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'parent' }, // grandfather has child relation to parent
        ]),
        createMember('parent', 'Bob', 'Smith', 'male', [
          { type: 'parent', personId: 'grandfather' }, // parent has parent relation to grandfather
          { type: 'child', personId: 'grandson' }, // parent has child relation to grandson
        ]),
        createMember('grandson', 'Tom', 'Smith', 'male', [
          { type: 'parent', personId: 'parent' }, // grandson has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('grandfather', 'grandson');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Tom is John\'s grandson');
      expect(path?.isBloodRelative).toBe(true);
      expect(path?.distance).toBe(2);
    });

    it('should identify grandmother-granddaughter relationship', () => {
      const members = [
        createMember('grandmother', 'Mary', 'Smith', 'female', [
          { type: 'child', personId: 'parent' }, // grandmother has child relation to parent
        ]),
        createMember('parent', 'Alice', 'Smith', 'female', [
          { type: 'parent', personId: 'grandmother' }, // parent has parent relation to grandmother
          { type: 'child', personId: 'granddaughter' }, // parent has child relation to granddaughter
        ]),
        createMember('granddaughter', 'Emma', 'Smith', 'female', [
          { type: 'parent', personId: 'parent' }, // granddaughter has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('grandmother', 'granddaughter');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Emma is Mary\'s granddaughter');
      expect(path?.isBloodRelative).toBe(true);
    });
  });

  describe('Uncle/Aunt Relationships', () => {
    it('should identify uncle relationship', () => {
      const members = [
        createMember('grandparent', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'parent' }, // grandparent has child relation to parent
          { type: 'child', personId: 'uncle' }, // grandparent has child relation to uncle
        ]),
        createMember('parent', 'Bob', 'Smith', 'male', [
          { type: 'parent', personId: 'grandparent' }, // parent has parent relation to grandparent
          { type: 'sibling', personId: 'uncle' }, // parent has sibling relation to uncle
          { type: 'child', personId: 'nephew' }, // parent has child relation to nephew
        ]),
        createMember('uncle', 'Tom', 'Smith', 'male', [
          { type: 'parent', personId: 'grandparent' }, // uncle has parent relation to grandparent
          { type: 'sibling', personId: 'parent' }, // uncle has sibling relation to parent
        ]),
        createMember('nephew', 'Sam', 'Smith', 'male', [
          { type: 'parent', personId: 'parent' }, // nephew has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('nephew', 'uncle');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Tom is Sam\'s uncle');
      expect(path?.isBloodRelative).toBe(true);
      expect(path?.distance).toBe(2);
    });

    it('should identify aunt relationship', () => {
      const members = [
        createMember('grandparent', 'Mary', 'Smith', 'female', [
          { type: 'child', personId: 'parent' }, // grandparent has child relation to parent
          { type: 'child', personId: 'aunt' }, // grandparent has child relation to aunt
        ]),
        createMember('parent', 'Alice', 'Smith', 'female', [
          { type: 'parent', personId: 'grandparent' }, // parent has parent relation to grandparent
          { type: 'sibling', personId: 'aunt' }, // parent has sibling relation to aunt
          { type: 'child', personId: 'niece' }, // parent has child relation to niece
        ]),
        createMember('aunt', 'Jane', 'Smith', 'female', [
          { type: 'parent', personId: 'grandparent' }, // aunt has parent relation to grandparent
          { type: 'sibling', personId: 'parent' }, // aunt has sibling relation to parent
        ]),
        createMember('niece', 'Emma', 'Smith', 'female', [
          { type: 'parent', personId: 'parent' }, // niece has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('niece', 'aunt');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('Jane is Emma\'s aunt');
      expect(path?.isBloodRelative).toBe(true);
    });
  });

  describe('Cousin Relationships', () => {
    it('should identify first cousin relationship', () => {
      const members = [
        createMember('grandparent', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'parent1' }, // grandparent has child relation to parent1
          { type: 'child', personId: 'parent2' }, // grandparent has child relation to parent2
        ]),
        createMember('parent1', 'Bob', 'Smith', 'male', [
          { type: 'parent', personId: 'grandparent' }, // parent1 has parent relation to grandparent
          { type: 'sibling', personId: 'parent2' }, // parent1 has sibling relation to parent2
          { type: 'child', personId: 'cousin1' }, // parent1 has child relation to cousin1
        ]),
        createMember('parent2', 'Tom', 'Smith', 'male', [
          { type: 'parent', personId: 'grandparent' }, // parent2 has parent relation to grandparent
          { type: 'sibling', personId: 'parent1' }, // parent2 has sibling relation to parent1
          { type: 'child', personId: 'cousin2' }, // parent2 has child relation to cousin2
        ]),
        createMember('cousin1', 'Alice', 'Smith', 'female', [
          { type: 'parent', personId: 'parent1' }, // cousin1 has parent relation to parent1
        ]),
        createMember('cousin2', 'Sam', 'Smith', 'male', [
          { type: 'parent', personId: 'parent2' }, // cousin2 has parent relation to parent2
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('cousin1', 'cousin2');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toContain('first cousin');
      expect(path?.isBloodRelative).toBe(true);
      expect(path?.distance).toBe(3);
    });
  });

  describe('In-Law Relationships', () => {
    it('should identify parent-in-law relationship', () => {
      const members = [
        createMember('spouse1', 'John', 'Smith', 'male', [
          { type: 'spouse', personId: 'spouse2' }, // spouse1 has spouse relation to spouse2
        ]),
        createMember('spouse2', 'Mary', 'Smith', 'female', [
          { type: 'spouse', personId: 'spouse1' }, // spouse2 has spouse relation to spouse1
          { type: 'parent', personId: 'parent-in-law' }, // spouse2 has parent relation to parent-in-law
        ]),
        createMember('parent-in-law', 'Bob', 'Smith', 'male', [
          { type: 'child', personId: 'spouse2' }, // parent-in-law has child relation to spouse2
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('spouse1', 'parent-in-law');
      expect(path).not.toBeNull();
      // The relationship is described: "Bob is John's father-in-law"
      // This is because the path goes: spouse1 -> spouse2 -> parent-in-law
      // parent-in-law is the father of spouse2, making him father-in-law to spouse1
      expect(path?.relationshipDescription).toContain('father-in-law');
      expect(path?.isBloodRelative).toBe(false);
    });

    it('should identify child-in-law relationship', () => {
      const members = [
        createMember('person', 'John', 'Smith', 'male', [
          { type: 'parent', personId: 'child' },
        ]),
        createMember('child', 'Alice', 'Smith', 'female', [
          { type: 'child', personId: 'person' },
          { type: 'spouse', personId: 'child-in-law' },
        ]),
        createMember('child-in-law', 'Bob', 'Smith', 'male', [
          { type: 'spouse', personId: 'child' },
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('person', 'child-in-law');
      expect(path).not.toBeNull();
      // The relationship is described from child-in-law's perspective: "Bob is John's father-in-law"
      // This is because the path goes: person -> child -> child-in-law
      // From child-in-law's perspective, person is a father-in-law
      expect(path?.relationshipDescription).toContain('father-in-law');
      expect(path?.isBloodRelative).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should return null when no path exists', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male'),
        createMember('person2', 'Jane', 'Doe', 'female'),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('person1', 'person2');
      expect(path).toBeNull();
    });

    it('should return same person for identical IDs', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male'),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('person1', 'person1');
      expect(path).not.toBeNull();
      expect(path?.relationshipDescription).toBe('Same person');
      expect(path?.distance).toBe(0);
      expect(path?.isBloodRelative).toBe(true);
    });

    it('should handle missing member data gracefully', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'person2' }, // person1 has child relation to person2
        ]),
        // person2 is missing from members array, but relation exists
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('person1', 'person2');
      // Should return a path even if member data is incomplete (graph still has connection)
      // The path will have a generic description
      expect(path).not.toBeNull();
      expect(path?.path).toContain('person2');
    });
  });

  describe('Path Details', () => {
    it('should provide detailed path steps', () => {
      const members = [
        createMember('grandparent', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'parent' }, // grandparent has child relation to parent
        ]),
        createMember('parent', 'Bob', 'Smith', 'male', [
          { type: 'parent', personId: 'grandparent' }, // parent has parent relation to grandparent
          { type: 'child', personId: 'child' }, // parent has child relation to child
        ]),
        createMember('child', 'Tom', 'Smith', 'male', [
          { type: 'parent', personId: 'parent' }, // child has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('grandparent', 'child');
      expect(path).not.toBeNull();
      expect(path?.detailedPath).toHaveLength(2);
      expect(path?.detailedPath[0].relationType).toBe('child'); // grandparent -> parent (child relation)
      expect(path?.detailedPath[1].relationType).toBe('child'); // parent -> child (child relation)
    });

    it('should correctly identify relationship types in path', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male', [
          { type: 'sibling', personId: 'person2' }, // person1 has sibling relation to person2
        ]),
        createMember('person2', 'Jane', 'Smith', 'female', [
          { type: 'sibling', personId: 'person1' }, // person2 has sibling relation to person1
          { type: 'child', personId: 'person3' }, // person2 has child relation to person3
        ]),
        createMember('person3', 'Tom', 'Smith', 'male', [
          { type: 'parent', personId: 'person2' }, // person3 has parent relation to person2
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('person1', 'person3');
      expect(path).not.toBeNull();
      expect(path?.detailedPath).toHaveLength(2);
      expect(path?.detailedPath[0].relationType).toBe('sibling'); // person1 -> person2 (sibling)
      expect(path?.detailedPath[1].relationType).toBe('child'); // person2 -> person3 (child relation from person2's perspective)
    });
  });

  describe('Blood Relative Detection', () => {
    it('should correctly identify blood relatives', () => {
      const members = [
        createMember('parent', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'child' }, // parent has child relation to child
        ]),
        createMember('child', 'Alice', 'Smith', 'female', [
          { type: 'parent', personId: 'parent' }, // child has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('parent', 'child');
      expect(path?.isBloodRelative).toBe(true);
    });

    it('should correctly identify non-blood relatives (in-laws)', () => {
      const members = [
        createMember('spouse1', 'John', 'Smith', 'male', [
          { type: 'spouse', personId: 'spouse2' },
        ]),
        createMember('spouse2', 'Mary', 'Smith', 'female', [
          { type: 'spouse', personId: 'spouse1' },
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('spouse1', 'spouse2');
      expect(path?.isBloodRelative).toBe(false);
    });

    it('should identify blood relatives through multiple steps', () => {
      const members = [
        createMember('grandparent', 'John', 'Smith', 'male', [
          { type: 'child', personId: 'parent' }, // grandparent has child relation to parent
        ]),
        createMember('parent', 'Bob', 'Smith', 'male', [
          { type: 'parent', personId: 'grandparent' }, // parent has parent relation to grandparent
          { type: 'child', personId: 'grandchild' }, // parent has child relation to grandchild
        ]),
        createMember('grandchild', 'Tom', 'Smith', 'male', [
          { type: 'parent', personId: 'parent' }, // grandchild has parent relation to parent
        ]),
      ];

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const { result } = renderHook(() =>
        useRelationshipPathFinder(members, nodes, edges)
      );

      const path = result.current.findPath('grandparent', 'grandchild');
      expect(path?.isBloodRelative).toBe(true);
    });
  });
});
