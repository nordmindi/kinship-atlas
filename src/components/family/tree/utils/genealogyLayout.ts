import { FamilyMember } from '@/types';

interface Position {
  x: number;
  y: number;
}

interface GenealogyConfig {
  nodeWidth: number;
  nodeHeight: number;
  spouseGap: number;
  siblingGap: number;
  generationGap: number;
  familyUnitGap: number;
}

const DEFAULT_GENEALOGY_CONFIG: GenealogyConfig = {
  nodeWidth: 180,
  nodeHeight: 120,
  spouseGap: 40,        // Gap between spouses
  siblingGap: 60,       // Gap between siblings
  generationGap: 180,   // Vertical gap between generations
  familyUnitGap: 120,   // Gap between different family units
};

interface FamilyUnit {
  id: string;
  primaryMember: string;
  spouses: string[];       // All spouses
  childrenBySpouse: Map<string | null, string[]>; // spouse ID -> children, null for single parent
  generation: number;
  x: number;
  width: number;
}

/**
 * Get all spouses for a member
 */
const getSpouses = (
  member: FamilyMember,
  memberMap: Map<string, FamilyMember>
): FamilyMember[] => {
  return member.relations
    ?.filter(rel => rel.type === 'spouse')
    .map(rel => memberMap.get(rel.personId))
    .filter((s): s is FamilyMember => s !== undefined) || [];
};

/**
 * Get parents of a member
 */
const getParents = (
  member: FamilyMember,
  memberMap: Map<string, FamilyMember>
): FamilyMember[] => {
  return member.relations
    ?.filter(rel => rel.type === 'parent')
    .map(rel => memberMap.get(rel.personId))
    .filter((p): p is FamilyMember => p !== undefined) || [];
};

/**
 * Get children of a member (or couple)
 */
const getChildren = (
  memberId: string,
  spouseId: string | null,
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): string[] => {
  return members
    .filter(child => {
      const parents = getParents(child, memberMap);
      const parentIds = parents.map(p => p.id);
      
      // Child must have this member as parent
      if (!parentIds.includes(memberId)) return false;
      
      // If spouse specified, child must have both as parents
      if (spouseId) {
        return parentIds.includes(spouseId);
      }
      
      // If no spouse, child should only have this one parent (single parent case)
      return parentIds.length === 1 || !spouseId;
    })
    .map(c => c.id);
};

/**
 * Get all children of a member with any spouse
 */
const getAllChildren = (
  memberId: string,
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): string[] => {
  return members
    .filter(child => {
      const parents = getParents(child, memberMap);
      return parents.some(p => p.id === memberId);
    })
    .map(c => c.id);
};

/**
 * Find root ancestors (members without parents in the tree)
 */
const findRootAncestors = (
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): FamilyMember[] => {
  return members.filter(member => {
    const parents = getParents(member, memberMap);
    return parents.length === 0;
  });
};

/**
 * Build generations starting from root ancestors
 */
