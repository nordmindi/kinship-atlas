import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDoubleReversal() {
  console.log('🧪 Testing double reversal problem...');

  try {
    // Get Said Ahmed's ID
    const { data: saidAhmed, error: saidError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name')
      .eq('first_name', 'Said Ahmed')
      .single();

    if (saidError) {
      console.error('❌ Error finding Said Ahmed:', saidError);
      return;
    }

    // Get all relations involving Said Ahmed
    const { data: relationsData, error: relationsError } = await supabase
      .from('relations')
      .select('id, from_member_id, to_member_id, relation_type');

    if (relationsError) {
      console.error('❌ Error fetching relations:', relationsError);
      return;
    }

    // Get all family members for names
    const { data: allMembers, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    const memberMap = new Map();
    allMembers.forEach(member => {
      memberMap.set(member.id, `${member.first_name} ${member.last_name}`);
    });

    console.log('👤 Testing for Said Ahmed:', saidAhmed.first_name, saidAhmed.last_name);
    console.log('📊 Said Ahmed ID:', saidAhmed.id);

    // Simulate the getFamilyMembers processing for Said Ahmed
    const member = saidAhmed;
    
    // Find all relations where this member is involved (both directions)
    const allRelations = relationsData
      .filter(rel => rel.from_member_id === member.id || rel.to_member_id === member.id)
      .map(rel => {
        const fromName = memberMap.get(rel.from_member_id) || rel.from_member_id;
        const toName = memberMap.get(rel.to_member_id) || rel.to_member_id;
        
        console.log(`\n🔍 Processing relationship: ${fromName} → ${toName} (${rel.relation_type})`);
        
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
          
          console.log(`  📝 Said Ahmed is FROM person, relation_type="${rel.relation_type}"`);
          console.log(`  🔄 Transformed to perspectiveType="${perspectiveType}"`);
          console.log(`  📋 Result: Said Ahmed sees ${toName} as ${perspectiveType}`);
          
          return {
            id: rel.id,
            type: perspectiveType,
            personId: rel.to_member_id,
            direction: 'from'
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
          
          console.log(`  📝 Said Ahmed is TO person, relation_type="${rel.relation_type}"`);
          console.log(`  🔄 Transformed to reversedType="${reversedType}"`);
          console.log(`  📋 Result: Said Ahmed sees ${fromName} as ${reversedType}`);
          
          return {
            id: rel.id,
            type: reversedType,
            personId: rel.from_member_id,
            direction: 'to'
          };
        }
      });

    console.log('\n🎯 Final processed relationships from Said Ahmed\'s perspective:');
    allRelations.forEach(rel => {
      const personName = memberMap.get(rel.personId);
      console.log(`  Said Ahmed → ${personName} (${rel.type})`);
    });

    // Check if the relationships make sense
    const childRelations = allRelations.filter(rel => rel.type === 'child');
    const parentRelations = allRelations.filter(rel => rel.type === 'parent');
    
    console.log('\n📊 Summary:');
    console.log(`  Children: ${childRelations.length}`);
    console.log(`  Parents: ${parentRelations.length}`);
    
    if (childRelations.length > 0) {
      console.log('  👶 Said Ahmed\'s children:');
      childRelations.forEach(rel => {
        const personName = memberMap.get(rel.personId);
        console.log(`    - ${personName}`);
      });
    }
    
    if (parentRelations.length > 0) {
      console.log('  👴 Said Ahmed\'s parents:');
      parentRelations.forEach(rel => {
        const personName = memberMap.get(rel.personId);
        console.log(`    - ${personName}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testDoubleReversal();
