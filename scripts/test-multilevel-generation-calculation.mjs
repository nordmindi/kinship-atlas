import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMultilevelGenerationCalculation() {
  console.log('🧪 Testing multi-level generation calculation...');

  try {
    // Get all family members
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    // Get all relations
    const { data: relationsData, error: relationsError } = await supabase
      .from('relations')
      .select('id, from_member_id, to_member_id, relation_type');

    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError);
      return;
    }

    // Simulate the getFamilyMembers processing
    const transformedMembers = allMembers.map(member => {
      // Find all relations where this member is involved (both directions)
      const allRelations = relationsData
        .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
        .map(rel => {
          // If this member is the "from" person, reverse the relation type to get the perspective
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
            // If this member is the "to" person, reverse the relation type
            let reversedType;
            switch (rel.relation_type) {
              case 'parent':
                reversedType = 'child';
                break;
              case 'child':
                reversedType = 'parent';
                break;
              case 'spouse':
                reversedType = 'spouse'; // spouse is bidirectional
                break;
              case 'sibling':
                reversedType = 'sibling'; // sibling is bidirectional
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

      // Deduplicate relationships by personId
      const memberRelations = allRelations.reduce((acc, rel) => {
        const existingRel = acc.find(existing => existing.personId === rel.personId);
        if (!existingRel) {
          acc.push(rel);
        } else {
          if (rel.type === 'spouse' || rel.type === 'sibling') {
            return acc;
          } else {
            const thisMemberIsSource = relationsData.find(r => 
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
        relations: memberRelations
      };
    });

    // Find Said Ahmed as root
    const saidAhmed = transformedMembers.find(m => m.firstName === 'Said Ahmed');
    if (!saidAhmed) {
      console.error('❌ Said Ahmed not found');
      return;
    }

    console.log('👤 Root member:', saidAhmed.firstName, saidAhmed.lastName);
    console.log('📊 Said Ahmed\'s processed relationships:');
    saidAhmed.relations.forEach(rel => {
      const person = transformedMembers.find(m => m.id === rel.personId);
      console.log(`  → ${person?.firstName} ${person?.lastName} (${rel.type})`);
    });

    // Simulate generation calculation
    const memberMap = new Map();
    transformedMembers.forEach(member => memberMap.set(member.id, member));

    const generations = new Map();
    const memberGenerations = new Map();
    const processed = new Set();

    // Start with Said Ahmed at generation 0
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
      
      console.log(`\n🔍 Processing ${member.firstName} ${member.lastName} at generation ${generation}:`);
      
      // Process parents (go up generations)
      member.relations
        .filter(rel => rel.type === 'parent')
        .forEach(relation => {
          const parentId = relation.personId;
          const parent = memberMap.get(parentId);
          console.log(`  👴 Parent: ${parent?.firstName} ${parent?.lastName}`);
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
          const child = memberMap.get(childId);
          console.log(`  👶 Child: ${child?.firstName} ${child?.lastName}`);
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

    console.log('\n📊 Final generation assignments:');
    for (const [generation, memberIds] of generations.entries()) {
      console.log(`  Generation ${generation}:`);
      memberIds.forEach(memberId => {
        const member = memberMap.get(memberId);
        console.log(`    - ${member?.firstName} ${member?.lastName} (b. ${member?.birthDate?.substring(0, 4)})`);
      });
    }

    // Check for inconsistencies
    console.log('\n🔍 Checking for generation inconsistencies:');
    const aliAhmed = transformedMembers.find(m => m.firstName === 'Ali');
    const shafie = transformedMembers.find(m => m.firstName === 'Shafie');
    
    if (aliAhmed && shafie) {
      const aliGeneration = memberGenerations.get(aliAhmed.id);
      const shafieGeneration = memberGenerations.get(shafie.id);
      
      console.log(`  Ali Ahmed: Generation ${aliGeneration} (b. ${aliAhmed.birthDate?.substring(0, 4)})`);
      console.log(`  Shafie Said Nurani: Generation ${shafieGeneration} (b. ${shafie.birthDate?.substring(0, 4)})`);
      
      if (aliGeneration === shafieGeneration) {
        console.log('  ✅ Both children are in the same generation (correct)');
      } else {
        console.log('  ❌ Children are in different generations (incorrect)');
      }
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testMultilevelGenerationCalculation();
