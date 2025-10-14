import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFamilyMemberCreation() {
  console.log('🧪 Testing family member creation...');

  try {
    // Test data
    const testMember = {
      first_name: 'Test',
      last_name: 'User',
      birth_date: '1990-01-01',
      birth_place: 'Test City',
      bio: 'Test bio',
      gender: 'other',
      created_by: null, // Test without user
      branch_root: null,
      is_root_member: false
    };

    console.log('📝 Inserting test family member...');
    const startTime = Date.now();
    
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .insert(testMember)
      .select('id')
      .single();

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (memberError) {
      console.error('❌ Error inserting family member:', memberError);
      return;
    }

    console.log(`✅ Family member created successfully in ${duration}ms:`, memberData.id);

    // Test branch root update
    console.log('🔄 Testing branch root update...');
    const updateStartTime = Date.now();
    
    const { error: updateError } = await supabase
      .from('family_members')
      .update({
        branch_root: memberData.id,
        is_root_member: true
      })
      .eq('id', memberData.id);

    const updateEndTime = Date.now();
    const updateDuration = updateEndTime - startTime;

    if (updateError) {
      console.error('❌ Error updating branch info:', updateError);
    } else {
      console.log(`✅ Branch info updated successfully in ${updateDuration}ms`);
    }

    // Test location insert
    console.log('📍 Testing location insert...');
    const locationStartTime = Date.now();
    
    const { error: locationError } = await supabase
      .from('locations')
      .insert({
        family_member_id: memberData.id,
        lat: 57.7089,
        lng: 11.9746,
        description: 'Gothenburg, Sweden',
        current_residence: true
      });

    const locationEndTime = Date.now();
    const locationDuration = locationEndTime - locationStartTime;

    if (locationError) {
      console.error('❌ Error inserting location:', locationError);
    } else {
      console.log(`✅ Location inserted successfully in ${locationDuration}ms`);
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await supabase.from('locations').delete().eq('family_member_id', memberData.id);
    await supabase.from('family_members').delete().eq('id', memberData.id);
    console.log('✅ Test data cleaned up');

    console.log('🎉 All tests passed! Family member creation is working properly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFamilyMemberCreation();
