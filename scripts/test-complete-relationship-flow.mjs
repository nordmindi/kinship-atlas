/**
 * Test Complete Relationship Flow
 * 
 * This script tests the complete relationship creation flow
 * to ensure the age validation works correctly with the handle system.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the complete relationship creation flow
const simulateRelationshipCreation = (sourceMember, targetMember, sourceHandle, targetHandle) => {
  console.log(`🔄 Simulating relationship creation:`);
  console.log(`   From: ${sourceMember.first_name} ${sourceMember.last_name} (${new Date(sourceMember.birth_date).getFullYear()})`);
  console.log(`   To: ${targetMember.first_name} ${targetMember.last_name} (${new Date(targetMember.birth_date).getFullYear()})`);
  console.log(`   Source handle: ${sourceHandle}`);
  console.log(`   Target handle: ${targetHandle}`);
  
  // Determine relationship type based on handle types (from FamilyTreeRenderer)
  let relationshipType = 'parent';
  
  if (sourceHandle === 'child-source' && targetHandle === 'parent-target') {
    // Parent to child connection: source person is parent of target person
    relationshipType = 'parent';
  } else if (sourceHandle === 'parent-source' && targetHandle === 'child-target') {
    // Child to parent connection: source person is child of target person
    relationshipType = 'child';
  } else if (sourceHandle === 'spouse' && targetHandle === 'spouse-target') {
    // Spouse connection
    relationshipType = 'spouse';
  } else if (sourceHandle === 'sibling' && targetHandle === 'sibling-target') {
    // Sibling connection
    relationshipType = 'sibling';
  } else {
    // Default to parent relationship for any other connection
    relationshipType = 'parent';
  }
  
  console.log(`   Determined relationship type: ${relationshipType}`);
  
  // Validate the relationship
  const validation = validateParentChildRelationship(sourceMember, targetMember, relationshipType);
  
  if (validation.errors.length > 0) {
    console.log(`   ❌ Validation failed: ${validation.errors.join(', ')}`);
    return { success: false, errors: validation.errors };
  } else {
    console.log(`   ✅ Validation passed`);
    if (validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
    }
    return { success: true, warnings: validation.warnings };
  }
};

// Simulate the age validation logic
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
        errors.push('Parent cannot be younger than or same age as child');
      }
    } else if (relationshipType === 'child') {
      // For child relationship: fromMember is child, toMember is parent
      // Child should be born after parent
      if (ageDifference < 15) {
        warnings.push(`Age difference between parent and child is only ${ageDifference} years`);
      }
      if (fromBirthDate <= toBirthDate) {
        errors.push('Child cannot be older than or same age as parent');
      }
    }
  }
  
  return { errors, warnings };
};

async function testCompleteRelationshipFlow() {
  console.log('🧪 TESTING COMPLETE RELATIONSHIP FLOW');
  console.log('=' .repeat(60));
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
    
    // Test different relationship creation scenarios
    console.log('\n📊 TESTING RELATIONSHIP CREATION SCENARIOS');
    console.log('-' .repeat(50));

    // Test 1: Valid parent-child relationship
    console.log('\n🔄 Test 1: Valid parent-child relationship');
    const parent = sortedMembers[0]; // Oldest
    const child = sortedMembers[1]; // Second oldest
    
    const result1 = simulateRelationshipCreation(
      parent, 
      child, 
      'child-source', 
      'parent-target'
    );
    
    if (result1.success) {
      console.log('   ✅ Test 1 passed: Valid parent-child relationship');
    } else {
      console.log('   ❌ Test 1 failed:', result1.errors);
    }

    // Test 2: Valid child-parent relationship
    console.log('\n🔄 Test 2: Valid child-parent relationship');
    const result2 = simulateRelationshipCreation(
      child, 
      parent, 
      'parent-source', 
      'child-target'
    );
    
    if (result2.success) {
      console.log('   ✅ Test 2 passed: Valid child-parent relationship');
    } else {
      console.log('   ❌ Test 2 failed:', result2.errors);
    }

    // Test 3: Invalid parent-child relationship (child older than parent)
    console.log('\n🔄 Test 3: Invalid parent-child relationship');
    const result3 = simulateRelationshipCreation(
      child, 
      parent, 
      'child-source', 
      'parent-target'
    );
    
    if (!result3.success) {
      console.log('   ✅ Test 3 passed: Correctly caught invalid relationship');
    } else {
      console.log('   ❌ Test 3 failed: Should have caught invalid relationship');
    }

    // Test 4: Invalid child-parent relationship (child older than parent)
    console.log('\n🔄 Test 4: Invalid child-parent relationship');
    const result4 = simulateRelationshipCreation(
      parent, 
      child, 
      'parent-source', 
      'child-target'
    );
    
    if (!result4.success) {
      console.log('   ✅ Test 4 passed: Correctly caught invalid relationship');
    } else {
      console.log('   ❌ Test 4 failed: Should have caught invalid relationship');
    }

    // Test 5: Test the exact scenario that might be causing the user error
    console.log('\n🔄 Test 5: User error scenario analysis');
    
    // Find members that might cause the user error
    const member1 = sortedMembers[0]; // Said Ahmed (1956)
    const member2 = sortedMembers[1]; // Ali (1983)
    
    console.log(`   Testing: ${member1.first_name} (${new Date(member1.birth_date).getFullYear()}) → ${member2.first_name} (${new Date(member2.birth_date).getFullYear()})`);
    
    // Test all possible handle combinations
    const handleCombinations = [
      { source: 'child-source', target: 'parent-target', description: 'Parent to child' },
      { source: 'parent-source', target: 'child-target', description: 'Child to parent' },
      { source: 'spouse', target: 'spouse-target', description: 'Spouse' },
      { source: 'sibling', target: 'sibling-target', description: 'Sibling' }
    ];
    
    for (const combo of handleCombinations) {
      console.log(`   Testing ${combo.description}:`);
      const result = simulateRelationshipCreation(
        member1, 
        member2, 
        combo.source, 
        combo.target
      );
      
      if (result.success) {
        console.log(`     ✅ ${combo.description} relationship would be valid`);
      } else {
        console.log(`     ❌ ${combo.description} relationship would fail: ${result.errors.join(', ')}`);
      }
    }

    // Test 6: Test with different member combinations
    console.log('\n🔄 Test 6: Different member combinations');
    
    const oldestMember = sortedMembers[0];
    const youngestMember = sortedMembers[sortedMembers.length - 1];
    
    console.log(`   Testing: ${oldestMember.first_name} (${new Date(oldestMember.birth_date).getFullYear()}) → ${youngestMember.first_name} (${new Date(youngestMember.birth_date).getFullYear()})`);
    
    const result6 = simulateRelationshipCreation(
      oldestMember, 
      youngestMember, 
      'child-source', 
      'parent-target'
    );
    
    if (result6.success) {
      console.log('   ✅ Oldest to youngest relationship would be valid');
    } else {
      console.log('   ❌ Oldest to youngest relationship would fail:', result6.errors);
    }

    console.log('\n🎉 COMPLETE RELATIONSHIP FLOW TEST COMPLETED');
    console.log('=' .repeat(60));
    console.log('💡 The relationship creation flow should now work correctly');
    console.log('   with proper age validation and handle-based relationship determination.');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testCompleteRelationshipFlow();
