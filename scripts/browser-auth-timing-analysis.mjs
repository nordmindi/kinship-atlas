/**
 * Browser Authentication Timing Analysis
 * 
 * This script simulates the exact browser-side authentication flow
 * to identify timing issues between AuthContext and supabaseService.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function browserAuthTimingAnalysis() {
  console.log('🌐 BROWSER AUTHENTICATION TIMING ANALYSIS');
  console.log('=' .repeat(60));
  console.log('Timestamp:', new Date().toISOString());

  try {
    // PHASE 1: Simulate AuthContext Initialization
    console.log('\n📊 PHASE 1: AUTHCONTEXT INITIALIZATION SIMULATION');
    console.log('-' .repeat(50));
    
    // Step 1: Clear any existing session (simulate fresh browser load)
    await supabase.auth.signOut();
    console.log('✅ Cleared existing session (simulating fresh browser load)');
    
    // Step 2: Simulate AuthContext useEffect initialization
    console.log('\n🔄 Simulating AuthContext useEffect initialization...');
    const authContextStartTime = process.hrtime.bigint();
    
    // Simulate the exact AuthContext initialization sequence
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    console.log(`  getSession() call completed in ${(Number(process.hrtime.bigint() - authContextStartTime) / 1_000_000).toFixed(2)}ms`);
    console.log('  Initial session exists:', !!initialSession);
    
    if (!initialSession) {
      console.log('  🔐 No session found, attempting auto-login for development');
      const autoLoginStartTime = process.hrtime.bigint();
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@kinship-atlas.com',
          password: 'testpassword123'
        });
        const autoLoginDuration = Number(process.hrtime.bigint() - autoLoginStartTime) / 1_000_000;
        
        console.log(`  Auto-login completed in ${autoLoginDuration.toFixed(2)}ms`);
        if (error) {
          console.log('  ❌ Auto-login failed:', error.message);
        } else {
          console.log('  ✅ Auto-login successful');
        }
      } catch (err) {
        const autoLoginDuration = Number(process.hrtime.bigint() - autoLoginStartTime) / 1_000_000;
        console.log(`  Auto-login failed in ${autoLoginDuration.toFixed(2)}ms:`, err.message);
      }
    }
    
    // Step 3: Get final session after auto-login
    const { data: finalSession } = await supabase.auth.getSession();
    const authContextDuration = Number(process.hrtime.bigint() - authContextStartTime) / 1_000_000;
    
    console.log(`\n📊 AuthContext initialization completed in ${authContextDuration.toFixed(2)}ms`);
    console.log('  Final session exists:', !!finalSession);
    console.log('  Final user ID:', finalSession?.user?.id);

    // PHASE 2: Simulate AddFamilyMember Component Mount
    console.log('\n📊 PHASE 2: ADDFAMILYMEMBER COMPONENT MOUNT SIMULATION');
    console.log('-' .repeat(50));
    
    // Simulate the component mounting and checking authentication
    const componentMountStartTime = process.hrtime.bigint();
    
    // Simulate useAuth() hook call
    const { data: { user: componentUser } } = await supabase.auth.getUser();
    const componentMountDuration = Number(process.hrtime.bigint() - componentMountStartTime) / 1_000_000;
    
    console.log(`Component mount authentication check completed in ${componentMountDuration.toFixed(2)}ms`);
    console.log('  Component user exists:', !!componentUser);
    console.log('  Component user ID:', componentUser?.id);

    // PHASE 3: Simulate Form Submission Timing
    console.log('\n📊 PHASE 3: FORM SUBMISSION TIMING SIMULATION');
    console.log('-' .repeat(50));
    
    // Simulate the exact timing when user clicks "Add Family Member"
    console.log('🔄 Simulating form submission...');
    
    // Step 1: Authentication check in onSubmit
    const onSubmitStartTime = process.hrtime.bigint();
    const { data: { user: onSubmitUser } } = await supabase.auth.getUser();
    const onSubmitAuthDuration = Number(process.hrtime.bigint() - onSubmitStartTime) / 1_000_000;
    
    console.log(`  onSubmit authentication check: ${onSubmitAuthDuration.toFixed(2)}ms`);
    console.log('  onSubmit user exists:', !!onSubmitUser);
    
    if (!onSubmitUser) {
      console.log('  ❌ CRITICAL: User not authenticated at form submission time!');
      return;
    }
    
    // Step 2: Call attemptSubmission
    console.log('  📝 Calling attemptSubmission...');
    const attemptSubmissionStartTime = process.hrtime.bigint();
    
    // Step 3: Call addFamilyMember service
    console.log('  🚀 Calling addFamilyMember service...');
    const addFamilyMemberStartTime = process.hrtime.bigint();
    
    // Step 4: Get current user with timeout (the exact failing code)
    console.log('  👤 Getting current user with timeout...');
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('User authentication timeout')), 10000)
    );
    
    const getUserStartTime = process.hrtime.bigint();
    try {
      const { data: { user: serviceUser } } = await Promise.race([userPromise, timeoutPromise]);
      const getUserDuration = Number(process.hrtime.bigint() - getUserStartTime) / 1_000_000;
      
      console.log(`  ✅ getUser() completed in ${getUserDuration.toFixed(2)}ms`);
      console.log('  Service user exists:', !!serviceUser);
      console.log('  Service user ID:', serviceUser?.id);
      
      if (!serviceUser) {
        console.log('  ❌ CRITICAL: Service user is null despite successful getUser() call!');
      }
      
    } catch (error) {
      const getUserDuration = Number(process.hrtime.bigint() - getUserStartTime) / 1_000_000;
      console.log(`  ❌ getUser() failed in ${getUserDuration.toFixed(2)}ms: ${error.message}`);
      console.log('  ❌ This is the exact error from the browser!');
    }

    // PHASE 4: Race Condition Analysis
    console.log('\n📊 PHASE 4: RACE CONDITION ANALYSIS');
    console.log('-' .repeat(50));
    
    // Test multiple simultaneous getUser() calls to check for race conditions
    console.log('🔄 Testing race conditions with multiple getUser() calls...');
    
    const raceTestStartTime = process.hrtime.bigint();
    const racePromises = [];
    
    for (let i = 0; i < 10; i++) {
      racePromises.push(
        supabase.auth.getUser().then(result => ({
          index: i,
          success: !result.error,
          userExists: !!result.data.user,
          duration: 0 // Will be calculated individually
        }))
      );
    }
    
    const raceResults = await Promise.all(racePromises);
    const raceTestDuration = Number(process.hrtime.bigint() - raceTestStartTime) / 1_000_000;
    
    console.log(`  Race test completed in ${raceTestDuration.toFixed(2)}ms`);
    console.log('  Results:');
    raceResults.forEach(result => {
      console.log(`    Call ${result.index}: Success=${result.success}, UserExists=${result.userExists}`);
    });
    
    const successCount = raceResults.filter(r => r.success).length;
    const userExistsCount = raceResults.filter(r => r.userExists).length;
    
    console.log(`  Summary: ${successCount}/10 successful, ${userExistsCount}/10 with user`);

    // PHASE 5: Session Persistence Analysis
    console.log('\n📊 PHASE 5: SESSION PERSISTENCE ANALYSIS');
    console.log('-' .repeat(50));
    
    // Test session persistence across multiple client instances
    console.log('🔄 Testing session persistence...');
    
    const client1 = createClient(supabaseUrl, supabaseAnonKey);
    const client2 = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user: client1User } } = await client1.auth.getUser();
    const { data: { user: client2User } } = await client2.auth.getUser();
    
    console.log('  Client 1 user exists:', !!client1User);
    console.log('  Client 2 user exists:', !!client2User);
    console.log('  Users match:', client1User?.id === client2User?.id);

    console.log('\n🎯 BROWSER TIMING ANALYSIS COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ CRITICAL ERROR during browser timing analysis:', error);
    console.error('Error stack:', error.stack);
  }
}

browserAuthTimingAnalysis();
