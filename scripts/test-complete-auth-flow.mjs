/**
 * Test Complete Authentication Flow
 * 
 * This script tests the complete authentication flow
 * including auto-login and family member creation.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompleteAuthFlow() {
  console.log('🔐 Testing Complete Authentication Flow');
  console.log('=' .repeat(50));

  try {
    // Step 1: Clear any existing session
    console.log('\n📊 Step 1: Clear Existing Session');
    await supabase.auth.signOut();
    console.log('✅ Session cleared');

    // Step 2: Test auto-login (simulate what happens in AuthContext)
    console.log('\n📊 Step 2: Test Auto-Login');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('🔐 No session found, attempting auto-login for development');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@kinship-atlas.com',
          password: 'testpassword123'
        });
        if (error) {
          console.log('⚠️ Auto-login failed:', error.message);
          // Try to create the test user if it doesn't exist
          if (error.message.includes('Invalid login credentials')) {
            console.log('🔄 Creating test user...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: 'test@kinship-atlas.com',
              password: 'testpassword123'
            });
            if (signUpError) {
              console.log('⚠️ Test user creation failed:', signUpError.message);
            } else {
              console.log('✅ Test user created, retrying auto-login...');
              // Retry login after user creation
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: 'test@kinship-atlas.com',
                password: 'testpassword123'
              });
              if (retryError) {
                console.log('⚠️ Retry auto-login failed:', retryError.message);
              } else {
                console.log('✅ Auto-login successful after user creation');
              }
            }
          }
        } else {
          console.log('✅ Auto-login successful for development');
        }
      } catch (err) {
        console.log('⚠️ Auto-login error:', err);
      }
    } else {
      console.log('✅ Session already exists');
    }

    // Step 3: Verify authentication
    console.log('\n📊 Step 3: Verify Authentication');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Get user failed:', userError);
      return;
    }

    if (user) {
      console.log('✅ User authenticated:', user.id);
      console.log('   Email:', user.email);
    } else {
      console.error('❌ No authenticated user found');
      return;
    }

    // Step 4: Test family member creation (simulate AddFamilyMember component)
    console.log('\n📊 Step 4: Test Family Member Creation');
    
    // Check authentication before submission (like in the component)
    if (!user) {
      console.log('❌ Authentication check failed - user not authenticated');
      return;
    }
    console.log('✅ Authentication check passed');

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
      
      // Step 5: Update branch info
      console.log('\n📊 Step 5: Update Branch Info');
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

      // Step 6: Clean up
      console.log('\n📊 Step 6: Clean Up');
      await supabase
        .from('family_members')
        .delete()
        .eq('id', memberData.id);
      console.log('🧹 Test member cleaned up');
    }

    // Step 7: Sign out
    console.log('\n📊 Step 7: Sign Out');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError);
    } else {
      console.log('✅ Signed out successfully');
    }

    console.log('\n🎉 Complete authentication flow test completed!');
    console.log('💡 The family member creation should now work correctly with auto-login enabled.');

  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

testCompleteAuthFlow();
