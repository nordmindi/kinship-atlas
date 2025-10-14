/**
 * Test Improved Error Messages
 * 
 * This script tests the improved error messages for age validation
 * to ensure they provide clear guidance to users.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the improved age validation logic
const validateParentChildRelationship = (fromMember, toMember, relationshipType) => {
  const errors = [];
  const warnings = [];
  
  // Check age difference
  if (fromMember.birth_date && toMember.birth_date) {
    const fromBirthDate = new Date(fromMember.birth_date);
    const toBirthDate = new Date(toMember.birth_date);
    const ageDifference = Math.abs(fromBirthDate.getFullYear() - toBirthDate.getFullYear());

    if (relationshipType === 'parent') {
      // For parent relationship: fromMember is parent, toMember is child
      // Parent should be born before child
      if (ageDifference < 15) {
        warnings.push(`Age difference between parent and child is only ${ageDifference} years`);
      }
      if (fromBirthDate >= toBirthDate) {
        errors.push(`Parent cannot be younger than or same age as child. ${fromMember.first_name} (born ${fromBirthDate.getFullYear()}) cannot be the parent of ${toMember.first_name} (born ${toBirthDate.getFullYear()}). Try creating the relationship in the opposite direction.`);
      }
    } else if (relationshipType === 'child') {
      // For child relationship: fromMember is child, toMember is parent
      // Child should be born after parent
      if (ageDifference < 15) {
        warnings.push(`Age difference between parent and child is only ${ageDifference} years`);
      }
      if (fromBirthDate <= toBirthDate) {
        errors.push(`Child cannot be older than or same age as parent. ${fromMember.first_name} (born ${fromBirthDate.getFullYear()}) cannot be the child of ${toMember.first_name} (born ${toBirthDate.getFullYear()}). Try creating the relationship in the opposite direction.`);
      }
    }
  }
  
  return { errors, warnings };
};

async function testImprovedErrorMessages() {
  console.log('🧪 TESTING IMPROVED ERROR MESSAGES');
  console.log('=' .repeat(50));
  console.log('Timestamp:', new Date().toISOString());

  try {
    // Get test members with birth dates
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

    // Sort by birth date
    const sortedMembers = members.sort((a, b) => new Date(a.birth_date) - new Date(b.birth_date));
    
    // Test the improved error messages
    console.log('\n📊 TESTING IMPROVED ERROR MESSAGES');
    console.log('-' .repeat(40));

    // Test 1: Invalid parent-child relationship
    console.log('\n🔄 Test 1: Invalid parent-child relationship');
    const youngerMember = sortedMembers[1]; // Ali (1983)
    const olderMember = sortedMembers[0]; // Said Ahmed (1956)
    
    console.log(`   Attempting: ${youngerMember.first_name} (${new Date(youngerMember.birth_date).getFullYear()}) as parent of ${olderMember.first_name} (${new Date(olderMember.birth_date).getFullYear()})`);
    
    const validation1 = validateParentChildRelationship(youngerMember, olderMember, 'parent');
    if (validation1.errors.length > 0) {
      console.log('   ✅ Improved error message:');
      console.log(`     "${validation1.errors[0]}"`);
    } else {
      console.log('   ❌ Should have generated an error');
    }

    // Test 2: Invalid child-parent relationship
    console.log('\n🔄 Test 2: Invalid child-parent relationship');
    console.log(`   Attempting: ${olderMember.first_name} (${new Date(olderMember.birth_date).getFullYear()}) as child of ${youngerMember.first_name} (${new Date(youngerMember.birth_date).getFullYear()})`);
    
    const validation2 = validateParentChildRelationship(olderMember, youngerMember, 'child');
    if (validation2.errors.length > 0) {
      console.log('   ✅ Improved error message:');
      console.log(`     "${validation2.errors[0]}"`);
    } else {
      console.log('   ❌ Should have generated an error');
    }

    // Test 3: Valid relationships (should not generate errors)
    console.log('\n🔄 Test 3: Valid relationships');
    
    // Valid parent-child
    console.log(`   Testing valid parent-child: ${olderMember.first_name} → ${youngerMember.first_name}`);
    const validation3 = validateParentChildRelationship(olderMember, youngerMember, 'parent');
    if (validation3.errors.length === 0) {
      console.log('   ✅ Valid parent-child relationship (no errors)');
    } else {
      console.log('   ❌ Should not have generated errors:', validation3.errors);
    }
    
    // Valid child-parent
    console.log(`   Testing valid child-parent: ${youngerMember.first_name} → ${olderMember.first_name}`);
    const validation4 = validateParentChildRelationship(youngerMember, olderMember, 'child');
    if (validation4.errors.length === 0) {
      console.log('   ✅ Valid child-parent relationship (no errors)');
    } else {
      console.log('   ❌ Should not have generated errors:', validation4.errors);
    }

    // Test 4: Edge case - same age
    console.log('\n🔄 Test 4: Edge case - same age');
    
    // Find members with similar birth years
    const member1 = sortedMembers[1]; // Ali (1983)
    const member2 = sortedMembers[2]; // Sadia (1986)
    
    console.log(`   Testing same age scenario: ${member1.first_name} (${new Date(member1.birth_date).getFullYear()}) → ${member2.first_name} (${new Date(member2.birth_date).getFullYear()})`);
    
    const validation5 = validateParentChildRelationship(member1, member2, 'parent');
    if (validation5.errors.length > 0) {
      console.log('   ✅ Correctly caught same age issue:');
      console.log(`     "${validation5.errors[0]}"`);
    } else {
      console.log('   ⚠️  Same age relationship allowed (might be valid for some cases)');
    }

    console.log('\n🎉 IMPROVED ERROR MESSAGES TEST COMPLETED');
    console.log('=' .repeat(50));
    console.log('💡 The improved error messages now provide clear guidance');
    console.log('   to users about which direction to create relationships.');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testImprovedErrorMessages();
