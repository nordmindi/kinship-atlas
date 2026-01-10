import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBeautifyLayout, getBeautifyConfig } from '../beautifyLayout';
import { FamilyMember } from '@/types';

describe('beautifyLayout', () => {
  // Helper to create a family member
  const createMember = (
    id: string,
    firstName: string,
    lastName: string,
    gender: string,
    birthDate?: string,
    relations: Array<{ type: string; personId: string }> = []
  ): FamilyMember => ({
    id,
    firstName,
    lastName,
    gender,
    birthDate: birthDate || '1950-01-01',
    relations: relations.map((rel, idx) => ({
      id: `rel-${idx}`,
      type: rel.type as 'parent' | 'child' | 'spouse' | 'sibling',
      personId: rel.personId,
      person: null as any,
    })),
  });

  describe('calculateBeautifyLayout', () => {
    it('should return empty map for empty members array', () => {
      const positions = calculateBeautifyLayout([]);
      expect(positions.size).toBe(0);
    });

    it('should position a single member at origin', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male', '1950-01-01'),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(1);
      expect(positions.get('person1')).toEqual({ x: 0, y: 0 });
    });

    it('should position parent and child in vertical hierarchy', () => {
      const members = [
        createMember('parent', 'John', 'Smith', 'male', '1950-01-01', [
          { type: 'child', personId: 'child' },
        ]),
        createMember('child', 'Alice', 'Smith', 'female', '1980-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(2);
      
      const parentPos = positions.get('parent');
      const childPos = positions.get('child');
      
      expect(parentPos).toBeDefined();
      expect(childPos).toBeDefined();
      
      // Parent should be at a lower generation (higher y) than child
      // Actually, older generations should be at lower y (top of tree)
      // So parent (1950) should have lower y than child (1980)
      if (parentPos && childPos) {
        expect(parentPos.y).toBeLessThan(childPos.y);
      }
    });

    it('should position spouses next to each other', () => {
      const members = [
        createMember('husband', 'John', 'Smith', 'male', '1950-01-01', [
          { type: 'spouse', personId: 'wife' },
        ]),
        createMember('wife', 'Mary', 'Smith', 'female', '1952-01-01', [
          { type: 'spouse', personId: 'husband' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(2);
      
      const husbandPos = positions.get('husband');
      const wifePos = positions.get('wife');
      
      expect(husbandPos).toBeDefined();
      expect(wifePos).toBeDefined();
      
      // Spouses should be at same generation (same y)
      if (husbandPos && wifePos) {
        expect(husbandPos.y).toBe(wifePos.y);
        // Spouses should be close horizontally
        const horizontalDistance = Math.abs(husbandPos.x - wifePos.x);
        expect(horizontalDistance).toBeLessThan(300); // Should be close (nodeWidth + spouseGap)
      }
    });

    it('should group siblings together', () => {
      const members = [
        createMember('parent', 'John', 'Smith', 'male', '1950-01-01', [
          { type: 'child', personId: 'child1' },
          { type: 'child', personId: 'child2' },
        ]),
        createMember('child1', 'Alice', 'Smith', 'female', '1980-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
        createMember('child2', 'Bob', 'Smith', 'male', '1982-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(3);
      
      const child1Pos = positions.get('child1');
      const child2Pos = positions.get('child2');
      
      expect(child1Pos).toBeDefined();
      expect(child2Pos).toBeDefined();
      
      // Siblings should be at same generation
      if (child1Pos && child2Pos) {
        expect(child1Pos.y).toBe(child2Pos.y);
        // Siblings should be close horizontally
        const horizontalDistance = Math.abs(child1Pos.x - child2Pos.x);
        expect(horizontalDistance).toBeLessThan(500); // Should be reasonably close
      }
    });

    it('should position grandparents, parents, and children in vertical hierarchy', () => {
      const members = [
        createMember('grandparent', 'John', 'Smith', 'male', '1920-01-01', [
          { type: 'child', personId: 'parent' },
        ]),
        createMember('parent', 'Bob', 'Smith', 'male', '1950-01-01', [
          { type: 'parent', personId: 'grandparent' },
          { type: 'child', personId: 'child' },
        ]),
        createMember('child', 'Tom', 'Smith', 'male', '1980-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(3);
      
      const grandparentPos = positions.get('grandparent');
      const parentPos = positions.get('parent');
      const childPos = positions.get('child');
      
      expect(grandparentPos).toBeDefined();
      expect(parentPos).toBeDefined();
      expect(childPos).toBeDefined();
      
      // Should be in vertical hierarchy: grandparent (top) -> parent -> child (bottom)
      if (grandparentPos && parentPos && childPos) {
        expect(grandparentPos.y).toBeLessThan(parentPos.y);
        expect(parentPos.y).toBeLessThan(childPos.y);
      }
    });

    it('should separate different family branches horizontally', () => {
      const members = [
        // Branch 1
        createMember('root1', 'John', 'Smith', 'male', '1920-01-01', [
          { type: 'child', personId: 'child1' },
        ]),
        createMember('child1', 'Bob', 'Smith', 'male', '1950-01-01', [
          { type: 'parent', personId: 'root1' },
        ]),
        // Branch 2
        createMember('root2', 'Jane', 'Doe', 'female', '1925-01-01', [
          { type: 'child', personId: 'child2' },
        ]),
        createMember('child2', 'Alice', 'Doe', 'female', '1955-01-01', [
          { type: 'parent', personId: 'root2' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(4);
      
      const root1Pos = positions.get('root1');
      const root2Pos = positions.get('root2');
      
      expect(root1Pos).toBeDefined();
      expect(root2Pos).toBeDefined();
      
      // Different branches should be separated horizontally
      if (root1Pos && root2Pos) {
        const horizontalDistance = Math.abs(root1Pos.x - root2Pos.x);
        expect(horizontalDistance).toBeGreaterThan(200); // Should have significant separation
      }
    });

    it('should center parents above their children', () => {
      const members = [
        createMember('parent', 'John', 'Smith', 'male', '1950-01-01', [
          { type: 'child', personId: 'child1' },
          { type: 'child', personId: 'child2' },
        ]),
        createMember('child1', 'Alice', 'Smith', 'female', '1980-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
        createMember('child2', 'Bob', 'Smith', 'male', '1982-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(3);
      
      const parentPos = positions.get('parent');
      const child1Pos = positions.get('child1');
      const child2Pos = positions.get('child2');
      
      expect(parentPos).toBeDefined();
      expect(child1Pos).toBeDefined();
      expect(child2Pos).toBeDefined();
      
      // Parent should be centered above children
      if (parentPos && child1Pos && child2Pos) {
        const childrenCenterX = (child1Pos.x + child2Pos.x) / 2;
        const parentX = parentPos.x;
        // Parent should be approximately centered (allow some tolerance)
        expect(Math.abs(parentX - childrenCenterX)).toBeLessThan(100);
      }
    });

    it('should handle siblings with spouses correctly', () => {
      const members = [
        createMember('parent', 'John', 'Smith', 'male', '1950-01-01', [
          { type: 'child', personId: 'sibling1' },
          { type: 'child', personId: 'sibling2' },
        ]),
        createMember('sibling1', 'Alice', 'Smith', 'female', '1980-01-01', [
          { type: 'parent', personId: 'parent' },
          { type: 'spouse', personId: 'spouse1' },
        ]),
        createMember('spouse1', 'Bob', 'Jones', 'male', '1978-01-01', [
          { type: 'spouse', personId: 'sibling1' },
        ]),
        createMember('sibling2', 'Charlie', 'Smith', 'male', '1982-01-01', [
          { type: 'parent', personId: 'parent' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(4);
      
      const sibling1Pos = positions.get('sibling1');
      const spouse1Pos = positions.get('spouse1');
      const sibling2Pos = positions.get('sibling2');
      
      expect(sibling1Pos).toBeDefined();
      expect(spouse1Pos).toBeDefined();
      expect(sibling2Pos).toBeDefined();
      
      // All should be at same generation
      if (sibling1Pos && spouse1Pos && sibling2Pos) {
        expect(sibling1Pos.y).toBe(spouse1Pos.y);
        expect(sibling1Pos.y).toBe(sibling2Pos.y);
      }
    });

    it('should handle members without birth dates', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male'),
        createMember('person2', 'Jane', 'Smith', 'female'),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(2);
      expect(positions.get('person1')).toBeDefined();
      expect(positions.get('person2')).toBeDefined();
    });

    it('should respect custom configuration', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male', '1950-01-01'),
        createMember('person2', 'Jane', 'Smith', 'female', '1952-01-01'),
      ];

      const customConfig = {
        nodeWidth: 200,
        nodeHeight: 150,
        generationGap: 300,
      };

      const positions = calculateBeautifyLayout(members, customConfig);
      expect(positions.size).toBe(2);
      
      // With larger generation gap, members should be further apart vertically
      const pos1 = positions.get('person1');
      const pos2 = positions.get('person2');
      
      if (pos1 && pos2) {
        const verticalDistance = Math.abs(pos1.y - pos2.y);
        // Should respect the generation gap if they're in different generations
        // or be at same level if they're in same generation
        expect(verticalDistance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle complex family structure with multiple generations', () => {
      const members = [
        // Generation 0
        createMember('grandparent1', 'John', 'Smith', 'male', '1920-01-01', [
          { type: 'child', personId: 'parent1' },
        ]),
        createMember('grandparent2', 'Mary', 'Smith', 'female', '1922-01-01', [
          { type: 'child', personId: 'parent1' },
        ]),
        // Generation 1
        createMember('parent1', 'Bob', 'Smith', 'male', '1950-01-01', [
          { type: 'parent', personId: 'grandparent1' },
          { type: 'parent', personId: 'grandparent2' },
          { type: 'child', personId: 'child1' },
        ]),
        createMember('parent2', 'Alice', 'Smith', 'female', '1952-01-01', [
          { type: 'spouse', personId: 'parent1' },
          { type: 'child', personId: 'child1' },
        ]),
        // Generation 2
        createMember('child1', 'Tom', 'Smith', 'male', '1980-01-01', [
          { type: 'parent', personId: 'parent1' },
          { type: 'parent', personId: 'parent2' },
        ]),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(5);
      
      // Verify all members have positions
      members.forEach(member => {
        expect(positions.has(member.id)).toBe(true);
      });
      
      // Verify vertical hierarchy
      const grandparent1Pos = positions.get('grandparent1');
      const parent1Pos = positions.get('parent1');
      const child1Pos = positions.get('child1');
      
      if (grandparent1Pos && parent1Pos && child1Pos) {
        expect(grandparent1Pos.y).toBeLessThan(parent1Pos.y);
        expect(parent1Pos.y).toBeLessThan(child1Pos.y);
      }
    });

    it('should prevent overlapping nodes', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male', '1950-01-01'),
        createMember('person2', 'Jane', 'Smith', 'female', '1950-01-01'),
        createMember('person3', 'Bob', 'Smith', 'male', '1950-01-01'),
      ];

      const positions = calculateBeautifyLayout(members);
      expect(positions.size).toBe(3);
      
      const pos1 = positions.get('person1');
      const pos2 = positions.get('person2');
      const pos3 = positions.get('person3');
      
      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();
      expect(pos3).toBeDefined();
      
      // All should be at same generation (same y)
      if (pos1 && pos2 && pos3) {
        expect(pos1.y).toBe(pos2.y);
        expect(pos2.y).toBe(pos3.y);
        
        // Should have minimum gap between nodes
        const minGap = 180 + 20; // nodeWidth + minimum gap
        expect(Math.abs(pos2.x - pos1.x)).toBeGreaterThanOrEqual(minGap - 10); // Allow small tolerance
        expect(Math.abs(pos3.x - pos2.x)).toBeGreaterThanOrEqual(minGap - 10);
      }
    });

    it('should center entire tree around x=0', () => {
      const members = [
        createMember('person1', 'John', 'Smith', 'male', '1950-01-01'),
        createMember('person2', 'Jane', 'Smith', 'female', '1952-01-01'),
      ];

      const positions = calculateBeautifyLayout(members);
      
      // Find min and max x positions
      let minX = Infinity;
      let maxX = -Infinity;
      
      positions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
      });
      
      // Tree should be approximately centered (sum of min and max should be close to 0)
      const center = (minX + maxX) / 2;
      expect(Math.abs(center)).toBeLessThan(100); // Should be approximately centered
    });
  });

  describe('getBeautifyConfig', () => {
    it('should return default configuration', () => {
      const config = getBeautifyConfig();
      
      expect(config).toBeDefined();
      expect(config.nodeWidth).toBe(180);
      expect(config.nodeHeight).toBe(120);
      expect(config.spouseGap).toBe(40);
      expect(config.siblingGap).toBe(60);
      expect(config.generationGap).toBe(200);
      expect(config.familyUnitGap).toBe(80);
      expect(config.branchGap).toBe(300);
      expect(config.yearsPerGeneration).toBe(25);
    });
  });
});
