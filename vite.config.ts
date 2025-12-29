import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// lovable-tagger is optional; guard require to avoid dev startup failure if absent
let componentTagger: (() => any) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  componentTagger = require('lovable-tagger').componentTagger;
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
}));
