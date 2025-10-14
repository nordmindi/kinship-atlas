/**
 * Test Restructured System
 * 
 * This script tests the new atomic relationship service and validation system
 * without relying on database functions that may not be applied yet.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRestructuredSystem() {
  console.log('🧪 Testing restructured relationship system...');

  try {
    // Step 1: Check current database state
    console.log('\n📊 Step 1: Checking current database state...');
    const { data: allRelations, error: relationsError } = await supabase
      .from('relations')
      .select('*');

    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError);
      return;
    }

    console.log(`📊 Found ${allRelations?.length || 0} relationships in database`);

    // Step 2: Identify inconsistent relationships
    console.log('\n🔍 Step 2: Identifying inconsistent relationships...');
    const inconsistentRelations = [];
    const relationPairs = new Map();

    // Group relationships by member pair
    allRelations?.forEach(rel => {
      const pairKey = [rel.from_member_id, rel.to_member_id].sort().join('-');
      if (!relationPairs.has(pairKey)) {
        relationPairs.set(pairKey, []);
      }
      relationPairs.get(pairKey).push(rel);
    });

    // Check each pair for consistency
    for (const [pairKey, pairRelations] of relationPairs) {
      if (pairRelations.length === 1) {
        const rel = pairRelations[0];
        if (rel.relation_type === 'parent' || rel.relation_type === 'child') {
          inconsistentRelations.push({
            type: 'incomplete_bidirectional',
            description: `Missing reverse relationship for ${rel.relation_type}`,
            relationship: rel
          });
        }
      } else if (pairRelations.length > 2) {
        inconsistentRelations.push({
          type: 'duplicate_relationships',
          description: `Multiple relationships found for pair`,
          relationships: pairRelations
        });
      } else if (pairRelations.length === 2) {
        const [rel1, rel2] = pairRelations;
        if (rel1.relation_type === 'parent' && rel2.relation_type !== 'child') {
          inconsistentRelations.push({
            type: 'inconsistent_bidirectional',
            description: `Inconsistent bidirectional relationship`,
            relationships: [rel1, rel2]
          });
        }
        if (rel1.relation_type === 'child' && rel2.relation_type !== 'parent') {
          inconsistentRelations.push({
            type: 'inconsistent_bidirectional',
            description: `Inconsistent bidirectional relationship`,
            relationships: [rel1, rel2]
          });
        }
      }
    }

    console.log(`⚠️ Found ${inconsistentRelations.length} inconsistent relationships:`);
    inconsistentRelations.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.type}: ${issue.description}`);
    });

    // Step 3: Test the new relationship processing logic
    console.log('\n🧪 Step 3: Testing new relationship processing logic...');
    
    // Get all family members
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    // Test the corrected relationship processing logic
    const transformedMembers = allMembers.map(member => {
      const memberRelations = allRelations
        .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
        .map(rel => {
          if (rel.from_member_id === member.id) {
            let perspectiveType;
            switch (rel.relation_type) {
              case 'parent':
                perspectiveType = 'child'; // If I'm the parent, they are my child
                break;
              case 'child':
                perspectiveType = 'parent'; // If I'm the child, they are my parent
                break;
              case 'spouse':
                perspectiveType = 'spouse'; // spouse is bidirectional
                break;
              case 'sibling':
                perspectiveType = 'sibling'; // sibling is bidirectional
                break;
              default:
                perspectiveType = 'parent';
            }
            return {
              id: rel.id,
              type: perspectiveType,
              personId: rel.to_member_id,
            };
          } else {
            let reversedType;
            switch (rel.relation_type) {
              case 'parent':
                reversedType = 'child';
                break;
              case 'child':
                reversedType = 'parent';
                break;
              case 'spouse':
                reversedType = 'spouse';
                break;
              case 'sibling':
                reversedType = 'sibling';
                break;
              default:
                reversedType = 'parent';
            }
            return {
              id: rel.id,
              type: reversedType,
              personId: rel.from_member_id,
            };
          }
        });

      // Deduplicate relationships
      const deduplicatedRelations = memberRelations.reduce((acc, rel) => {
        const existingRel = acc.find(existing => existing.personId === rel.personId);
        if (!existingRel) {
          acc.push(rel);
        } else {
          if (rel.type === 'spouse' || rel.type === 'sibling') {
            return acc;
          } else {
            const thisMemberIsSource = memberRelations.find(r => 
              r.id === rel.id && r.from_member_id === member.id
            );
            if (thisMemberIsSource) {
              const index = acc.findIndex(existing => existing.personId === rel.personId);
              acc[index] = rel;
            }
          }
        }
        return acc;
      }, []);

      return {
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        birthDate: member.birth_date,
        relations: deduplicatedRelations
      };
    });

    // Test Said Ahmed's relationships specifically
    const saidAhmed = transformedMembers.find(m => m.firstName === 'Said Ahmed');
    if (saidAhmed) {
      console.log(`\n👤 Testing Said Ahmed's relationships:`);
      console.log(`📊 Said Ahmed's processed relationships:`);
      saidAhmed.relations.forEach(rel => {
        const person = transformedMembers.find(m => m.id === rel.personId);
        console.log(`  → ${person?.firstName} ${person?.lastName} (${rel.type})`);
      });

      // Check if relationships are correct
      const aliRelation = saidAhmed.relations.find(r => r.personId === '06bc5b0b-07d4-47b5-9a97-b9f33ab5ae30');
      const shafieRelation = saidAhmed.relations.find(r => r.personId === '2ad67022-c0e5-4f85-9069-2bec5b3b04c0');

      console.log(`\n🔍 Relationship validation:`);
      if (aliRelation && aliRelation.type === 'child') {
        console.log(`  ✅ Ali Ahmed relationship: CORRECT (child)`);
      } else {
        console.log(`  ❌ Ali Ahmed relationship: INCORRECT (${aliRelation?.type || 'not found'})`);
      }

      if (shafieRelation && shafieRelation.type === 'child') {
        console.log(`  ✅ Shafie Said Nurani relationship: CORRECT (child)`);
      } else {
        console.log(`  ❌ Shafie Said Nurani relationship: INCORRECT (${shafieRelation?.type || 'not found'})`);
      }
    }

    // Step 4: Test generation calculation
    console.log('\n🧪 Step 4: Testing generation calculation...');
    
    const memberMap = new Map();
    transformedMembers.forEach(member => memberMap.set(member.id, member));

    const generations = new Map();
    const memberGenerations = new Map();
    const processed = new Set();

    // Start with Said Ahmed at generation 0
    if (saidAhmed) {
      memberGenerations.set(saidAhmed.id, 0);
      if (!generations.has(0)) generations.set(0, []);
      generations.get(0).push(saidAhmed.id);

      const buildMemberGenerations = (memberId, generation) => {
        if (processed.has(memberId)) return;
        processed.add(memberId);
        
        const member = memberMap.get(memberId);
        if (!member) return;
        
        memberGenerations.set(memberId, generation);
        if (!generations.has(generation)) generations.set(generation, []);
        if (!generations.get(generation).includes(memberId)) {
          generations.get(generation).push(memberId);
        }
        
        // Process parents (go up generations)
        member.relations
          .filter(rel => rel.type === 'parent')
          .forEach(relation => {
            const parentId = relation.personId;
            if (!memberGenerations.has(parentId) || memberGenerations.get(parentId) > generation - 1) {
              memberGenerations.set(parentId, generation - 1);
              if (!generations.has(generation - 1)) generations.set(generation - 1, []);
              if (!generations.get(generation - 1).includes(parentId)) {
                generations.get(generation - 1).push(parentId);
              }
              buildMemberGenerations(parentId, generation - 1);
            }
          });
        
        // Process children (go down generations)
        member.relations
          .filter(rel => rel.type === 'child')
          .forEach(relation => {
            const childId = relation.personId;
            if (!memberGenerations.has(childId) || memberGenerations.get(childId) < generation + 1) {
              memberGenerations.set(childId, generation + 1);
              if (!generations.has(generation + 1)) generations.set(generation + 1, []);
              if (!generations.get(generation + 1).includes(childId)) {
                generations.get(generation + 1).push(childId);
              }
              buildMemberGenerations(childId, generation + 1);
            }
          });
      };

      buildMemberGenerations(saidAhmed.id, 0);

      console.log('📊 Final generation assignments:');
      for (const [generation, memberIds] of generations.entries()) {
        console.log(`  Generation ${generation}:`);
        memberIds.forEach(memberId => {
          const member = memberMap.get(memberId);
          console.log(`    - ${member?.firstName} ${member?.lastName} (b. ${member?.birthDate?.substring(0, 4)})`);
        });
      }

      // Check for generation consistency
      const aliGeneration = memberGenerations.get('06bc5b0b-07d4-47b5-9a97-b9f33ab5ae30');
      const shafieGeneration = memberGenerations.get('2ad67022-c0e5-4f85-9069-2bec5b3b04c0');
      
      console.log(`\n🔍 Generation validation:`);
      console.log(`  Ali Ahmed: Generation ${aliGeneration} (b. 1983)`);
      console.log(`  Shafie Said Nurani: Generation ${shafieGeneration} (b. 1989)`);
      
      if (aliGeneration === shafieGeneration && aliGeneration === 1) {
        console.log(`  ✅ Both children are in the same generation (correct)`);
      } else {
        console.log(`  ❌ Children are in different generations (incorrect)`);
      }
    }

    console.log('\n🎉 Restructured system test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testRestructuredSystem();
