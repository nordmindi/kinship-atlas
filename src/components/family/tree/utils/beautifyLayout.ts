import { FamilyMember } from '@/types';

interface Position {
  x: number;
  y: number;
}

interface BeautifyConfig {
  nodeWidth: number;
  nodeHeight: number;
  spouseGap: number;
  siblingGap: number;
  generationGap: number;
  familyUnitGap: number;
  branchGap: number;
  yearsPerGeneration: number;
}

const DEFAULT_BEAUTIFY_CONFIG: BeautifyConfig = {
  nodeWidth: 180,
  nodeHeight: 120,
  spouseGap: 40,      // Reduced - spouses should be close
  siblingGap: 60,     // Reduced - siblings should be close together
  generationGap: 200,
  familyUnitGap: 80,  // Gap between sibling-with-spouse units
  branchGap: 300,     // Gap between different family branches
  yearsPerGeneration: 25,
};

/**
 * Get spouse for a member
 */
const getSpouse = (
  member: FamilyMember,
  memberMap: Map<string, FamilyMember>
): FamilyMember | null => {
  const spouseRelation = member.relations.find(rel => rel.type === 'spouse');
  if (spouseRelation) {
    return memberMap.get(spouseRelation.personId) || null;
  }
  return null;
};

/**
 * Get children of a member
 */
const getChildren = (
  member: FamilyMember,
  memberMap: Map<string, FamilyMember>
): FamilyMember[] => {
  return member.relations
    .filter(rel => rel.type === 'child')
    .map(rel => memberMap.get(rel.personId))
    .filter((c): c is FamilyMember => c !== undefined)
    .sort((a, b) => {
      if (!a.birthDate && !b.birthDate) return 0;
      if (!a.birthDate) return 1;
      if (!b.birthDate) return -1;
      return new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
    });
};

/**
 * Get parents of a member
 */
const getParents = (
  member: FamilyMember,
  memberMap: Map<string, FamilyMember>
): FamilyMember[] => {
  return member.relations
    .filter(rel => rel.type === 'parent')
    .map(rel => memberMap.get(rel.personId))
    .filter((p): p is FamilyMember => p !== undefined);
};

/**
 * Get siblings of a member (share at least one parent)
 */
const getSiblings = (
  member: FamilyMember,
  memberMap: Map<string, FamilyMember>
): FamilyMember[] => {
  const parentIds = member.relations
    .filter(rel => rel.type === 'parent')
    .map(rel => rel.personId);
  
  if (parentIds.length === 0) return [];
  
  const siblings: FamilyMember[] = [];
  
  memberMap.forEach(other => {
    if (other.id === member.id) return;
    
    const otherParentIds = other.relations
      .filter(rel => rel.type === 'parent')
      .map(rel => rel.personId);
    
    const shareParent = parentIds.some(pid => otherParentIds.includes(pid));
    if (shareParent) {
      siblings.push(other);
    }
  });
  
  return siblings.sort((a, b) => {
    if (!a.birthDate && !b.birthDate) return 0;
    if (!a.birthDate) return 1;
    if (!b.birthDate) return -1;
    return new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
  });
};

/**
 * Get birth year from a member
 */
const getBirthYear = (member: FamilyMember): number | null => {
  if (!member.birthDate) return null;
  return new Date(member.birthDate).getFullYear();
};

/**
 * Find root ancestors and group married couples together
 */
const findRootCouples = (
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): string[][] => {
  const roots = members.filter(member => 
    !member.relations.some(rel => rel.type === 'parent')
  );
  
  const processed = new Set<string>();
  const couples: string[][] = [];
  
  const sortedRoots = [...roots].sort((a, b) => {
    const yearA = getBirthYear(a);
    const yearB = getBirthYear(b);
    if (yearA === null && yearB === null) return 0;
    if (yearA === null) return 1;
    if (yearB === null) return -1;
    return yearA - yearB;
  });
  
  sortedRoots.forEach(root => {
    if (processed.has(root.id)) return;
    processed.add(root.id);
    
    const couple = [root.id];
    
    const spouse = getSpouse(root, memberMap);
    if (spouse && roots.some(r => r.id === spouse.id) && !processed.has(spouse.id)) {
      processed.add(spouse.id);
      couple.push(spouse.id);
    }
    
    couples.push(couple);
  });
  
  return couples;
};

