/**
 * Test Authenticated Family Member Creation
 * 
 * This script tests creating a family member with proper authentication.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthenticatedFamilyCreation() {
  console.log('🔐 Testing Authenticated Family Member Creation');
  console.log('=' .repeat(50));

  try {
    // Step 1: Sign in with test user
    console.log('\n📊 Step 1: Authentication');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@kinship-atlas.com',
      password: 'testpassword123'
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      
      // Try to create the test user if it doesn't exist
      console.log('🔄 Attempting to create test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@kinship-atlas.com',
        password: 'testpassword123'
      });

      if (signUpError) {
        console.error('❌ Sign up failed:', signUpError);
        return;
      } else {
        console.log('✅ Test user created successfully');
        // Try to sign in again
        const { data: retrySignInData, error: retrySignInError } = await supabase.auth.signInWithPassword({
          email: 'test@kinship-atlas.com',
          password: 'testpassword123'
        });

        if (retrySignInError) {
          console.error('❌ Retry sign in failed:', retrySignInError);
          return;
        } else {
          console.log('✅ Sign in successful after user creation');
        }
      }
    } else {
      console.log('✅ Sign in successful');
    }

    // Step 2: Verify authentication
    console.log('\n📊 Step 2: Verify Authentication');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Get user failed:', userError);
      return;
    }

    if (user) {
      console.log('✅ User authenticated:', user.id);
    } else {
      console.error('❌ No authenticated user found');
      return;
    }

    // Step 3: Create family member
    console.log('\n📊 Step 3: Create Family Member');
    
    const testMember = {
      first_name: 'Test',
      last_name: 'Member',
      birth_date: '1990-01-01',
      gender: 'other',
      created_by: user.id,
      branch_root: null,
      is_root_member: false
    };

    console.log('   Test member data:', testMember);

    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .insert(testMember)
      .select('id')
      .single();

    if (memberError) {
      console.error('❌ Family member creation failed:', memberError);
      console.error('   Error details:', JSON.stringify(memberError, null, 2));
    } else {
      console.log('✅ Family member created successfully:', memberData.id);
      
      // Step 4: Update branch info
      console.log('\n📊 Step 4: Update Branch Info');
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ 
          branch_root: memberData.id, 
          is_root_member: true 
        })
        .eq('id', memberData.id);

      if (updateError) {
        console.error('❌ Branch update failed:', updateError);
      } else {
        console.log('✅ Branch info updated successfully');
      }

      // Step 5: Clean up
      console.log('\n📊 Step 5: Clean Up');
      await supabase
        .from('family_members')
        .delete()
        .eq('id', memberData.id);
      console.log('🧹 Test member cleaned up');
    }

    // Step 6: Sign out
    console.log('\n📊 Step 6: Sign Out');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError);
    } else {
      console.log('✅ Signed out successfully');
    }

    console.log('\n🎉 Authenticated family member creation test completed!');
    console.log('💡 The issue is that users need to be authenticated to create family members.');

  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

testAuthenticatedFamilyCreation();