const buildGenerations = (
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): { generations: Map<number, Set<string>>; memberGen: Map<string, number> } => {
  const generations = new Map<number, Set<string>>();
  const memberGen = new Map<string, number>();
  const roots = findRootAncestors(members, memberMap);
  
  // Assign initial generation based on birth year for roots
  const GENERATION_SPAN = 25;
  const birthYears = members
    .filter(m => m.birthDate)
    .map(m => new Date(m.birthDate!).getFullYear());
  const earliestYear = birthYears.length > 0 ? Math.min(...birthYears) : 1900;
  
  // First pass: assign generations to roots based on birth year
  roots.forEach(root => {
    const birthYear = root.birthDate ? new Date(root.birthDate).getFullYear() : earliestYear;
    const gen = Math.floor((birthYear - earliestYear) / GENERATION_SPAN);
    memberGen.set(root.id, gen);
    
    if (!generations.has(gen)) {
      generations.set(gen, new Set());
    }
    generations.get(gen)!.add(root.id);
  });
  
  // BFS to propagate generations through parent-child relationships
  const queue = [...roots.map(r => r.id)];
  const visited = new Set<string>(queue);
  
  while (queue.length > 0) {
    const memberId = queue.shift()!;
    const member = memberMap.get(memberId)!;
    const currentGen = memberGen.get(memberId)!;
    
    // Process children
    const children = getAllChildren(memberId, members, memberMap);
    children.forEach(childId => {
      const childGen = currentGen + 1;
      
      if (!memberGen.has(childId) || memberGen.get(childId)! < childGen) {
        memberGen.set(childId, childGen);
        
        if (!generations.has(childGen)) {
          generations.set(childGen, new Set());
        }
        // Remove from old generation if present
        generations.forEach((genMembers, g) => {
          if (g !== childGen) genMembers.delete(childId);
        });
        generations.get(childGen)!.add(childId);
      }
      
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push(childId);
      }
    });
    
    // Ensure spouses are in the same generation
    const spouses = getSpouses(member, memberMap);
    spouses.forEach(spouse => {
      if (!memberGen.has(spouse.id)) {
        memberGen.set(spouse.id, currentGen);
        if (!generations.has(currentGen)) {
          generations.set(currentGen, new Set());
        }
        generations.get(currentGen)!.add(spouse.id);
      }
      
      if (!visited.has(spouse.id)) {
        visited.add(spouse.id);
        queue.push(spouse.id);
      }
    });
  }
  
  // Ensure all members are assigned a generation
  members.forEach(member => {
    if (!memberGen.has(member.id)) {
      const birthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : earliestYear;
      const gen = Math.floor((birthYear - earliestYear) / GENERATION_SPAN);
      memberGen.set(member.id, gen);
      if (!generations.has(gen)) {
        generations.set(gen, new Set());
      }
      generations.get(gen)!.add(member.id);
    }
  });
  
  return { generations, memberGen };
};

/**
 * Group siblings together
 */
const groupSiblings = (
  memberIds: string[],
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): string[][] => {
  const groups: string[][] = [];
  const processed = new Set<string>();
  
  memberIds.forEach(id => {
    if (processed.has(id)) return;
    
    const member = memberMap.get(id)!;
    const parents = getParents(member, memberMap);
    const parentIds = parents.map(p => p.id).sort().join(',');
    
    if (parentIds) {
      // Find all siblings with the same parents
      const siblingGroup = memberIds.filter(sibId => {
        if (processed.has(sibId)) return false;
        const sibling = memberMap.get(sibId)!;
        const sibParents = getParents(sibling, memberMap);
        const sibParentIds = sibParents.map(p => p.id).sort().join(',');
        return sibParentIds === parentIds;
      });
      
      // Sort siblings by birth year
      siblingGroup.sort((a, b) => {
        const memberA = memberMap.get(a);
        const memberB = memberMap.get(b);
        const yearA = memberA?.birthDate ? new Date(memberA.birthDate).getFullYear() : 9999;
        const yearB = memberB?.birthDate ? new Date(memberB.birthDate).getFullYear() : 9999;
        return yearA - yearB;
      });
      
      siblingGroup.forEach(s => processed.add(s));
      groups.push(siblingGroup);
    } else {
      // No parents - individual or root
      processed.add(id);
      groups.push([id]);
    }
  });
  
  return groups;
};

/**
 * Calculate width needed for a family unit (member + spouses)
 */
const calculateFamilyUnitWidth = (
  memberId: string,
  placedSpouses: Set<string>,
  memberMap: Map<string, FamilyMember>,
  config: GenealogyConfig
): number => {
  const member = memberMap.get(memberId);
  if (!member) return config.nodeWidth;
  
  const spouses = getSpouses(member, memberMap).filter(s => !placedSpouses.has(s.id));
  return config.nodeWidth + (spouses.length * (config.nodeWidth + config.spouseGap));
};

/**
 * Position a generation with proper grouping
 */