/**
 * Build descendant tree from root couple
 */
const buildDescendants = (
  rootIds: string[],
  memberMap: Map<string, FamilyMember>
): Set<string> => {
  const descendants = new Set<string>();
  const queue = [...rootIds];
  
  while (queue.length > 0) {
    const memberId = queue.shift()!;
    if (descendants.has(memberId)) continue;
    descendants.add(memberId);
    
    const member = memberMap.get(memberId);
    if (member) {
      getChildren(member, memberMap).forEach(child => {
        if (!descendants.has(child.id)) {
          queue.push(child.id);
        }
      });
    }
  }
  
  return descendants;
};

/**
 * Build generation levels based on parent-child relationships
 */
const buildGenerationLevels = (
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>,
  config: BeautifyConfig
): Map<string, number> => {
  const generations = new Map<string, number>();
  
  // Find earliest birth year for reference
  let earliestBirthYear = Infinity;
  members.forEach(member => {
    const birthYear = getBirthYear(member);
    if (birthYear !== null && birthYear < earliestBirthYear) {
      earliestBirthYear = birthYear;
    }
  });
  
  if (earliestBirthYear === Infinity) {
    earliestBirthYear = 1900;
  }
  
  // Initial assignment based on birth year
  members.forEach(member => {
    const birthYear = getBirthYear(member);
    if (birthYear !== null) {
      const yearsDiff = birthYear - earliestBirthYear;
      const generation = Math.floor(yearsDiff / config.yearsPerGeneration);
      generations.set(member.id, generation);
    } else {
      generations.set(member.id, 0);
    }
  });
  
  // Adjust based on parent-child relationships
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    
    members.forEach(member => {
      const memberGen = generations.get(member.id) ?? 0;
      
      member.relations
        .filter(rel => rel.type === 'child')
        .forEach(rel => {
          const childGen = generations.get(rel.personId);
          if (childGen !== undefined && childGen <= memberGen) {
            generations.set(rel.personId, memberGen + 1);
            changed = true;
          }
        });
    });
  }
  
  // Ensure spouses are at same generation
  members.forEach(member => {
    const memberGen = generations.get(member.id) ?? 0;
    
    member.relations
      .filter(rel => rel.type === 'spouse')
      .forEach(rel => {
        const spouseGen = generations.get(rel.personId);
        if (spouseGen !== undefined && spouseGen !== memberGen) {
          const minGen = Math.min(memberGen, spouseGen);
          generations.set(member.id, minGen);
          generations.set(rel.personId, minGen);
        }
      });
  });
  
  // Normalize to start from 0
  let minGen = Infinity;
  generations.forEach(gen => {
    if (gen < minGen) minGen = gen;
  });
  
  if (minGen !== 0 && minGen !== Infinity) {
    generations.forEach((gen, memberId) => {
      generations.set(memberId, gen - minGen);
    });
  }
  
  return generations;
};

/**
 * Sibling group with spouses positioned on edges
 */
interface SiblingGroup {
  siblingIds: string[];           // Core siblings (share parents)
  siblingWithSpouse: Map<string, string>; // sibling -> their spouse (if any, positioned outside)
  parentIds: string[];            // Common parents
  childrenByParentPair: Map<string, string[]>; // "parent1_parent2" -> children
}

/**
 * Build sibling groups for a generation
 */
