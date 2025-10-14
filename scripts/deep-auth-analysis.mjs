/**
 * Deep Authentication Analysis
 * 
 * This script performs a comprehensive analysis of the authentication flow
 * to identify the exact point of failure with irrefutable evidence.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepAuthAnalysis() {
  console.log('🔍 DEEP AUTHENTICATION ANALYSIS');
  console.log('=' .repeat(60));
  console.log('Timestamp:', new Date().toISOString());
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');

  try {
    // PHASE 1: Initial State Analysis
    console.log('\n📊 PHASE 1: INITIAL STATE ANALYSIS');
    console.log('-' .repeat(40));
    
    const { data: { session: initialSession }, error: initialSessionError } = await supabase.auth.getSession();
    console.log('Initial session check:');
    console.log('  Session exists:', !!initialSession);
    console.log('  Session error:', initialSessionError);
    if (initialSession) {
      console.log('  User ID:', initialSession.user?.id);
      console.log('  User email:', initialSession.user?.email);
      console.log('  Session expires:', new Date(initialSession.expires_at * 1000).toISOString());
    }

    const { data: { user: initialUser }, error: initialUserError } = await supabase.auth.getUser();
    console.log('Initial user check:');
    console.log('  User exists:', !!initialUser);
    console.log('  User error:', initialUserError);
    if (initialUser) {
      console.log('  User ID:', initialUser.id);
      console.log('  User email:', initialUser.email);
    }

    // PHASE 2: Authentication Timing Analysis
    console.log('\n📊 PHASE 2: AUTHENTICATION TIMING ANALYSIS');
    console.log('-' .repeat(40));
    
    // Test 1: Measure getUser() performance
    console.log('Test 1: Measuring getUser() performance...');
    const startTime1 = process.hrtime.bigint();
    const { data: { user: user1 }, error: userError1 } = await supabase.auth.getUser();
    const endTime1 = process.hrtime.bigint();
    const duration1 = Number(endTime1 - startTime1) / 1_000_000; // Convert to milliseconds
    
    console.log(`  getUser() duration: ${duration1.toFixed(2)}ms`);
    console.log('  User result:', !!user1);
    console.log('  User error:', userError1);
    
    // Test 2: Measure getSession() performance
    console.log('Test 2: Measuring getSession() performance...');
    const startTime2 = process.hrtime.bigint();
    const { data: { session: session1 }, error: sessionError1 } = await supabase.auth.getSession();
    const endTime2 = process.hrtime.bigint();
    const duration2 = Number(endTime2 - startTime2) / 1_000_000;
    
    console.log(`  getSession() duration: ${duration2.toFixed(2)}ms`);
    console.log('  Session result:', !!session1);
    console.log('  Session error:', sessionError1);

    // PHASE 3: Timeout Simulation
    console.log('\n📊 PHASE 3: TIMEOUT SIMULATION');
    console.log('-' .repeat(40));
    
    // Test 3: Simulate the exact timeout logic from supabaseService.ts
    console.log('Test 3: Simulating exact timeout logic from supabaseService.ts...');
    
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('User authentication timeout')), 10000)
    );
    
    const startTime3 = process.hrtime.bigint();
    try {
      const result = await Promise.race([userPromise, timeoutPromise]);
      const endTime3 = process.hrtime.bigint();
      const duration3 = Number(endTime3 - startTime3) / 1_000_000;
      
      console.log(`  Promise.race duration: ${duration3.toFixed(2)}ms`);
      console.log('  Result:', result);
      console.log('  User ID:', result?.data?.user?.id);
    } catch (error) {
      const endTime3 = process.hrtime.bigint();
      const duration3 = Number(endTime3 - startTime3) / 1_000_000;
      
      console.log(`  Promise.race duration: ${duration3.toFixed(2)}ms`);
      console.log('  Error:', error.message);
      console.log('  Error type:', error.constructor.name);
    }

    // PHASE 4: Authentication State Consistency
    console.log('\n📊 PHASE 4: AUTHENTICATION STATE CONSISTENCY');
    console.log('-' .repeat(40));
    
    // Test 4: Multiple rapid calls to check consistency
    console.log('Test 4: Multiple rapid authentication calls...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(supabase.auth.getUser());
    }
    
    const results = await Promise.all(promises);
    console.log('  Results from 5 simultaneous calls:');
    results.forEach((result, index) => {
      console.log(`    Call ${index + 1}: User exists: ${!!result.data.user}, Error: ${!!result.error}`);
      if (result.error) {
        console.log(`      Error details: ${result.error.message}`);
      }
    });

    // PHASE 5: Network and Connection Analysis
    console.log('\n📊 PHASE 5: NETWORK AND CONNECTION ANALYSIS');
    console.log('-' .repeat(40));
    
    // Test 5: Test basic Supabase connectivity
    console.log('Test 5: Testing basic Supabase connectivity...');
    const startTime5 = process.hrtime.bigint();
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('count')
        .limit(1);
      const endTime5 = process.hrtime.bigint();
      const duration5 = Number(endTime5 - startTime5) / 1_000_000;
      
      console.log(`  Database query duration: ${duration5.toFixed(2)}ms`);
      console.log('  Query successful:', !error);
      console.log('  Query error:', error);
    } catch (error) {
      const endTime5 = process.hrtime.bigint();
      const duration5 = Number(endTime5 - startTime5) / 1_000_000;
      
      console.log(`  Database query duration: ${duration5.toFixed(2)}ms`);
      console.log('  Query error:', error.message);
    }

    // PHASE 6: Auto-login Simulation
    console.log('\n📊 PHASE 6: AUTO-LOGIN SIMULATION');
    console.log('-' .repeat(40));
    
    // Test 6: Simulate the auto-login process from AuthContext
    console.log('Test 6: Simulating auto-login process...');
    
    // Clear any existing session first
    await supabase.auth.signOut();
    console.log('  Cleared existing session');
    
    // Check session after signout
    const { data: { session: afterSignoutSession } } = await supabase.auth.getSession();
    console.log('  Session after signout:', !!afterSignoutSession);
    
    // Attempt auto-login
    const startTime6 = process.hrtime.bigint();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@kinship-atlas.com',
        password: 'testpassword123'
      });
      const endTime6 = process.hrtime.bigint();
      const duration6 = Number(endTime6 - startTime6) / 1_000_000;
      
      console.log(`  Auto-login duration: ${duration6.toFixed(2)}ms`);
      console.log('  Auto-login successful:', !error);
      console.log('  Auto-login error:', error);
      if (data?.user) {
        console.log('  Auto-login user ID:', data.user.id);
      }
    } catch (error) {
      const endTime6 = process.hrtime.bigint();
      const duration6 = Number(endTime6 - startTime6) / 1_000_000;
      
      console.log(`  Auto-login duration: ${duration6.toFixed(2)}ms`);
      console.log('  Auto-login error:', error.message);
    }

    // PHASE 7: Final State Verification
    console.log('\n📊 PHASE 7: FINAL STATE VERIFICATION');
    console.log('-' .repeat(40));
    
    const { data: { user: finalUser }, error: finalUserError } = await supabase.auth.getUser();
    const { data: { session: finalSession }, error: finalSessionError } = await supabase.auth.getSession();
    
    console.log('Final authentication state:');
    console.log('  User exists:', !!finalUser);
    console.log('  User error:', finalUserError);
    console.log('  Session exists:', !!finalSession);
    console.log('  Session error:', finalSessionError);
    
    if (finalUser) {
      console.log('  Final user ID:', finalUser.id);
      console.log('  Final user email:', finalUser.email);
    }

    console.log('\n🎯 ANALYSIS COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ CRITICAL ERROR during analysis:', error);
    console.error('Error stack:', error.stack);
  }
}

deepAuthAnalysis();
