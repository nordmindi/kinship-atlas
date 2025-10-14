/**
 * Exact Browser Environment Simulation
 * 
 * This script simulates the exact browser environment and timing
 * to reproduce the authentication timeout issue.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function exactBrowserSimulation() {
  console.log('🌐 EXACT BROWSER ENVIRONMENT SIMULATION');
  console.log('=' .repeat(60));
  console.log('Timestamp:', new Date().toISOString());
  console.log('Simulating the exact sequence from the browser console logs...');

  try {
    // STEP 1: Simulate the browser showing "Logged in T"
    console.log('\n📊 STEP 1: SIMULATE BROWSER UI STATE');
    console.log('-' .repeat(40));
    console.log('🖥️  Browser UI shows: "Logged in T"');
    console.log('   This indicates the AuthContext thinks user is authenticated');
    
    // Check current authentication state
    const { data: { user: uiUser }, error: uiError } = await supabase.auth.getUser();
    console.log('   UI authentication check:');
    console.log('     User exists:', !!uiUser);
    console.log('     User error:', uiError);
    console.log('     User ID:', uiUser?.id);

    // STEP 2: Simulate the form submission sequence from console logs
    console.log('\n📊 STEP 2: SIMULATE FORM SUBMISSION SEQUENCE');
    console.log('-' .repeat(40));
    
    // From the console logs, we see:
    // "Attempt 1 - Starting family member creation from form..."
    // "Calling addFamilyMember service..."
    // "Starting family member creation..."
    // "Error adding family member: Error: User authentication timeout"
    
    console.log('🔄 Simulating form submission sequence...');
    console.log('   Attempt 1 - Starting family member creation from form...');
    console.log('   Calling addFamilyMember service...');
    console.log('   Starting family member creation...');
    
    // STEP 3: Simulate the exact addFamilyMember function call
    console.log('\n📊 STEP 3: SIMULATE ADDFAMILYMEMBER FUNCTION');
    console.log('-' .repeat(40));
    
    // This is the exact code from supabaseService.ts lines 182-188
    console.log('🔄 Executing exact addFamilyMember authentication check...');
    
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('User authentication timeout')), 10000)
    );
    
    const startTime = process.hrtime.bigint();
    try {
      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      
      console.log(`   ✅ getUser() completed in ${duration.toFixed(2)}ms`);
      console.log('   Current user for family member creation:', user?.id);
      
      if (!user) {
        console.log('   ❌ CRITICAL: User is null despite successful Promise.race!');
        console.log('   This explains why addFamilyMember returns null');
      } else {
        console.log('   ✅ User authentication successful');
      }
      
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      console.log(`   ❌ getUser() failed in ${duration.toFixed(2)}ms: ${error.message}`);
      console.log('   ❌ This is the exact error from the browser!');
    }

    // STEP 4: Analyze the timing discrepancy
    console.log('\n📊 STEP 4: TIMING DISCREPANCY ANALYSIS');
    console.log('-' .repeat(40));
    
    // The browser shows the user is logged in, but the service call fails
    // This suggests a timing issue between AuthContext and supabaseService
    
    console.log('🔍 Analyzing timing discrepancy...');
    
    // Test 1: Multiple rapid calls to see if there's a race condition
    console.log('   Test 1: Multiple rapid getUser() calls...');
    const rapidCalls = [];
    for (let i = 0; i < 5; i++) {
      rapidCalls.push(supabase.auth.getUser());
    }
    
    const rapidResults = await Promise.all(rapidCalls);
    const successCount = rapidResults.filter(r => !r.error).length;
    const userCount = rapidResults.filter(r => !!r.data.user).length;
    
    console.log(`     Results: ${successCount}/5 successful, ${userCount}/5 with user`);
    
    // Test 2: Check if there's a delay between session and user
    console.log('   Test 2: Session vs User timing...');
    const sessionStart = process.hrtime.bigint();
    const { data: { session } } = await supabase.auth.getSession();
    const sessionDuration = Number(process.hrtime.bigint() - sessionStart) / 1_000_000;
    
    const userStart = process.hrtime.bigint();
    const { data: { user } } = await supabase.auth.getUser();
    const userDuration = Number(process.hrtime.bigint() - userStart) / 1_000_000;
    
    console.log(`     getSession(): ${sessionDuration.toFixed(2)}ms, exists: ${!!session}`);
    console.log(`     getUser(): ${userDuration.toFixed(2)}ms, exists: ${!!user}`);
    console.log(`     Session user ID: ${session?.user?.id}`);
    console.log(`     User ID: ${user?.id}`);
    console.log(`     IDs match: ${session?.user?.id === user?.id}`);

    // STEP 5: Test the exact conditions from the browser
    console.log('\n📊 STEP 5: EXACT BROWSER CONDITIONS TEST');
    console.log('-' .repeat(40));
    
    // From the browser console, we see successful data fetching before the error:
    // "Fetching relations..."
    // "Relations query result: {relationsData: Array(12), relationsError: null}"
    // "✔ Successfully transformed family members: 6"
    
    console.log('🔄 Testing data fetching (which works in browser)...');
    
    // Test the relations query that works in browser
    const relationsStart = process.hrtime.bigint();
    const { data: relationsData, error: relationsError } = await supabase
      .from('relations')
      .select('*');
    const relationsDuration = Number(process.hrtime.bigint() - relationsStart) / 1_000_000;
    
    console.log(`   Relations query: ${relationsDuration.toFixed(2)}ms`);
    console.log(`   Relations data: ${relationsData?.length || 0} records`);
    console.log(`   Relations error: ${relationsError}`);
    
    // Test family members query
    const membersStart = process.hrtime.bigint();
    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select('*');
    const membersDuration = Number(process.hrtime.bigint() - membersStart) / 1_000_000;
    
    console.log(`   Family members query: ${membersDuration.toFixed(2)}ms`);
    console.log(`   Members data: ${membersData?.length || 0} records`);
    console.log(`   Members error: ${membersError}`);

    // STEP 6: Final authentication state check
    console.log('\n📊 STEP 6: FINAL AUTHENTICATION STATE');
    console.log('-' .repeat(40));
    
    const finalSession = await supabase.auth.getSession();
    const finalUser = await supabase.auth.getUser();
    
    console.log('Final state:');
    console.log('  Session exists:', !!finalSession.data.session);
    console.log('  User exists:', !!finalUser.data.user);
    console.log('  Session user ID:', finalSession.data.session?.user?.id);
    console.log('  User ID:', finalUser.data.user?.id);
    console.log('  Session expires:', finalSession.data.session ? new Date(finalSession.data.session.expires_at * 1000).toISOString() : 'N/A');

    console.log('\n🎯 EXACT BROWSER SIMULATION COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ CRITICAL ERROR during browser simulation:', error);
    console.error('Error stack:', error.stack);
  }
}

exactBrowserSimulation();
