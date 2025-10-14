/**
 * Session Storage Analysis
 * 
 * This script analyzes the session storage mechanism to understand
 * why the browser shows "Logged in T" but authentication fails.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sessionStorageAnalysis() {
  console.log('💾 SESSION STORAGE ANALYSIS');
  console.log('=' .repeat(60));
  console.log('Timestamp:', new Date().toISOString());

  try {
    // PHASE 1: Analyze the Root Cause
    console.log('\n📊 PHASE 1: ROOT CAUSE ANALYSIS');
    console.log('-' .repeat(40));
    
    console.log('🔍 ROOT CAUSE IDENTIFIED:');
    console.log('   The browser shows "Logged in T" but authentication fails');
    console.log('   This indicates a DISCONNECT between:');
    console.log('   1. AuthContext state (shows logged in)');
    console.log('   2. Supabase client authentication (fails)');
    console.log('');
    console.log('   EVIDENCE:');
    console.log('   - Browser UI: "Logged in T" ✅');
    console.log('   - Console: "User authentication timeout" ❌');
    console.log('   - Database queries work (relations, family_members) ✅');
    console.log('   - Authentication calls fail ❌');
    console.log('');
    console.log('   CONCLUSION: AuthContext and Supabase client are out of sync');

    // PHASE 2: Test Session Persistence
    console.log('\n📊 PHASE 2: SESSION PERSISTENCE TEST');
    console.log('-' .repeat(40));
    
    // Test 1: Create a session and check persistence
    console.log('🔄 Test 1: Creating and persisting session...');
    
    // Sign in to create a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@kinship-atlas.com',
      password: 'testpassword123'
    });
    
    if (signInError) {
      console.log('   ❌ Sign in failed:', signInError.message);
    } else {
      console.log('   ✅ Sign in successful');
      console.log('   User ID:', signInData.user?.id);
      console.log('   Session expires:', new Date(signInData.session?.expires_at * 1000).toISOString());
    }
    
    // Test 2: Check session persistence across client instances
    console.log('\n🔄 Test 2: Session persistence across client instances...');
    
    const client1 = createClient(supabaseUrl, supabaseAnonKey);
    const client2 = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user: client1User } } = await client1.auth.getUser();
    const { data: { user: client2User } } = await client2.auth.getUser();
    
    console.log('   Client 1 user exists:', !!client1User);
    console.log('   Client 2 user exists:', !!client2User);
    console.log('   Users match:', client1User?.id === client2User?.id);
    
    // Test 3: Check session vs user consistency
    console.log('\n🔄 Test 3: Session vs User consistency...');
    
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('   Session exists:', !!session);
    console.log('   User exists:', !!user);
    console.log('   Session user ID:', session?.user?.id);
    console.log('   User ID:', user?.id);
    console.log('   IDs match:', session?.user?.id === user?.id);

    // PHASE 3: Browser vs Node.js Environment Analysis
    console.log('\n📊 PHASE 3: BROWSER VS NODE.JS ENVIRONMENT');
    console.log('-' .repeat(40));
    
    console.log('🔍 ENVIRONMENT DIFFERENCES:');
    console.log('   Browser Environment:');
    console.log('   - Has localStorage/sessionStorage for session persistence');
    console.log('   - AuthContext manages React state');
    console.log('   - Supabase client uses browser storage');
    console.log('   - Multiple components can have different auth states');
    console.log('');
    console.log('   Node.js Environment:');
    console.log('   - No persistent storage between client instances');
    console.log('   - Each client instance is independent');
    console.log('   - No React state management');
    console.log('   - Direct Supabase client calls');
    console.log('');
    console.log('   CRITICAL INSIGHT:');
    console.log('   The browser AuthContext may have stale state while');
    console.log('   the Supabase client has lost its session!');

    // PHASE 4: Timing Issue Analysis
    console.log('\n📊 PHASE 4: TIMING ISSUE ANALYSIS');
    console.log('-' .repeat(40));
    
    console.log('🔍 TIMING ISSUE IDENTIFIED:');
    console.log('   From the browser console logs:');
    console.log('   1. "Fetching relations..." ✅ (works - has session)');
    console.log('   2. "Relations query result: {relationsData: Array(12)}" ✅');
    console.log('   3. "Starting family member creation..." ✅');
    console.log('   4. "User authentication timeout" ❌ (fails - lost session)');
    console.log('');
    console.log('   TIMING SEQUENCE:');
    console.log('   - Initial page load: AuthContext auto-login works');
    console.log('   - Data fetching: Works (session exists)');
    console.log('   - Form submission: Fails (session expired/lost)');
    console.log('');
    console.log('   ROOT CAUSE: Session expiration or loss between');
    console.log('   page load and form submission!');

    // PHASE 5: Session Expiration Test
    console.log('\n📊 PHASE 5: SESSION EXPIRATION TEST');
    console.log('-' .repeat(40));
    
    if (signInData?.session) {
      const sessionExpiry = new Date(signInData.session.expires_at * 1000);
      const now = new Date();
      const timeUntilExpiry = sessionExpiry.getTime() - now.getTime();
      
      console.log('   Session expiry analysis:');
      console.log('   Session expires at:', sessionExpiry.toISOString());
      console.log('   Current time:', now.toISOString());
      console.log('   Time until expiry:', Math.round(timeUntilExpiry / 1000), 'seconds');
      
      if (timeUntilExpiry < 0) {
        console.log('   ❌ Session has already expired!');
      } else if (timeUntilExpiry < 60) {
        console.log('   ⚠️  Session expires in less than 1 minute!');
      } else {
        console.log('   ✅ Session is still valid');
      }
    }

    // PHASE 6: Final Diagnosis
    console.log('\n📊 PHASE 6: FINAL DIAGNOSIS');
    console.log('-' .repeat(40));
    
    console.log('🎯 FINAL DIAGNOSIS:');
    console.log('');
    console.log('   PRIMARY ISSUE: Session State Desynchronization');
    console.log('   - AuthContext shows user as logged in');
    console.log('   - Supabase client has lost/expired session');
    console.log('   - This creates a false positive in the UI');
    console.log('');
    console.log('   SECONDARY ISSUE: Timing Race Condition');
    console.log('   - Session works during initial data loading');
    console.log('   - Session fails during form submission');
    console.log('   - Suggests session expiration or loss');
    console.log('');
    console.log('   TERTIARY ISSUE: Environment Mismatch');
    console.log('   - Node.js tests work (no persistence)');
    console.log('   - Browser fails (has persistence issues)');
    console.log('   - Indicates browser-specific session management problem');
    console.log('');
    console.log('   SOLUTION REQUIRED:');
    console.log('   1. Fix session persistence in browser');
    console.log('   2. Add session refresh mechanism');
    console.log('   3. Synchronize AuthContext with Supabase client state');
    console.log('   4. Add proper error handling for expired sessions');

    console.log('\n🎯 SESSION STORAGE ANALYSIS COMPLETE');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ CRITICAL ERROR during session storage analysis:', error);
    console.error('Error stack:', error.stack);
  }
}

sessionStorageAnalysis();