const buildSiblingGroups = (
  genMemberIds: string[],
  memberMap: Map<string, FamilyMember>
): SiblingGroup[] => {
  const groups: SiblingGroup[] = [];
  const assignedToGroup = new Set<string>();
  
  // Sort members by birth year
  const sortedMembers = [...genMemberIds].sort((a, b) => {
    const memberA = memberMap.get(a);
    const memberB = memberMap.get(b);
    const yearA = memberA ? getBirthYear(memberA) : null;
    const yearB = memberB ? getBirthYear(memberB) : null;
    if (yearA === null && yearB === null) return 0;
    if (yearA === null) return 1;
    if (yearB === null) return -1;
    return yearA - yearB;
  });
  
  sortedMembers.forEach(memberId => {
    if (assignedToGroup.has(memberId)) return;
    
    const member = memberMap.get(memberId);
    if (!member) return;
    
    // Get this member's parents
    const memberParents = getParents(member, memberMap);
    const parentIds = memberParents.map(p => p.id).sort();
    
    // Find all siblings in this generation
    const siblings = getSiblings(member, memberMap).filter(s => 
      genMemberIds.includes(s.id) && !assignedToGroup.has(s.id)
    );
    
    // Create group with this member and siblings
    const siblingIds = [memberId, ...siblings.map(s => s.id)];
    siblingIds.forEach(id => assignedToGroup.add(id));
    
    // Sort siblings by birth year
    siblingIds.sort((a, b) => {
      const ma = memberMap.get(a);
      const mb = memberMap.get(b);
      const ya = ma ? getBirthYear(ma) : null;
      const yb = mb ? getBirthYear(mb) : null;
      if (ya === null && yb === null) return 0;
      if (ya === null) return 1;
      if (yb === null) return -1;
      return ya - yb;
    });
    
    // Find spouses for each sibling
    const siblingWithSpouse = new Map<string, string>();
    siblingIds.forEach(sibId => {
      const sib = memberMap.get(sibId);
      if (sib) {
        const spouse = getSpouse(sib, memberMap);
        if (spouse && genMemberIds.includes(spouse.id)) {
          // Check if spouse is also a sibling in this group
          if (!siblingIds.includes(spouse.id)) {
            siblingWithSpouse.set(sibId, spouse.id);
            assignedToGroup.add(spouse.id);
          }
        }
      }
    });
    
    // Get children grouped by parent pair
    const childrenByParentPair = new Map<string, string[]>();
    siblingIds.forEach(sibId => {
      const sib = memberMap.get(sibId);
      if (!sib) return;
      
      const spouse = getSpouse(sib, memberMap);
      const children = getChildren(sib, memberMap);
      
      if (children.length > 0) {
        const pairKey = spouse ? [sibId, spouse.id].sort().join('_') : sibId;
        if (!childrenByParentPair.has(pairKey)) {
          childrenByParentPair.set(pairKey, []);
        }
        children.forEach(child => {
          const existing = childrenByParentPair.get(pairKey)!;
          if (!existing.includes(child.id)) {
            existing.push(child.id);
          }
        });
      }
    });
    
    groups.push({
      siblingIds,
      siblingWithSpouse,
      parentIds,
      childrenByParentPair,
    });
  });
  
  return groups;
};

interface FamilyBranch {
  id: string;
  rootIds: string[];
  memberIds: string[];
  x: number;
  width: number;
}

/**
 * Beautify layout algorithm - keeps siblings together
 */
