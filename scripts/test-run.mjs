#!/usr/bin/env node

/**
 * Test Runner Wrapper
 * 
 * Runs tests and provides clear completion message
 */

import { spawn } from 'child_process';

// Set timeout to force exit if tests hang
const TEST_TIMEOUT = 300000; // 5 minutes
let timeoutId;

// Set NODE_OPTIONS for increased memory
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--max-old-space-size=8192';

const testProcess = spawn('npx', ['vitest', 'run', '--reporter=verbose', '--no-watch', '--run'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
  },
});

// Set timeout to kill process if it hangs
timeoutId = setTimeout(() => {
  console.error('\n⚠️  Test run timed out after 5 minutes. Killing process...');
  testProcess.kill('SIGTERM');
  setTimeout(() => {
    testProcess.kill('SIGKILL');
    process.exit(1);
  }, 5000);
}, TEST_TIMEOUT);

testProcess.on('close', (code) => {
  clearTimeout(timeoutId);
  console.log('\n' + '='.repeat(70));
  if (code === 0) {
    console.log('✅ TESTS COMPLETED SUCCESSFULLY');
  } else {
    console.log('❌ TESTS COMPLETED WITH FAILURES');
  }
  console.log('='.repeat(70));
  console.log('');
  
  process.exit(code || 0);
});

testProcess.on('error', (error) => {
  clearTimeout(timeoutId);
  console.error('Error running tests:', error);
  process.exit(1);
});

// Handle process termination signals
process.on('SIGINT', () => {
  clearTimeout(timeoutId);
  testProcess.kill('SIGTERM');
  setTimeout(() => {
    testProcess.kill('SIGKILL');
    process.exit(130);
  }, 2000);
});

process.on('SIGTERM', () => {
  clearTimeout(timeoutId);
  testProcess.kill('SIGTERM');
  setTimeout(() => {
    testProcess.kill('SIGKILL');
    process.exit(143);
  }, 2000);
});

