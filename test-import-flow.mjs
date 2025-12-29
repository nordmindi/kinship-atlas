#!/usr/bin/env node

/**
 * Test Import Flow - Simulate the exact import process
 * 
 * This script simulates the exact flow from Excel parsing to service call
 * to identify where the birth date validation is failing.
 */

console.log('=== TESTING IMPORT FLOW ===\n');

// Simulate the exact data structure from Excel parsing
const mockImportData = {
  familyMembers: [
    {
      id: 'temp_1',
      firstName: 'Said Ahmed',
      lastName: 'Said Nurani',
      birthDate: '1956-01-01',
      deathDate: undefined,
      birthPlace: undefined,
      bio: undefined,
      gender: 'other',
      relations: [],
      currentLocation: undefined
    },
    {
      id: 'temp_2', 
      firstName: 'Ali',
      lastName: 'Said Ahmed',
      birthDate: '1983-11-09',
      deathDate: undefined,
      birthPlace: 'Hargeisa, Somali',
      bio: 'Ali was born in Somali but migrated to Sweden 1992 with his sister Nasteha.',
      gender: 'male',
      relations: [],
      currentLocation: {
        lat: 40.7128,
        lng: -74.0060,
        description: 'Hargeisa, Somali'
      }
    }
  ]
};

console.log('1. MOCK IMPORT DATA:');
mockImportData.familyMembers.forEach((member, index) => {
  console.log(`   ${index + 1}. ${member.firstName} ${member.lastName}`);
  console.log(`      birthDate: ${JSON.stringify(member.birthDate)} (type: ${typeof member.birthDate})`);
  console.log(`      currentLocation: ${JSON.stringify(member.currentLocation)}`);
});
console.log('');

// Simulate the service call parameters (as done in ImportFamilyData.tsx line 279-288)
console.log('2. SERVICE CALL PARAMETERS:');
mockImportData.familyMembers.forEach((member, index) => {
  const serviceParams = {
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: member.birthDate,
    deathDate: member.deathDate,
    birthPlace: member.birthPlace,
    bio: member.bio,
    gender: member.gender,
    location: member.currentLocation
  };
  
  console.log(`   ${index + 1}. ${member.firstName} ${member.lastName}:`);
  console.log(`      Service params: ${JSON.stringify(serviceParams, null, 6)}`);
});
console.log('');

// Simulate the validation logic that should be called
console.log('3. VALIDATION SIMULATION:');
const now = new Date();

mockImportData.familyMembers.forEach((member, index) => {
  console.log(`   Testing ${member.firstName} ${member.lastName}:`);
  
  if (member.birthDate) {
    const birthDate = new Date(member.birthDate);
    console.log(`      Raw birthDate: "${member.birthDate}"`);
    console.log(`      Parsed Date: ${birthDate.toString()}`);
    console.log(`      Is valid: ${!isNaN(birthDate.getTime())}`);
    console.log(`      Is future: ${birthDate > now}`);
    console.log(`      Is future (with buffer): ${birthDate.getTime() > now.getTime() + (24 * 60 * 60 * 1000)}`);
    
    if (birthDate > now) {
      console.log(`      ❌ VALIDATION WOULD FAIL: "Birth date cannot be in the future"`);
    } else {
      console.log(`      ✅ VALIDATION WOULD PASS`);
    }
  } else {
    console.log(`      No birth date - validation would skip`);
  }
  console.log('');
});

// Test if there's a different validation path being used
console.log('4. CHECKING FOR ALTERNATIVE VALIDATION PATHS:');
console.log('   - familyMemberService.createFamilyMember() - should use fixed validation');
console.log('   - addFamilyMember() from supabaseService - has NO validation');
console.log('   - Database constraints - none found');
console.log('   - Database triggers - none for birth dates');
console.log('');

// Test the exact date parsing that might be happening
console.log('5. DATE PARSING EDGE CASES:');
const testDates = ['1956-01-01', '1983-11-09'];
testDates.forEach(dateStr => {
  console.log(`   Testing "${dateStr}":`);
  
  // Test different parsing methods
  const date1 = new Date(dateStr);
  const date2 = new Date(dateStr + 'T00:00:00');
  const date3 = new Date(dateStr + 'T00:00:00Z');
  
  console.log(`      new Date("${dateStr}"): ${date1.toString()} (${date1.toISOString()})`);
  console.log(`      new Date("${dateStr}T00:00:00"): ${date2.toString()} (${date2.toISOString()})`);
  console.log(`      new Date("${dateStr}T00:00:00Z"): ${date3.toString()} (${date3.toISOString()})`);
  
  console.log(`      All are future: ${date1 > now}, ${date2 > now}, ${date3 > now}`);
  console.log('');
});

console.log('=== ANALYSIS COMPLETE ===');
