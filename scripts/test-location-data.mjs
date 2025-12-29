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

async function testLocationData() {
  console.log('🔍 Testing location data in family members...\n');

  try {
    // First, let's check if we have any family members
    console.log('1. Checking family members...');
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name')
      .order('first_name');

    if (membersError) {
      console.error('❌ Error fetching family members:', membersError);
      return;
    }

    console.log(`✅ Found ${members.length} family members:`);
    members.forEach(member => {
      console.log(`   - ${member.first_name} ${member.last_name} (${member.id})`);
    });

    if (members.length === 0) {
      console.log('\n❌ No family members found. Please add some family members first.');
      return;
    }

    // Now let's check locations table
    console.log('\n2. Checking locations table...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .order('created_at');

    if (locationsError) {
      console.error('❌ Error fetching locations:', locationsError);
      return;
    }

    console.log(`✅ Found ${locations.length} location records:`);
    locations.forEach(location => {
      console.log(`   - Family Member ID: ${location.family_member_id}`);
      console.log(`     Description: ${location.description}`);
      console.log(`     Coordinates: ${location.lat}, ${location.lng}`);
      console.log(`     Current Residence: ${location.current_residence}`);
      console.log('');
    });

    // Now let's test the same query that the app uses
    console.log('3. Testing the app\'s family members query...');
    const { data: appMembers, error: appError } = await supabase
      .from('family_members')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        death_date,
        birth_place,
        bio,
        avatar_url,
        gender,
        created_by,
        branch_root,
        is_root_member,
        locations(id, lat, lng, description, current_residence)
      `)
      .order('first_name');

    if (appError) {
      console.error('❌ Error with app query:', appError);
      return;
    }

    console.log(`✅ App query returned ${appMembers.length} members:`);
    appMembers.forEach(member => {
      console.log(`   - ${member.first_name} ${member.last_name}`);
      console.log(`     ID: ${member.id}`);
      console.log(`     Locations: ${member.locations ? member.locations.length : 0}`);
      
      if (member.locations && member.locations.length > 0) {
        member.locations.forEach(location => {
          console.log(`       * ${location.description} (${location.lat}, ${location.lng}) - Current: ${location.current_residence}`);
        });
      } else {
        console.log(`       * No location data`);
      }
      console.log('');
    });

    // Let's also check if there are any members with current_residence = true
    console.log('4. Checking for current residence locations...');
    const { data: currentResidences, error: currentError } = await supabase
      .from('locations')
      .select('*')
      .eq('current_residence', true);

    if (currentError) {
      console.error('❌ Error fetching current residences:', currentError);
      return;
    }

    console.log(`✅ Found ${currentResidences.length} current residence locations:`);
    currentResidences.forEach(location => {
      console.log(`   - ${location.description} (${location.lat}, ${location.lng})`);
      console.log(`     Family Member ID: ${location.family_member_id}`);
    });

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   - Total family members: ${members.length}`);
    console.log(`   - Total location records: ${locations.length}`);
    console.log(`   - Current residence locations: ${currentResidences.length}`);
    
    if (currentResidences.length === 0) {
      console.log('\n❌ ISSUE FOUND: No family members have current residence locations!');
      console.log('   This is why the map shows no markers.');
      console.log('\n💡 SOLUTION: Add location data to family members with current_residence = true');
    } else {
      console.log('\n✅ Location data is available. The map should show markers.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testLocationData();