const positionGeneration = (
  generationMembers: string[],
  generation: number,
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>,
  positions: Map<string, Position>,
  placedMembers: Set<string>,
  config: GenealogyConfig,
  orientation: 'top-down' | 'bottom-up',
  minGeneration: number,
  maxGeneration: number
): void => {
  // Filter out already placed members
  const unplaced = generationMembers.filter(id => !placedMembers.has(id));
  if (unplaced.length === 0) return;
  
  // Group siblings together
  const siblingGroups = groupSiblings(unplaced, members, memberMap);
  
  // Calculate Y position for this generation
  let y: number;
  if (orientation === 'top-down') {
    y = (generation - minGeneration) * (config.nodeHeight + config.generationGap);
  } else {
    y = (maxGeneration - generation) * (config.nodeHeight + config.generationGap);
  }
  
  // Track placed spouses to avoid duplicates
  const placedSpouses = new Set<string>();
  
  // Calculate total width and positions for each sibling group
  const groupLayouts: { siblings: string[]; x: number; width: number }[] = [];
  let currentX = 0;
  
  siblingGroups.forEach(siblings => {
    const groupStart = currentX;
    let groupWidth = 0;
    
    siblings.forEach((siblingId, idx) => {
      if (placedMembers.has(siblingId)) return;
      
      const member = memberMap.get(siblingId)!;
      const spouses = getSpouses(member, memberMap).filter(s => !placedSpouses.has(s.id));
      
      // Calculate unit width for this sibling + their spouses
      const unitWidth = config.nodeWidth + (spouses.length * (config.nodeWidth + config.spouseGap));
      groupWidth += unitWidth;
      
      if (idx < siblings.length - 1) {
        groupWidth += config.siblingGap;
      }
      
      // Mark spouses as placed
      spouses.forEach(s => placedSpouses.add(s.id));
    });
    
    groupLayouts.push({
      siblings,
      x: groupStart,
      width: groupWidth
    });
    
    currentX += groupWidth + config.familyUnitGap;
  });
  
  // Center the entire generation
  const totalWidth = currentX - config.familyUnitGap;
  const offsetX = -totalWidth / 2;
  
  // Reset placed spouses for actual placement
  placedSpouses.clear();
  
  // Place each group
  let x = offsetX;
  
  siblingGroups.forEach(siblings => {
    // Try to center siblings under their parents
    let parentCenterX: number | null = null;
    
    const firstSibling = memberMap.get(siblings[0]);
    if (firstSibling) {
      const parents = getParents(firstSibling, memberMap);
      if (parents.length > 0) {
        const parentXs = parents.map(p => positions.get(p.id)?.x).filter((px): px is number => px !== undefined);
        if (parentXs.length > 0) {
          parentCenterX = parentXs.reduce((sum, px) => sum + px, 0) / parentXs.length;
        }
      }
    }
    
    // Calculate group width
    let groupWidth = 0;
    siblings.forEach((siblingId, idx) => {
      if (placedMembers.has(siblingId)) return;
      const member = memberMap.get(siblingId)!;
      const spouses = getSpouses(member, memberMap).filter(s => !placedSpouses.has(s.id));
      const unitWidth = config.nodeWidth + (spouses.length * (config.nodeWidth + config.spouseGap));
      groupWidth += unitWidth;
      if (idx < siblings.length - 1) {
        groupWidth += config.siblingGap;
      }
    });
    
    // Adjust x to center under parents if possible
    let siblingX = x;
    if (parentCenterX !== null) {
      const groupCenterOffset = groupWidth / 2;
      siblingX = parentCenterX - groupCenterOffset;
    }
    
    // Place siblings and their spouses
    siblings.forEach((siblingId) => {
      if (placedMembers.has(siblingId)) return;
      
      const member = memberMap.get(siblingId)!;
      const spouses = getSpouses(member, memberMap).filter(s => !placedSpouses.has(s.id));
      
      // Place the primary member
      positions.set(siblingId, { x: siblingX, y });
      placedMembers.add(siblingId);
      
      // Place spouses to the right
      let spouseX = siblingX + config.nodeWidth + config.spouseGap;
      spouses.forEach(spouse => {
        if (!placedMembers.has(spouse.id)) {
          positions.set(spouse.id, { x: spouseX, y });
          placedMembers.add(spouse.id);
          placedSpouses.add(spouse.id);
          spouseX += config.nodeWidth + config.spouseGap;
        }
      });
      
      siblingX += config.nodeWidth + (spouses.length * (config.nodeWidth + config.spouseGap)) + config.siblingGap;
    });
    
    x += groupWidth + config.familyUnitGap;
  });
};

