
import { FamilyMember } from '@/types';

// Cache for generation calculations
interface GenerationCache {
  rootMemberId: string;
  memberIds: string[];
  result: {
    generations: Map<number, string[]>, 
    memberGenerations: Map<string, number>,
    processed: Set<string>
  };
  timestamp: number;
}

let generationCache: GenerationCache | null = null;
const CACHE_TTL = 5000; // 5 seconds cache

/**
 * Builds family generations based on relationships with caching
 */
export const buildGenerations = (
  rootMember: FamilyMember,
  memberMap: Map<string, FamilyMember>
): { 
  generations: Map<number, string[]>, 
  memberGenerations: Map<string, number>,
  processed: Set<string>
} => {
  // Check cache validity
  const currentMemberIds = Array.from(memberMap.keys()).sort();
  const now = Date.now();
  
  if (
    generationCache &&
    generationCache.rootMemberId === rootMember.id &&
    JSON.stringify(generationCache.memberIds) === JSON.stringify(currentMemberIds) &&
    (now - generationCache.timestamp) < CACHE_TTL
  ) {
    // Return cached result (need to recreate Maps and Sets as they're not JSON serializable)
    const cached = generationCache.result;
    const generations = new Map<number, string[]>();
    const memberGenerations = new Map<string, number>();
    const processed = new Set<string>();
    
    cached.generations.forEach((ids, gen) => generations.set(gen, [...ids]));
    cached.memberGenerations.forEach((gen, id) => memberGenerations.set(id, gen));
    cached.processed.forEach(id => processed.add(id));
    
    return { generations, memberGenerations, processed };
  }
  const generations = new Map<number, string[]>();
  const memberGenerations = new Map<string, number>();
  const processed = new Set<string>();
  
  // Start with the root member at generation 0
  memberGenerations.set(rootMember.id, 0);
  if (!generations.has(0)) generations.set(0, []);
  generations.get(0)!.push(rootMember.id);
  
  // Build generations - traverse up for ancestors and down for descendants
  const buildMemberGenerations = (memberId: string, generation: number) => {
    if (processed.has(memberId)) return;
    processed.add(memberId);
    
    const member = memberMap.get(memberId);
    if (!member) return;
    
    memberGenerations.set(memberId, generation);
    if (!generations.has(generation)) generations.set(generation, []);
    if (!generations.get(generation)!.includes(memberId)) {
      generations.get(generation)!.push(memberId);
    }
    
    // Process parents (go up generations)
    member.relations
      .filter(rel => rel.type === 'parent')
      .forEach(relation => {
        const parentId = relation.personId;
        if (!memberGenerations.has(parentId) || memberGenerations.get(parentId)! > generation - 1) {
          memberGenerations.set(parentId, generation - 1);
          if (!generations.has(generation - 1)) generations.set(generation - 1, []);
          if (!generations.get(generation - 1)!.includes(parentId)) {
            generations.get(generation - 1)!.push(parentId);
          }
          buildMemberGenerations(parentId, generation - 1);
        }
      });
    
    // Process children (go down generations)
    member.relations
      .filter(rel => rel.type === 'child')
      .forEach(relation => {
        const childId = relation.personId;
        if (!memberGenerations.has(childId) || memberGenerations.get(childId)! < generation + 1) {
          memberGenerations.set(childId, generation + 1);
          if (!generations.has(generation + 1)) generations.set(generation + 1, []);
          if (!generations.get(generation + 1)!.includes(childId)) {
            generations.get(generation + 1)!.push(childId);
          }
          buildMemberGenerations(childId, generation + 1);
        }
      });
      
    // Process spouses (same generation)
    member.relations
      .filter(rel => rel.type === 'spouse')
      .forEach(relation => {
        const spouseId = relation.personId;
        if (!memberGenerations.has(spouseId) || memberGenerations.get(spouseId)! !== generation) {
          memberGenerations.set(spouseId, generation);
          if (!generations.has(generation)) generations.set(generation, []);
          if (!generations.get(generation)!.includes(spouseId)) {
            generations.get(generation)!.push(spouseId);
          }
          buildMemberGenerations(spouseId, generation);
        }
      });
      
    // Process siblings (same generation)
    member.relations
      .filter(rel => rel.type === 'sibling')
      .forEach(relation => {
        const siblingId = relation.personId;
        if (!memberGenerations.has(siblingId) || memberGenerations.get(siblingId)! !== generation) {
          memberGenerations.set(siblingId, generation);
          if (!generations.has(generation)) generations.set(generation, []);
          if (!generations.get(generation)!.includes(siblingId)) {
            generations.get(generation)!.push(siblingId);
          }
          buildMemberGenerations(siblingId, generation);
        }
      });
  };
  
  // Start building generations from the root
  buildMemberGenerations(rootMember.id, 0);
  
  // Cache the result
  generationCache = {
    rootMemberId: rootMember.id,
    memberIds: currentMemberIds,
    result: {
      generations: new Map(generations),
      memberGenerations: new Map(memberGenerations),
      processed: new Set(processed)
    },
    timestamp: now
  };
  
  return { generations, memberGenerations, processed };
};

/**
 * Clear the generation cache (useful when members are added/removed)
 */
export const clearGenerationCache = (): void => {
  generationCache = null;
};
