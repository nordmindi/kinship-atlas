import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// lovable-tagger is optional; guard require to avoid dev startup failure if absent
let componentTagger: (() => any) | undefined;
try {
  // Only load in development and if not in CI
  if (process.env.NODE_ENV !== 'production' && !process.env.CI) {
    componentTagger = require('lovable-tagger').componentTagger;
  }
} catch (e) {
  componentTagger = undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger ? componentTagger() : undefined,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production optimizations
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          
          // React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query-vendor';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          
          // ReactFlow - heavy library, only used in tree view
          if (id.includes('node_modules/@xyflow/') || id.includes('node_modules/reactflow/')) {
            return 'flow-vendor';
          }
          
          // Mapbox - heavy library, only used in map page
          if (id.includes('node_modules/mapbox-gl/')) {
            return 'mapbox-vendor';
          }
          
          // TipTap - rich text editor, only used in story editing
          if (id.includes('node_modules/@tiptap/')) {
            return 'tiptap-vendor';
          }
          
          // XLSX - Excel library, only used in import/export
          if (id.includes('node_modules/xlsx/')) {
            return 'xlsx-vendor';
          }
          
          // Recharts - charting library
          if (id.includes('node_modules/recharts/')) {
            return 'recharts-vendor';
          }
          
          // Radix UI components - group all together
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix-vendor';
          }
          
          // Form libraries
          if (id.includes('node_modules/react-hook-form/') || 
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/zod/')) {
            return 'form-vendor';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns/') || id.includes('node_modules/react-day-picker/')) {
            return 'date-vendor';
          }
          
          // Other UI utilities
          if (id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/class-variance-authority/') ||
              id.includes('node_modules/clsx/') ||
              id.includes('node_modules/tailwind-merge/')) {
            return 'ui-utils-vendor';
          }
          
          // Other vendor libraries
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Note: Console statements are handled by logger utility
    // For additional removal, consider using vite-plugin-remove-console in production
  },
}));
