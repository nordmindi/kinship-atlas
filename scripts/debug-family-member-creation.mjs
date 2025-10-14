/**
 * Debug Family Member Creation
 * 
 * This script debugs the family member creation process
 * to identify why it's failing.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugFamilyMemberCreation() {
  console.log('🔍 Debugging Family Member Creation');
  console.log('=' .repeat(40));

  try {
    // Test 1: Check Supabase connection
    console.log('\n📊 Test 1: Supabase Connection');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);

    const { data: healthCheck, error: healthError } = await supabase
      .from('family_members')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('❌ Supabase connection failed:', healthError);
      return;
    }
    console.log('✅ Supabase connection successful');

    // Test 2: Check authentication
    console.log('\n📊 Test 2: Authentication Status');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
    } else if (user) {
      console.log('✅ User authenticated:', user.id);
    } else {
      console.log('⚠️  No user authenticated (this might be the issue)');
    }

    // Test 3: Test family member creation
    console.log('\n📊 Test 3: Test Family Member Creation');
    
    const testMember = {
      first_name: 'Test',
      last_name: 'Member',
      birth_date: '1990-01-01',
      gender: 'other',
      created_by: user?.id || null,
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
      
      // Clean up test member
      await supabase
        .from('family_members')
        .delete()
        .eq('id', memberData.id);
      console.log('🧹 Test member cleaned up');
    }

    // Test 4: Check database schema
    console.log('\n📊 Test 4: Database Schema Check');
    const { data: schemaData, error: schemaError } = await supabase
      .from('family_members')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError);
    } else {
      console.log('✅ Database schema accessible');
    }

    // Test 5: Check RLS policies
    console.log('\n📊 Test 5: RLS Policy Check');
    if (user) {
      const { data: rlsData, error: rlsError } = await supabase
        .from('family_members')
        .select('id, first_name, last_name')
        .eq('created_by', user.id)
        .limit(1);

      if (rlsError) {
        console.error('❌ RLS policy check failed:', rlsError);
      } else {
        console.log('✅ RLS policies working correctly');
      }
    } else {
      console.log('⚠️  Skipping RLS check - no authenticated user');
    }

    console.log('\n🎉 Debug completed!');

  } catch (error) {
    console.error('❌ Unexpected error during debug:', error);
  }
}

debugFamilyMemberCreation();
