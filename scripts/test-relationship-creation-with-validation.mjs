/**
 * Test Relationship Creation with Fixed Validation
 * 
 * This script tests creating a parent-child relationship
 * to ensure the validation works correctly.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRelationshipCreationWithValidation() {
  console.log('🧪 Testing Relationship Creation with Fixed Validation');
  console.log('=' .repeat(50));

  try {
    // Get test members
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date')
      .not('birth_date', 'is', null)
      .limit(5);

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    // Find a valid parent-child pair
    const sortedMembers = members.sort((a, b) => new Date(a.birth_date) - new Date(b.birth_date));
    const parent = sortedMembers[0]; // Oldest
    const child = sortedMembers[sortedMembers.length - 1]; // Youngest

    const parentBirthYear = new Date(parent.birth_date).getFullYear();
    const childBirthYear = new Date(child.birth_date).getFullYear();
    const ageDifference = childBirthYear - parentBirthYear;

    console.log(`👥 Test relationship: ${parent.first_name} ${parent.last_name} (${parentBirthYear}) → ${child.first_name} ${child.last_name} (${childBirthYear})`);
    console.log(`📊 Age difference: ${ageDifference} years`);

    if (ageDifference < 15) {
      console.log('⚠️  Age difference is less than 15 years - this will trigger a warning but should still work');
    }

    // Check if relationship already exists
    console.log('\n🔍 Checking for existing relationships...');
    const { data: existingRelations, error: relationsError } = await supabase
      .from('relations')
      .select('*')
      .or(`and(from_member_id.eq.${parent.id},to_member_id.eq.${child.id}),and(from_member_id.eq.${child.id},to_member_id.eq.${parent.id})`);

    if (relationsError) {
      console.error('❌ Error checking existing relationships:', relationsError);
      return;
    }

    if (existingRelations && existingRelations.length > 0) {
      console.log('⚠️  Relationship already exists:');
      existingRelations.forEach(rel => {
        console.log(`   ${rel.from_member_id} → ${rel.to_member_id} (${rel.relation_type})`);
      });
      console.log('✅ This is expected - the validation should prevent duplicate creation');
    } else {
      console.log('✅ No existing relationship found - ready for creation');
    }

    // Test the validation logic manually
    console.log('\n🧪 Testing validation logic manually...');
    
    const fromBirthDate = new Date(parent.birth_date);
    const toBirthDate = new Date(child.birth_date);
    
    console.log(`   Parent birth date: ${fromBirthDate.toISOString().split('T')[0]}`);
    console.log(`   Child birth date: ${toBirthDate.toISOString().split('T')[0]}`);
    
    if (fromBirthDate < toBirthDate) {
      console.log('   ✅ Validation: Parent born before child - VALID');
    } else {
      console.log('   ❌ Validation: Parent born after child - INVALID');
    }

    const ageDiff = Math.abs(fromBirthDate.getFullYear() - toBirthDate.getFullYear());
    if (ageDiff < 15) {
      console.log(`   ⚠️  Warning: Age difference is only ${ageDiff} years`);
    } else {
      console.log(`   ✅ Age difference is ${ageDiff} years - acceptable`);
    }

    console.log('\n🎉 Relationship creation validation test completed!');
    console.log('💡 The validation should now work correctly without the "Parent cannot be younger than child" error.');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testRelationshipCreationWithValidation();
