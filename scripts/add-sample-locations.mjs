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

async function addSampleLocations() {
  console.log('📍 Adding sample location data to existing family members...\n');

  try {
    // First, get all family members
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name')
      .order('first_name');

    if (membersError) {
      console.error('❌ Error fetching family members:', membersError);
      return;
    }

    console.log(`✅ Found ${members.length} family members`);

    if (members.length === 0) {
      console.log('❌ No family members found. Please add some family members first.');
      return;
    }

    // Sample locations around the world
    const sampleLocations = [
      { lat: 40.7128, lng: -74.0060, description: 'New York City, NY, USA' },
      { lat: 51.5074, lng: -0.1278, description: 'London, England' },
      { lat: 48.8566, lng: 2.3522, description: 'Paris, France' },
      { lat: 35.6762, lng: 139.6503, description: 'Tokyo, Japan' },
      { lat: -33.8688, lng: 151.2093, description: 'Sydney, Australia' },
      { lat: 55.7558, lng: 37.6176, description: 'Moscow, Russia' },
      { lat: -22.9068, lng: -43.1729, description: 'Rio de Janeiro, Brazil' },
      { lat: 19.4326, lng: -99.1332, description: 'Mexico City, Mexico' },
      { lat: 28.6139, lng: 77.2090, description: 'New Delhi, India' },
      { lat: 39.9042, lng: 116.4074, description: 'Beijing, China' },
      { lat: 30.0444, lng: 31.2357, description: 'Cairo, Egypt' },
      { lat: -26.2041, lng: 28.0473, description: 'Johannesburg, South Africa' }
    ];

    // Add location data to the first few members
    const membersToUpdate = members.slice(0, Math.min(members.length, sampleLocations.length));
    
    console.log(`📍 Adding locations to ${membersToUpdate.length} family members...`);

    for (let i = 0; i < membersToUpdate.length; i++) {
      const member = membersToUpdate[i];
      const location = sampleLocations[i];

      console.log(`   - Adding location for ${member.first_name} ${member.last_name}: ${location.description}`);

      const { error: locationError } = await supabase
        .from('locations')
        .insert({
          family_member_id: member.id,
          lat: location.lat,
          lng: location.lng,
          description: location.description,
          current_residence: true
        });

      if (locationError) {
        console.error(`     ❌ Error adding location for ${member.first_name}:`, locationError);
      } else {
        console.log(`     ✅ Location added successfully`);
      }
    }

    // Now let's verify the locations were added
    console.log('\n🔍 Verifying locations were added...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('current_residence', true);

    if (locationsError) {
      console.error('❌ Error fetching locations:', locationsError);
      return;
    }

    console.log(`✅ Found ${locations.length} current residence locations:`);
    locations.forEach(location => {
      console.log(`   - ${location.description} (${location.lat}, ${location.lng})`);
    });

    // Test the app's family members query
    console.log('\n🔍 Testing app query...');
    const { data: appMembers, error: appError } = await supabase
      .from('family_members')
      .select(`
        id,
        first_name,
        last_name,
        locations(id, lat, lng, description, current_residence)
      `)
      .order('first_name');

    if (appError) {
      console.error('❌ Error with app query:', appError);
      return;
    }

    const membersWithLocation = appMembers.filter(member => 
      member.locations && member.locations.length > 0
    );

    console.log(`✅ App query results:`);
    console.log(`   - Total members: ${appMembers.length}`);
    console.log(`   - Members with location: ${membersWithLocation.length}`);

    if (membersWithLocation.length > 0) {
      console.log('\n🎉 SUCCESS! Family members with location data:');
      membersWithLocation.forEach(member => {
        console.log(`   - ${member.first_name} ${member.last_name}`);
        member.locations.forEach(location => {
          console.log(`     * ${location.description} (${location.lat}, ${location.lng})`);
        });
      });
      console.log('\n✅ The Family Map should now show markers for these members!');
    } else {
      console.log('\n❌ Still no members with location data found.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
addSampleLocations();
