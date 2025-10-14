/**
 * Test Session Fix
 * 
 * This script tests the session validation and refresh mechanism
 * to ensure the family member creation issue is resolved.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the validateAndRefreshSession function
const validateAndRefreshSession = async () => {
  try {
    console.log('🔐 Validating and refreshing session...');
    
    // First, try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError);
      return null;
    }
    
    if (!session) {
      console.log('❌ No session found');
      return null;
    }
    
    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at * 1000);
    
    if (now >= expiresAt) {
      console.log('⚠️ Session expired, attempting refresh...');
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.log('❌ Session refresh failed:', refreshError);
        return null;
      }
      
      if (!refreshData.session) {
        console.log('❌ No session after refresh');
        return null;
      }
      
      console.log('✅ Session refreshed successfully');
      return refreshData.session.user;
    }
    
    // Session is valid, get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ User error:', userError);
      return null;
    }
    
    if (!user) {
      console.log('❌ No user found');
      return null;
    }
    
    console.log('✅ Session validated successfully');
    return user;
    
  } catch (error) {
    console.error('❌ Error validating session:', error);
    return null;
  }
};

async function testSessionFix() {
  console.log('🧪 TESTING SESSION FIX');
  console.log('=' .repeat(50));
  console.log('Timestamp:', new Date().toISOString());

  try {
    // PHASE 1: Test Session Validation Function
    console.log('\n📊 PHASE 1: TEST SESSION VALIDATION FUNCTION');
    console.log('-' .repeat(40));
    
    // Test 1: No session
    console.log('🔄 Test 1: No session scenario...');
    await supabase.auth.signOut();
    
    const user1 = await validateAndRefreshSession();
    console.log('   Result:', user1 ? 'User found' : 'No user (expected)');
    
    // Test 2: Valid session
    console.log('\n🔄 Test 2: Valid session scenario...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@kinship-atlas.com',
      password: 'testpassword123'
    });
    
    if (signInError) {
      console.log('   ❌ Sign in failed:', signInError.message);
    } else {
      console.log('   ✅ Sign in successful');
      
      const user2 = await validateAndRefreshSession();
      console.log('   Result:', user2 ? `User found: ${user2.id}` : 'No user');
    }

    // PHASE 2: Test Family Member Creation with Session Validation
    console.log('\n📊 PHASE 2: TEST FAMILY MEMBER CREATION');
    console.log('-' .repeat(40));
    
    // Test 3: Family member creation with session validation
    console.log('🔄 Test 3: Family member creation with session validation...');
    
    const user = await validateAndRefreshSession();
    if (!user) {
      console.log('   ❌ No authenticated user, skipping family member creation test');
    } else {
      console.log('   ✅ User authenticated, proceeding with family member creation...');
      
      const testMember = {
        first_name: 'Test',
        last_name: 'Member',
        birth_date: '1990-01-01',
        gender: 'other',
        created_by: user.id,
        branch_root: null,
        is_root_member: false
      };

      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert(testMember)
        .select('id')
        .single();

      if (memberError) {
        console.log('   ❌ Family member creation failed:', memberError);
      } else {
        console.log('   ✅ Family member created successfully:', memberData.id);
        
        // Clean up
        await supabase
          .from('family_members')
          .delete()
          .eq('id', memberData.id);
        console.log('   🧹 Test member cleaned up');
      }
    }

    // PHASE 3: Test Session Expiration Handling
    console.log('\n📊 PHASE 3: TEST SESSION EXPIRATION HANDLING');
    console.log('-' .repeat(40));
    
    // Test 4: Session expiration simulation
    console.log('🔄 Test 4: Session expiration simulation...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('   Current session expires at:', new Date(session.expires_at * 1000).toISOString());
      
      // Test session refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('   ❌ Session refresh failed:', refreshError);
      } else {
        console.log('   ✅ Session refresh successful');
        console.log('   New session expires at:', new Date(refreshData.session.expires_at * 1000).toISOString());
      }
    }

    // PHASE 4: Test Multiple Rapid Calls
    console.log('\n📊 PHASE 4: TEST MULTIPLE RAPID CALLS');
    console.log('-' .repeat(40));
    
    // Test 5: Multiple rapid session validations
    console.log('🔄 Test 5: Multiple rapid session validations...');
    
    const rapidPromises = [];
    for (let i = 0; i < 5; i++) {
      rapidPromises.push(validateAndRefreshSession());
    }
    
    const rapidResults = await Promise.all(rapidPromises);
    const successCount = rapidResults.filter(r => r !== null).length;
    
    console.log(`   Results: ${successCount}/5 successful`);
    rapidResults.forEach((result, index) => {
      console.log(`     Call ${index + 1}: ${result ? 'Success' : 'Failed'}`);
    });

    // PHASE 5: Test Error Recovery
    console.log('\n📊 PHASE 5: TEST ERROR RECOVERY');
    console.log('-' .repeat(40));
    
    // Test 6: Error recovery after sign out
    console.log('🔄 Test 6: Error recovery after sign out...');
    
    await supabase.auth.signOut();
    const userAfterSignOut = await validateAndRefreshSession();
    console.log('   Result after sign out:', userAfterSignOut ? 'User found (unexpected)' : 'No user (expected)');
    
    // Sign back in
    await supabase.auth.signInWithPassword({
      email: 'test@kinship-atlas.com',
      password: 'testpassword123'
    });
    
    const userAfterSignIn = await validateAndRefreshSession();
    console.log('   Result after sign in:', userAfterSignIn ? `User found: ${userAfterSignIn.id}` : 'No user (unexpected)');

    console.log('\n🎉 SESSION FIX TEST COMPLETED');
    console.log('=' .repeat(50));
    console.log('💡 The session validation and refresh mechanism should now prevent');
    console.log('   the "User authentication timeout" error in family member creation.');

  } catch (error) {
    console.error('❌ CRITICAL ERROR during session fix test:', error);
    console.error('Error stack:', error.stack);
  }
}

testSessionFix();
