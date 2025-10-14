import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRelationshipCreationFlow() {
  console.log('🧪 Testing relationship creation flow...');

  try {
    // Get family member IDs
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    const saidAhmed = members.find(m => m.first_name === 'Said Ahmed');
    const shafie = members.find(m => m.first_name === 'Shafie');

    if (!saidAhmed || !shafie) {
      console.error('❌ Could not find Said Ahmed or Shafie');
      return;
    }

    console.log('👤 Test subjects:');
    console.log(`  Said Ahmed: ${saidAhmed.id}`);
    console.log(`  Shafie: ${shafie.id}`);

    // Simulate the drag-to-connect scenario
    console.log('\n🔗 Simulating drag-to-connect scenario:');
    console.log('  User drags from Said Ahmed\'s child-source handle to Shafie\'s parent-target handle');
    console.log('  Expected: Said Ahmed should be parent of Shafie');
    console.log('  Logic: sourceHandle="child-source", targetHandle="parent-target" → relationshipType="parent"');

    // Simulate the addRelation call
    const fromId = saidAhmed.id;
    const toId = shafie.id;
    const relationType = 'parent'; // This is what the current logic produces

    console.log('\n📝 Simulating addRelation call:');
    console.log(`  addRelation("${fromId}", "${toId}", "${relationType}")`);
    console.log(`  This creates: Said Ahmed → Shafie (parent)`);
    console.log(`  And reverse: Shafie → Said Ahmed (child)`);

    // Check what the current database shows
    console.log('\n🔍 Current database state:');
    const { data: currentRelations, error: relError } = await supabase
      .from('relations')
      .select('*')
      .or(`from_member_id.eq.${saidAhmed.id},to_member_id.eq.${saidAhmed.id}`)
      .or(`from_member_id.eq.${shafie.id},to_member_id.eq.${shafie.id}`);

    if (relError) {
      console.error('❌ Error fetching relations:', relError);
      return;
    }

    console.log('  Current relationships:');
    currentRelations.forEach(rel => {
      const fromMember = members.find(m => m.id === rel.from_member_id);
      const toMember = members.find(m => m.id === rel.to_member_id);
      console.log(`    ${fromMember?.first_name} → ${toMember?.first_name} (${rel.relation_type})`);
    });

    // Analyze the problem
    console.log('\n🔍 ANALYSIS:');
    const saidToShafie = currentRelations.find(rel => 
      rel.from_member_id === saidAhmed.id && rel.to_member_id === shafie.id
    );
    const shafieToSaid = currentRelations.find(rel => 
      rel.from_member_id === shafie.id && rel.to_member_id === saidAhmed.id
    );

    if (saidToShafie && shafieToSaid) {
      console.log(`  Said Ahmed → Shafie: ${saidToShafie.relation_type}`);
      console.log(`  Shafie → Said Ahmed: ${shafieToSaid.relation_type}`);
      
      if (saidToShafie.relation_type === 'parent' && shafieToSaid.relation_type === 'child') {
        console.log('  ✅ CORRECT: Said Ahmed is parent of Shafie');
      } else if (saidToShafie.relation_type === 'child' && shafieToSaid.relation_type === 'parent') {
        console.log('  ❌ INCORRECT: Shafie is parent of Said Ahmed (REVERSED!)');
      } else {
        console.log('  ❓ UNEXPECTED: Relationship types are not parent/child pair');
      }
    } else {
      console.log('  ❌ No bidirectional relationship found');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testRelationshipCreationFlow();
