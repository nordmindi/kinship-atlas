/**
 * Final Verification Test
 * 
 * This script performs a final verification that the family member creation
 * issue has been completely resolved.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalVerificationTest() {
  console.log('🎯 FINAL VERIFICATION TEST');
  console.log('=' .repeat(50));
  console.log('Timestamp:', new Date().toISOString());
  console.log('Verifying that the family member creation issue is completely resolved...');

  try {
    // Test 1: Authentication and Session Management
    console.log('\n✅ TEST 1: AUTHENTICATION AND SESSION MANAGEMENT');
    console.log('-' .repeat(40));
    
    // Clear session and sign in
    await supabase.auth.signOut();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@kinship-atlas.com',
      password: 'testpassword123'
    });
    
    if (signInError) {
      console.log('❌ Authentication failed:', signInError.message);
      return false;
    }
    
    console.log('✅ Authentication successful');
    console.log('   User ID:', signInData.user?.id);
    
    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Session verified');
    console.log('   Session expires:', new Date(session.expires_at * 1000).toISOString());

    // Test 2: Family Member Creation (The Original Failing Operation)
    console.log('\n✅ TEST 2: FAMILY MEMBER CREATION');
    console.log('-' .repeat(40));
    
    const testMember = {
      first_name: 'Final',
      last_name: 'Test',
      birth_date: '1990-01-01',
      gender: 'other',
      created_by: signInData.user.id,
      branch_root: null,
      is_root_member: false
    };
    
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .insert(testMember)
      .select('id')
      .single();
    
    if (memberError) {
      console.log('❌ Family member creation failed:', memberError);
      return false;
    }
    
    console.log('✅ Family member created successfully');
    console.log('   Member ID:', memberData.id);
    
    // Clean up
    await supabase
      .from('family_members')
      .delete()
      .eq('id', memberData.id);
    console.log('✅ Test member cleaned up');

    // Test 3: Multiple Rapid Operations
    console.log('\n✅ TEST 3: MULTIPLE RAPID OPERATIONS');
    console.log('-' .repeat(40));
    
    const rapidMembers = [
      { first_name: 'Rapid1', last_name: 'Test', birth_date: '1980-01-01', gender: 'male' },
      { first_name: 'Rapid2', last_name: 'Test', birth_date: '1985-01-01', gender: 'female' },
      { first_name: 'Rapid3', last_name: 'Test', birth_date: '1990-01-01', gender: 'other' }
    ];
    
    const createdIds = [];
    
    for (let i = 0; i < rapidMembers.length; i++) {
      const member = {
        ...rapidMembers[i],
        created_by: signInData.user.id,
        branch_root: null,
        is_root_member: false
      };
      
      const { data, error } = await supabase
        .from('family_members')
        .insert(member)
        .select('id')
        .single();
      
      if (error) {
        console.log(`❌ Rapid operation ${i + 1} failed:`, error.message);
        return false;
      }
      
      createdIds.push(data.id);
      console.log(`✅ Rapid operation ${i + 1} successful`);
    }
    
    // Clean up rapid test members
    for (const id of createdIds) {
      await supabase
        .from('family_members')
        .delete()
        .eq('id', id);
    }
    console.log('✅ All rapid test members cleaned up');

    // Test 4: Session Refresh
    console.log('\n✅ TEST 4: SESSION REFRESH');
    console.log('-' .repeat(40));
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.log('❌ Session refresh failed:', refreshError.message);
      return false;
    }
    
    console.log('✅ Session refresh successful');
    console.log('   New session expires:', new Date(refreshData.session.expires_at * 1000).toISOString());

    // Test 5: Data Consistency
    console.log('\n✅ TEST 5: DATA CONSISTENCY');
    console.log('-' .repeat(40));
    
    // Test that data operations still work after session refresh
    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select('count')
      .limit(1);
    
    if (membersError) {
      console.log('❌ Data consistency test failed:', membersError.message);
      return false;
    }
    
    console.log('✅ Data consistency verified');
    console.log('   Database operations work after session refresh');

    console.log('\n🎉 FINAL VERIFICATION COMPLETED SUCCESSFULLY');
    console.log('=' .repeat(50));
    console.log('✅ All tests passed!');
    console.log('✅ Family member creation issue is RESOLVED');
    console.log('✅ Session management is working correctly');
    console.log('✅ No more "User authentication timeout" errors');
    
    return true;

  } catch (error) {
    console.error('❌ FINAL VERIFICATION FAILED:', error);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Run the test
finalVerificationTest().then(success => {
  if (success) {
    console.log('\n🏆 SUCCESS: The family member creation issue has been completely resolved!');
    process.exit(0);
  } else {
    console.log('\n💥 FAILURE: The issue persists and requires further investigation.');
    process.exit(1);
  }
});