/**
 * Resolve overlapping positions
 */
const resolveOverlaps = (
  positions: Map<string, Position>,
  memberGen: Map<string, number>,
  config: GenealogyConfig
): void => {
  // Group positions by generation (same Y coordinate effectively)
  const byGeneration = new Map<number, string[]>();
  
  memberGen.forEach((gen, memberId) => {
    if (!byGeneration.has(gen)) {
      byGeneration.set(gen, []);
    }
    byGeneration.get(gen)!.push(memberId);
  });
  
  // For each generation, check and resolve overlaps
  byGeneration.forEach((memberIds) => {
    // Sort by X position
    const sorted = memberIds
      .filter(id => positions.has(id))
      .sort((a, b) => (positions.get(a)?.x || 0) - (positions.get(b)?.x || 0));
    
    // Check for overlaps and shift
    for (let i = 1; i < sorted.length; i++) {
      const prevPos = positions.get(sorted[i - 1])!;
      const currPos = positions.get(sorted[i])!;
      
      const minX = prevPos.x + config.nodeWidth + config.siblingGap / 2;
      if (currPos.x < minX) {
        const shift = minX - currPos.x;
        // Shift this member and all following members
        for (let j = i; j < sorted.length; j++) {
          const pos = positions.get(sorted[j])!;
          pos.x += shift;
        }
      }
    }
  });
};

/**
 * Main function to calculate genealogy layout
 */
export const calculateGenealogyLayout = (
  members: FamilyMember[],
  focusMemberId?: string,
  orientation: 'top-down' | 'bottom-up' = 'top-down',
  config: GenealogyConfig = DEFAULT_GENEALOGY_CONFIG
): Map<string, Position> => {
  const positions = new Map<string, Position>();
  const memberMap = new Map<string, FamilyMember>(members.map(m => [m.id, m]));
  const placedMembers = new Set<string>();
  
  // Build generations
  const { generations, memberGen } = buildGenerations(members, memberMap);
  
  // Get sorted generation numbers
  const sortedGens = Array.from(generations.keys()).sort((a, b) => a - b);
  const minGeneration = sortedGens[0] ?? 0;
  const maxGeneration = sortedGens[sortedGens.length - 1] ?? 0;
  
  console.log('Genealogy layout generations:', {
    totalMembers: members.length,
    generations: sortedGens.map(g => ({
      gen: g,
      count: generations.get(g)?.size || 0,
      members: Array.from(generations.get(g) || []).map(id => memberMap.get(id)?.firstName || id)
    }))
  });
  
  // Process each generation from top to bottom
  sortedGens.forEach(gen => {
    const genMembers = Array.from(generations.get(gen) || []);
    
    positionGeneration(
      genMembers,
      gen,
      members,
      memberMap,
      positions,
      placedMembers,
      config,
      orientation,
      minGeneration,
      maxGeneration
    );
  });
  
  // Resolve any remaining overlaps
  resolveOverlaps(positions, memberGen, config);
  
  // If focus member specified, center the layout on them
  if (focusMemberId && positions.has(focusMemberId)) {
    const focusPos = positions.get(focusMemberId)!;
    const offsetX = -focusPos.x;
    const offsetY = -focusPos.y;
    
    positions.forEach((pos) => {
      pos.x += offsetX;
      pos.y += offsetY;
    });
  }
  
  console.log('Genealogy layout complete:', {
    totalPositions: positions.size,
    unplaced: members.length - positions.size
  });
  
  return positions;
};

export type { GenealogyConfig };
