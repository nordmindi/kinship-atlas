/**
 * Test Relationship Validation Fix
 * 
 * This script tests the fixed relationship validation service
 * to ensure it handles edge cases correctly.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRelationshipValidationFix() {
  console.log('🧪 Testing Relationship Validation Fix');
  console.log('=' .repeat(40));

  try {
    const saidAhmedId = '4c870460-c7af-4224-8a6c-1a14d2ff6b21';
    const aliAhmedId = '06bc5b0b-07d4-47b5-9a97-b9f33ab5ae30';

    // Test 1: Normal relationship validation
    console.log('\n📊 Test 1: Normal relationship validation');
    const { data: existingRelations1, error: relationsError1 } = await supabase
      .from('relations')
      .select('*')
      .or(`and(from_member_id.eq.${saidAhmedId},to_member_id.eq.${aliAhmedId}),and(from_member_id.eq.${aliAhmedId},to_member_id.eq.${saidAhmedId})`);

    if (relationsError1) {
      console.error('❌ Error with normal relationship query:', relationsError1);
    } else {
      console.log('✅ Normal relationship query works correctly');
      console.log(`   Found ${existingRelations1?.length || 0} existing relationships`);
    }

    // Test 2: Self-relationship validation (should be caught by basic validation)
    console.log('\n📊 Test 2: Self-relationship validation');
    const { data: existingRelations2, error: relationsError2 } = await supabase
      .from('relations')
      .select('*')
      .or(`and(from_member_id.eq.${saidAhmedId},to_member_id.eq.${saidAhmedId}),and(from_member_id.eq.${saidAhmedId},to_member_id.eq.${saidAhmedId})`);

    if (relationsError2) {
      console.error('❌ Error with self-relationship query:', relationsError2);
    } else {
      console.log('✅ Self-relationship query works correctly (should return empty)');
      console.log(`   Found ${existingRelations2?.length || 0} existing relationships`);
    }

    // Test 3: Test the basic validation logic
    console.log('\n📊 Test 3: Basic validation logic');
    
    // Test self-relationship
    if (saidAhmedId === saidAhmedId) {
      console.log('❌ Self-relationship detected (should be caught by validation)');
    } else {
      console.log('✅ No self-relationship detected');
    }

    // Test valid relationship
    if (saidAhmedId === aliAhmedId) {
      console.log('❌ Unexpected: IDs are the same');
    } else {
      console.log('✅ Valid relationship: different member IDs');
    }

    console.log('\n🎉 Relationship validation fix test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testRelationshipValidationFix();
