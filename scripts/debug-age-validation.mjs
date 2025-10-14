/**
 * Debug Age Validation
 * 
 * This script debugs the age validation logic to understand
 * why the "Child cannot be older than or same age as parent" error persists.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugAgeValidation() {
  console.log('🔍 DEBUG AGE VALIDATION');
  console.log('=' .repeat(50));
  console.log('Timestamp:', new Date().toISOString());

  try {
    // Get some test members with birth dates
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, birth_date')
      .not('birth_date', 'is', null)
      .limit(5);

    if (membersError) {
      console.error('❌ Error fetching members:', membersError);
      return;
    }

    if (members.length < 2) {
      console.error('❌ Need at least 2 members with birth dates for testing');
      return;
    }

    console.log('👥 Available members with birth dates:');
    members.forEach(member => {
      const birthYear = new Date(member.birth_date).getFullYear();
      console.log(`   ${member.first_name} ${member.last_name} - Born: ${birthYear}`);
    });

    // Test different relationship scenarios
    console.log('\n📊 TESTING RELATIONSHIP SCENARIOS');
    console.log('-' .repeat(40));

    // Sort by birth date to find potential parent-child relationships
    const sortedMembers = members.sort((a, b) => new Date(a.birth_date) - new Date(b.birth_date));
    
    for (let i = 0; i < sortedMembers.length - 1; i++) {
      const potentialParent = sortedMembers[i];
      const potentialChild = sortedMembers[i + 1];
      
      const parentBirthYear = new Date(potentialParent.birth_date).getFullYear();
      const childBirthYear = new Date(potentialChild.birth_date).getFullYear();
      const ageDifference = childBirthYear - parentBirthYear;
      
      console.log(`\n🔄 Testing: ${potentialParent.first_name} (${parentBirthYear}) → ${potentialChild.first_name} (${childBirthYear})`);
      console.log(`   Age difference: ${ageDifference} years`);
      
      // Test the validation logic manually
      const fromBirthDate = new Date(potentialParent.birth_date);
      const toBirthDate = new Date(potentialChild.birth_date);
      
      console.log('   Manual validation test:');
      
      // Test 'parent' relationship type
      console.log('     Testing "parent" relationship type:');
      console.log(`       fromBirthDate: ${fromBirthDate.toISOString().split('T')[0]}`);
      console.log(`       toBirthDate: ${toBirthDate.toISOString().split('T')[0]}`);
      console.log(`       fromBirthDate >= toBirthDate: ${fromBirthDate >= toBirthDate}`);
      if (fromBirthDate >= toBirthDate) {
        console.log('       ❌ Would trigger: "Parent cannot be younger than or same age as child"');
      } else {
        console.log('       ✅ Valid parent-child relationship');
      }
      
      // Test 'child' relationship type
      console.log('     Testing "child" relationship type:');
      console.log(`       fromBirthDate <= toBirthDate: ${fromBirthDate <= toBirthDate}`);
      if (fromBirthDate <= toBirthDate) {
        console.log('       ❌ Would trigger: "Child cannot be older than or same age as parent"');
      } else {
        console.log('       ✅ Valid child-parent relationship');
      }
    }

    // Test the exact scenario that's failing
    console.log('\n📊 TESTING EXACT FAILING SCENARIO');
    console.log('-' .repeat(40));
    
    // Find the oldest and youngest members
    const oldestMember = sortedMembers[0];
    const youngestMember = sortedMembers[sortedMembers.length - 1];
    
    console.log(`🔄 Testing exact scenario: ${oldestMember.first_name} (${new Date(oldestMember.birth_date).getFullYear()}) → ${youngestMember.first_name} (${new Date(youngestMember.birth_date).getFullYear()})`);
    
    const oldestBirthDate = new Date(oldestMember.birth_date);
    const youngestBirthDate = new Date(youngestMember.birth_date);
    
    console.log('   Birth date comparison:');
    console.log(`     Oldest: ${oldestBirthDate.toISOString().split('T')[0]}`);
    console.log(`     Youngest: ${youngestBirthDate.toISOString().split('T')[0]}`);
    console.log(`     Oldest < Youngest: ${oldestBirthDate < youngestBirthDate}`);
    
    // Test what happens when we try to create a parent-child relationship
    console.log('\n   Testing relationship creation:');
    
    // Scenario 1: Oldest as parent, youngest as child (should be valid)
    console.log('     Scenario 1: Oldest as parent, youngest as child');
    console.log(`       fromBirthDate (oldest) >= toBirthDate (youngest): ${oldestBirthDate >= youngestBirthDate}`);
    if (oldestBirthDate >= youngestBirthDate) {
      console.log('       ❌ Would fail: "Parent cannot be younger than or same age as child"');
    } else {
      console.log('       ✅ Would pass validation');
    }
    
    // Scenario 2: Youngest as parent, oldest as child (should be invalid)
    console.log('     Scenario 2: Youngest as parent, oldest as child');
    console.log(`       fromBirthDate (youngest) >= toBirthDate (oldest): ${youngestBirthDate >= oldestBirthDate}`);
    if (youngestBirthDate >= oldestBirthDate) {
      console.log('       ❌ Would fail: "Parent cannot be younger than or same age as child"');
    } else {
      console.log('       ✅ Would pass validation');
    }

    // Test the relationship type interpretation
    console.log('\n📊 TESTING RELATIONSHIP TYPE INTERPRETATION');
    console.log('-' .repeat(40));
    
    console.log('🔍 Understanding relationship type semantics:');
    console.log('   When we say "relationshipType = parent":');
    console.log('     - fromMember is the parent');
    console.log('     - toMember is the child');
    console.log('     - Parent should be born before child');
    console.log('     - Validation: fromBirthDate < toBirthDate');
    console.log('');
    console.log('   When we say "relationshipType = child":');
    console.log('     - fromMember is the child');
    console.log('     - toMember is the parent');
    console.log('     - Child should be born after parent');
    console.log('     - Validation: fromBirthDate > toBirthDate');

    console.log('\n🎯 DEBUG COMPLETE');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugAgeValidation();
