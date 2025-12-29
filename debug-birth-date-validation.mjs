#!/usr/bin/env node

/**
 * Deep Analysis: Birth Date Validation Debug Script
 * 
 * This script reproduces the exact data flow from Excel parsing to validation
 * to identify the precise point of failure.
 */

console.log('=== DEEP ANALYSIS: BIRTH DATE VALIDATION FAILURE ===\n');

// Test data from the Excel file
const testData = [
  { firstName: 'Said Ahmed', lastName: 'Said Nurani', birthDate: '1956-01-01' },
  { firstName: 'Ali', lastName: 'Said Ahmed', birthDate: '1983-11-09' },
  { firstName: 'Mary', lastName: 'Smith', birthDate: '1952-07-22' },
  { firstName: 'David', lastName: 'Smith', birthDate: '1975-11-08' }
];

console.log('1. TEST DATA FROM EXCEL:');
testData.forEach((member, index) => {
  console.log(`   ${index + 1}. ${member.firstName} ${member.lastName} - Birth: ${member.birthDate}`);
});
console.log('');

// Simulate Excel parsing (as done in ImportFamilyData.tsx line 110)
console.log('2. EXCEL PARSING SIMULATION:');
testData.forEach((member, index) => {
  const parsedBirthDate = member.birthDate || undefined;
  console.log(`   ${index + 1}. ${member.firstName} ${member.lastName}`);
  console.log(`      Raw birth_date: "${member.birthDate}"`);
  console.log(`      Parsed birthDate: ${JSON.stringify(parsedBirthDate)}`);
  console.log(`      Type: ${typeof parsedBirthDate}`);
});
console.log('');

// Simulate validation logic (as done in familyMemberService.ts)
console.log('3. VALIDATION LOGIC SIMULATION:');
const now = new Date();
console.log(`   Current time: ${now.toISOString()}`);
console.log(`   Current time (local): ${now.toString()}`);
console.log('');

testData.forEach((member, index) => {
  console.log(`   Testing ${member.firstName} ${member.lastName}:`);
  
  if (member.birthDate) {
    const birthDate = new Date(member.birthDate);
    console.log(`      Raw birth_date string: "${member.birthDate}"`);
    console.log(`      Parsed Date object: ${birthDate.toString()}`);
    console.log(`      Parsed Date ISO: ${birthDate.toISOString()}`);
    console.log(`      Is valid date: ${!isNaN(birthDate.getTime())}`);
    console.log(`      Birth date time: ${birthDate.getTime()}`);
    console.log(`      Current time: ${now.getTime()}`);
    console.log(`      Time difference (ms): ${birthDate.getTime() - now.getTime()}`);
    console.log(`      Time difference (days): ${(birthDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)}`);
    
    // Original validation logic (before fix)
    const originalCheck = birthDate > now;
    console.log(`      Original check (birthDate > now): ${originalCheck}`);
    
    // Fixed validation logic
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const fixedCheck = birthDate.getTime() > now.getTime() + oneDayInMs;
    console.log(`      Fixed check (birthDate > now + 1 day): ${fixedCheck}`);
    
    if (originalCheck) {
      console.log(`      ❌ ORIGINAL VALIDATION WOULD FAIL: "Birth date cannot be in the future"`);
    } else {
      console.log(`      ✅ ORIGINAL VALIDATION WOULD PASS`);
    }
    
    if (fixedCheck) {
      console.log(`      ❌ FIXED VALIDATION WOULD FAIL: "Birth date cannot be in the future"`);
    } else {
      console.log(`      ✅ FIXED VALIDATION WOULD PASS`);
    }
  } else {
    console.log(`      No birth date provided`);
  }
  console.log('');
});

// Test different date formats that might come from Excel
console.log('4. DATE FORMAT TESTING:');
const testFormats = [
  '1956-01-01',
  '1983-11-09', 
  '1952-07-22',
  '1975-11-08',
  '01/01/1956',
  '11/09/1983',
  'July 22, 1952',
  'Nov 8, 1975'
];

testFormats.forEach(dateStr => {
  const date = new Date(dateStr);
  const isValid = !isNaN(date.getTime());
  const isFuture = date > now;
  const isFutureWithBuffer = date.getTime() > now.getTime() + (24 * 60 * 60 * 1000);
  
  console.log(`   "${dateStr}"`);
  console.log(`      Parsed: ${date.toString()}`);
  console.log(`      Valid: ${isValid}`);
  console.log(`      Future (original): ${isFuture}`);
  console.log(`      Future (with buffer): ${isFutureWithBuffer}`);
  console.log('');
});

// Test timezone effects
console.log('5. TIMEZONE ANALYSIS:');
const testDate = '1956-01-01';
const date1 = new Date(testDate);
const date2 = new Date(testDate + 'T00:00:00');
const date3 = new Date(testDate + 'T00:00:00Z');
const date4 = new Date(testDate + 'T12:00:00Z');

console.log(`   Test date string: "${testDate}"`);
console.log(`   new Date("${testDate}"): ${date1.toString()} (${date1.toISOString()})`);
console.log(`   new Date("${testDate}T00:00:00"): ${date2.toString()} (${date2.toISOString()})`);
console.log(`   new Date("${testDate}T00:00:00Z"): ${date3.toString()} (${date3.toISOString()})`);
console.log(`   new Date("${testDate}T12:00:00Z"): ${date4.toString()} (${date4.toISOString()})`);
console.log('');

console.log('=== ANALYSIS COMPLETE ===');
