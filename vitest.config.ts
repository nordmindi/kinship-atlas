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
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      // Show coverage summary at the end
      reportOnFailure: true,
    },
    // Timeout for individual tests
    testTimeout: 10000,
    hookTimeout: 10000,
    // Configure worker pool to handle memory better - use single thread to reduce memory pressure
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Use single thread to reduce memory usage
        isolate: false, // Disable isolation to reduce memory overhead
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
