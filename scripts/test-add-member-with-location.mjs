#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAddMemberWithLocation() {
  console.log('🧪 Testing adding a family member with location data...\n');

  try {
    // First, let's get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user found. Please log in first.');
      return;
    }

    console.log('✅ Authenticated user:', user.email);

    // Create a test family member with location
    const testMember = {
      first_name: 'Test Map Member',
      last_name: 'Location Test',
      birth_date: '1990-01-01',
      gender: 'male',
      created_by: user.id,
      branch_root: null,
      is_root_member: false
    };

    console.log('📝 Creating family member...');
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .insert(testMember)
      .select('id')
      .single();

    if (memberError) {
      console.error('❌ Error creating family member:', memberError);
      return;
    }

    console.log('✅ Family member created:', memberData.id);

    // Add location data
    const testLocation = {
      family_member_id: memberData.id,
      lat: 40.7128, // New York City
      lng: -74.0060,
      description: 'New York City, NY, USA',
      current_residence: true
    };

    console.log('📍 Adding location data...');
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .insert(testLocation)
      .select('*')
      .single();

    if (locationError) {
      console.error('❌ Error adding location:', locationError);
      return;
    }

    console.log('✅ Location added:', locationData);

    // Now let's test the app's query to see if it picks up the location
    console.log('\n🔍 Testing app query with new member...');
    const { data: appMembers, error: appError } = await supabase
      .from('family_members')
      .select(`
        id,
        first_name,
        last_name,
        locations(id, lat, lng, description, current_residence)
      `)
      .eq('id', memberData.id)
      .single();

    if (appError) {
      console.error('❌ Error with app query:', appError);
      return;
    }

    console.log('✅ App query result:');
    console.log(`   - Member: ${appMembers.first_name} ${appMembers.last_name}`);
    console.log(`   - Locations: ${appMembers.locations ? appMembers.locations.length : 0}`);
    
    if (appMembers.locations && appMembers.locations.length > 0) {
      appMembers.locations.forEach(location => {
        console.log(`     * ${location.description} (${location.lat}, ${location.lng}) - Current: ${location.current_residence}`);
      });
    }

    // Test the complete family members query
    console.log('\n🔍 Testing complete family members query...');
    const { data: allMembers, error: allError } = await supabase
      .from('family_members')
      .select(`
        id,
        first_name,
        last_name,
        locations(id, lat, lng, description, current_residence)
      `)
      .order('first_name');

    if (allError) {
      console.error('❌ Error with complete query:', allError);
      return;
    }

    const membersWithLocation = allMembers.filter(member => 
      member.locations && member.locations.length > 0
    );

    console.log(`✅ Complete query results:`);
    console.log(`   - Total members: ${allMembers.length}`);
    console.log(`   - Members with location: ${membersWithLocation.length}`);

    if (membersWithLocation.length > 0) {
      console.log('\n🎉 SUCCESS! Family members with location data found:');
      membersWithLocation.forEach(member => {
        console.log(`   - ${member.first_name} ${member.last_name}`);
        member.locations.forEach(location => {
          console.log(`     * ${location.description} (${location.lat}, ${location.lng})`);
        });
      });
      console.log('\n✅ The Family Map should now show markers!');
    } else {
      console.log('\n❌ Still no members with location data found.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testAddMemberWithLocation();
