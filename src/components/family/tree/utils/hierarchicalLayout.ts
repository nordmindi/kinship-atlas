import { FamilyMember } from '@/types';
import { buildGenerations } from './generationBuilder';

interface Position {
  x: number;
  y: number;
}

interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  spouseSpacing: number;
  siblingSpacing: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  horizontalSpacing: 250,
  verticalSpacing: 200,
  spouseSpacing: 150,
  siblingSpacing: 200,
};

/**
 * Hierarchical layout algorithm:
 * - Parents on top, children below
 * - Spouses side by side
 * - Siblings of spouses positioned to the left or right based on spouse position
 */
export const calculateHierarchicalLayout = (
  members: FamilyMember[],
  rootMemberId: string,
  config: Partial<LayoutConfig> = {}
): Map<string, Position> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const positions = new Map<string, Position>();
  
  if (members.length === 0) return positions;
  
  const memberMap = new Map<string, FamilyMember>();
  members.forEach(member => memberMap.set(member.id, member));
  
  const rootMember = memberMap.get(rootMemberId);
  if (!rootMember) return positions;
  
  // Build generations
  const { generations, memberGenerations } = buildGenerations(rootMember, memberMap);
  
  // Build relationship maps for efficient lookup
  const spouseMap = new Map<string, string>(); // memberId -> spouseId
  const siblingGroups = new Map<string, Set<string>>(); // groupKey -> Set of memberIds
  const memberToSiblingGroup = new Map<string, string>(); // memberId -> groupKey
  
  members.forEach(member => {
    // Find spouse
    const spouseRelation = member.relations.find(rel => rel.type === 'spouse');
    if (spouseRelation && !spouseMap.has(spouseRelation.personId)) {
      spouseMap.set(member.id, spouseRelation.personId);
      spouseMap.set(spouseRelation.personId, member.id);
    }
    
    // Find siblings
    const siblings = member.relations
      .filter(rel => rel.type === 'sibling')
      .map(rel => rel.personId);
    
    if (siblings.length > 0) {
      // Create a sorted key for the sibling group
      const siblingIds = [member.id, ...siblings].sort();
      const groupKey = siblingIds.join('-');
      
      if (!siblingGroups.has(groupKey)) {
        siblingGroups.set(groupKey, new Set(siblingIds));
      }
      
      siblingIds.forEach(id => {
        memberToSiblingGroup.set(id, groupKey);
      });
    }
  });
  
  // Process each generation from top (parents) to bottom (children)
  const sortedGenerations = Array.from(generations.keys()).sort((a, b) => a - b);
  const minGeneration = Math.min(...sortedGenerations);
  
  // Track horizontal positions for each generation
  const generationXPositions: Map<number, number> = new Map();
  
  sortedGenerations.forEach(generation => {
    const membersInGeneration = generations.get(generation) || [];
    const normalizedGen = generation - minGeneration;
    
    // Group members: spouses together, then siblings
    const processed = new Set<string>();
    const groups: string[][] = [];
    
    membersInGeneration.forEach(memberId => {
      if (processed.has(memberId)) return;
      
      const group: string[] = [];
      const member = memberMap.get(memberId);
      if (!member) return;
      
      // Check if this member has a spouse
      const spouseId = spouseMap.get(memberId);
      
      if (spouseId && membersInGeneration.includes(spouseId)) {
        // Add spouse pair - first member, then spouse
        group.push(memberId);
        group.push(spouseId);
        processed.add(memberId);
        processed.add(spouseId);
        
        // Find siblings of first spouse (memberId) - place to the left
        const memberSiblings = member.relations
          .filter(rel => rel.type === 'sibling' && !processed.has(rel.personId))
          .map(rel => rel.personId)
          .filter(id => membersInGeneration.includes(id))
          .sort(); // Sort for consistent ordering
        
        // Find siblings of second spouse (spouseId) - place to the right
        const spouse = memberMap.get(spouseId);
        const spouseSiblings = spouse
          ? spouse.relations
              .filter(rel => rel.type === 'sibling' && !processed.has(rel.personId))
              .map(rel => rel.personId)
              .filter(id => membersInGeneration.includes(id))
              .sort() // Sort for consistent ordering
          : [];
        
        // Insert siblings of first spouse before the first spouse (left side)
        memberSiblings.reverse().forEach(siblingId => {
          if (!processed.has(siblingId)) {
            group.unshift(siblingId);
            processed.add(siblingId);
          }
        });
        
        // Insert siblings of second spouse after the second spouse (right side)
        spouseSiblings.forEach(siblingId => {
          if (!processed.has(siblingId)) {
            group.push(siblingId);
            processed.add(siblingId);
          }
        });
      } else {
        // No spouse, check for siblings
        const siblingGroupKey = memberToSiblingGroup.get(memberId);
        if (siblingGroupKey) {
          const siblingGroup = siblingGroups.get(siblingGroupKey);
          if (siblingGroup) {
            const siblingsInGen = Array.from(siblingGroup).filter(id => 
              membersInGeneration.includes(id) && !processed.has(id)
            );
            group.push(...siblingsInGen);
            siblingsInGen.forEach(id => processed.add(id));
          }
        } else {
          // Standalone member
          group.push(memberId);
          processed.add(memberId);
        }
      }
      
      if (group.length > 0) {
        groups.push(group);
      }
    });
    
    // Calculate positions for this generation
    let currentX = 0;
    
    groups.forEach(group => {
      const startX = currentX;
      let xOffset = 0;
      
      // Position members in the group
      group.forEach((memberId, index) => {
        const member = memberMap.get(memberId);
        const spouseId = spouseMap.get(memberId);
        
        // Check if next member is the spouse
        const nextMemberId = index < group.length - 1 ? group[index + 1] : null;
        const isNextSpouse = nextMemberId && (
          spouseMap.get(memberId) === nextMemberId || 
          spouseMap.get(nextMemberId) === memberId
        );
        
        // Determine spacing: use spouseSpacing between spouses, siblingSpacing otherwise
        const spacing = isNextSpouse ? finalConfig.spouseSpacing : finalConfig.siblingSpacing;
        
        const x = startX + xOffset;
        const y = normalizedGen * finalConfig.verticalSpacing;
        
        positions.set(memberId, { x, y });
        
        // Update xOffset for next member (only if not last)
        if (index < group.length - 1) {
          xOffset += spacing;
        }
      });
      
      // Move to next group position
      currentX += xOffset + finalConfig.horizontalSpacing;
    });
    
    // Center the generation horizontally
    if (groups.length > 0 && membersInGeneration.length > 0) {
      // Find the leftmost and rightmost positions
      let minX = Infinity;
      let maxX = -Infinity;
      
      membersInGeneration.forEach(memberId => {
        const pos = positions.get(memberId);
        if (pos) {
          minX = Math.min(minX, pos.x);
          maxX = Math.max(maxX, pos.x);
        }
      });
      
      // Calculate center offset to center the generation
      if (minX !== Infinity && maxX !== -Infinity) {
        const totalWidth = maxX - minX;
        const centerOffset = -minX - (totalWidth / 2);
        
        membersInGeneration.forEach(memberId => {
          const pos = positions.get(memberId);
          if (pos) {
            positions.set(memberId, { ...pos, x: pos.x + centerOffset });
          }
        });
      }
    }
  });
  
  return positions;
};

