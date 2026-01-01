import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Exit after tests complete (important for CI)
    bail: 0, // Don't bail on first failure, run all tests
    // Clear output for better readability
    silent: false,
    // Show summary at the end with clear formatting
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],
    outputFile: process.env.CI ? {
      json: './test-results.json',
    } : undefined,
    // Ensure tests exit cleanly
    watch: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/build/',
        '**/coverage/',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/',
        '**/__mocks__/',
      ],
      thresholds: {
        lines: 50, // Current: 59.24%, target: 80%
        functions: 50, // Current: 60.34%, target: 80%
        branches: 50, // Current: 67.62%, target: 80%
        statements: 50, // Current: 59.24%, target: 80%
      },
      // Show coverage summary at the end
      reportOnFailure: true,
    },
    // Timeout for individual tests
    testTimeout: 10000,
    hookTimeout: 10000,
    // Configure worker pool to handle memory better
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Use single thread to reduce memory usage
        isolate: false, // Disable isolation to reduce memory overhead
        minThreads: 1,
        maxThreads: 1, // Force single thread
      },
    },
    // Reduce memory usage by limiting concurrent tests
    maxConcurrency: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