export const calculateBeautifyLayout = (
  members: FamilyMember[],
  config: Partial<BeautifyConfig> = {}
): Map<string, Position> => {
  const finalConfig = { ...DEFAULT_BEAUTIFY_CONFIG, ...config };
  const positions = new Map<string, Position>();

  if (members.length === 0) return positions;

  const memberMap = new Map<string, FamilyMember>();
  members.forEach(member => memberMap.set(member.id, member));

  // Build generation levels
  const generations = buildGenerationLevels(members, memberMap, finalConfig);

  // Find root couples
  const rootCouples = findRootCouples(members, memberMap);
  
  // Build family branches
  const familyBranches: FamilyBranch[] = [];
  const assignedMembers = new Set<string>();
  
  rootCouples.forEach(coupleIds => {
    const descendants = buildDescendants(coupleIds, memberMap);
    
    const branchMembers: string[] = [];
    descendants.forEach(memberId => {
      if (!assignedMembers.has(memberId)) {
        branchMembers.push(memberId);
        assignedMembers.add(memberId);
      }
    });
    
    if (branchMembers.length > 0) {
      familyBranches.push({
        id: coupleIds[0],
        rootIds: coupleIds,
        memberIds: branchMembers,
        x: 0,
        width: 0,
      });
    }
  });
  
  // Add unassigned members
  const unassigned: string[] = [];
  members.forEach(m => {
    if (!assignedMembers.has(m.id)) {
      unassigned.push(m.id);
    }
  });
  
  if (unassigned.length > 0 && familyBranches.length > 0) {
    familyBranches[0].memberIds.push(...unassigned);
  } else if (unassigned.length > 0) {
    familyBranches.push({
      id: 'default',
      rootIds: [],
      memberIds: unassigned,
      x: 0,
      width: 0,
    });
  }
  
  console.log('Beautify: Processing', familyBranches.length, 'branches');

  // Process each branch
  let currentBranchX = 0;
  
  familyBranches.forEach((branch) => {
    // Group members by generation
    const membersByGen = new Map<number, string[]>();
    
    branch.memberIds.forEach(memberId => {
      const gen = generations.get(memberId) ?? 0;
      if (!membersByGen.has(gen)) {
        membersByGen.set(gen, []);
      }
      membersByGen.get(gen)!.push(memberId);
    });
    
    const sortedGens = Array.from(membersByGen.keys()).sort((a, b) => a - b);
    
    // Position each generation
    sortedGens.forEach(gen => {
      const genMemberIds = membersByGen.get(gen) || [];
      const y = gen * finalConfig.generationGap;
      
      // Build sibling groups
      const siblingGroups = buildSiblingGroups(genMemberIds, memberMap);
      
      let currentX = currentBranchX;
      
      siblingGroups.forEach((group, groupIdx) => {
        if (groupIdx > 0) {
          currentX += finalConfig.familyUnitGap;
        }
        
        const groupStartX = currentX;
        
        // Position siblings with their spouses
        // Strategy: 
        // - Siblings without spouses are placed side by side
        // - Sibling with spouse: spouse on outer edge (first sibling's spouse on left, last sibling's spouse on right)
        // - Middle siblings with spouses: spouse on right side
        
        group.siblingIds.forEach((sibId, sibIdx) => {
          const hasSpouse = group.siblingWithSpouse.has(sibId);
          const spouseId = group.siblingWithSpouse.get(sibId);
          
          const isFirstSibling = sibIdx === 0;
          const isLastSibling = sibIdx === group.siblingIds.length - 1;
          
          if (hasSpouse && spouseId) {
            if (isFirstSibling && group.siblingIds.length > 1) {
              // First sibling: spouse on LEFT
              positions.set(spouseId, { x: currentX, y });
              currentX += finalConfig.nodeWidth + finalConfig.spouseGap;
              positions.set(sibId, { x: currentX, y });
              currentX += finalConfig.nodeWidth;
            } else if (isLastSibling) {
              // Last sibling: spouse on RIGHT
              positions.set(sibId, { x: currentX, y });
              currentX += finalConfig.nodeWidth + finalConfig.spouseGap;
              positions.set(spouseId, { x: currentX, y });
              currentX += finalConfig.nodeWidth;
            } else {
              // Middle sibling: spouse on RIGHT
              positions.set(sibId, { x: currentX, y });
              currentX += finalConfig.nodeWidth + finalConfig.spouseGap;
              positions.set(spouseId, { x: currentX, y });
              currentX += finalConfig.nodeWidth;
            }
          } else {
            // No spouse, just position the sibling
            positions.set(sibId, { x: currentX, y });
            currentX += finalConfig.nodeWidth;
          }
          
          // Add gap to next sibling
          if (sibIdx < group.siblingIds.length - 1) {
            currentX += finalConfig.siblingGap;
          }
        });
        
        // Update branch width
        branch.width = Math.max(branch.width, currentX - currentBranchX);
      });
    });
    
    // Move to next branch
    currentBranchX += branch.width + finalConfig.branchGap;
  });

  // Second pass: Center parents above their children
  const allGenerations = Array.from(new Set(Array.from(generations.values()))).sort((a, b) => b - a);
  
  allGenerations.forEach(generation => {
    const genMemberIds = members
      .filter(m => generations.get(m.id) === generation)
      .map(m => m.id);
    
    // Build sibling groups for this generation
    const siblingGroups = buildSiblingGroups(genMemberIds, memberMap);
    
    siblingGroups.forEach(group => {
      // Get all children of this sibling group
      const allGroupChildren: string[] = [];
      group.siblingIds.forEach(sibId => {
        const sib = memberMap.get(sibId);
        if (sib) {
          getChildren(sib, memberMap).forEach(child => {
            if (!allGroupChildren.includes(child.id)) {
              allGroupChildren.push(child.id);
            }
          });
        }
      });
      
      if (allGroupChildren.length === 0) return;
      
      // Get positions of children
      const childXPositions = allGroupChildren
        .filter(cid => positions.has(cid))
        .map(cid => positions.get(cid)!.x);
      
      if (childXPositions.length === 0) return;
      
      const childrenMinX = Math.min(...childXPositions);
      const childrenMaxX = Math.max(...childXPositions);
      const childrenCenterX = (childrenMinX + childrenMaxX) / 2;
      
      // Get positions of the sibling group (including spouses)
      const groupMemberIds = [...group.siblingIds];
      group.siblingWithSpouse.forEach((spouseId) => {
        groupMemberIds.push(spouseId);
      });
      
      const groupXPositions = groupMemberIds
        .filter(mid => positions.has(mid))
        .map(mid => positions.get(mid)!.x);
      
      if (groupXPositions.length === 0) return;
      
      const groupMinX = Math.min(...groupXPositions);
      const groupMaxX = Math.max(...groupXPositions);
      const groupCenterX = (groupMinX + groupMaxX) / 2;
      
      // Calculate offset to center the group above children
      const offset = childrenCenterX - groupCenterX;
      
      // Move entire group together
      groupMemberIds.forEach(mid => {
        const pos = positions.get(mid);
        if (pos) {
          positions.set(mid, { x: pos.x + offset, y: pos.y });
        }
      });
    });
  });

  // Third pass: Resolve overlaps within each generation
  const sortedGenerations = Array.from(new Set(Array.from(generations.values()))).sort((a, b) => a - b);
  
  sortedGenerations.forEach(generation => {
    const genMemberIds = members
      .filter(m => generations.get(m.id) === generation)
      .map(m => m.id);
    
    const genPositions: Array<{ id: string; x: number }> = [];
    genMemberIds.forEach(mid => {
      const pos = positions.get(mid);
      if (pos) {
        genPositions.push({ id: mid, x: pos.x });
      }
    });
    
    genPositions.sort((a, b) => a.x - b.x);
    
    const minGap = finalConfig.nodeWidth + 20;
    
    for (let i = 1; i < genPositions.length; i++) {
      const prev = genPositions[i - 1];
      const curr = genPositions[i];
      
      const gap = curr.x - prev.x;
      if (gap < minGap) {
        const pushAmount = minGap - gap;
        
        // Push this node and all nodes to the right
        for (let j = i; j < genPositions.length; j++) {
          genPositions[j].x += pushAmount;
          const pos = positions.get(genPositions[j].id);
          if (pos) {
            positions.set(genPositions[j].id, { x: genPositions[j].x, y: pos.y });
          }
        }
      }
    }
  });

  // Fourth pass: Center entire tree around x=0
  if (positions.size > 0) {
    let minX = Infinity;
    let maxX = -Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
    });

    const centerOffset = -(minX + maxX) / 2;

    positions.forEach((pos, memberId) => {
      positions.set(memberId, { x: pos.x + centerOffset, y: pos.y });
    });
  }

  console.log('Beautify: Layout complete', {
    totalPositions: positions.size,
    branches: familyBranches.length,
  });

  return positions;
};

export const getBeautifyConfig = (): BeautifyConfig => {
  return { ...DEFAULT_BEAUTIFY_CONFIG };
};
