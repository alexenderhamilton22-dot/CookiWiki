import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from '@tailwindcss/vite';
import path from "path";
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

import analyzeHandler from './api/analyze-recipe';

const analysisApi = (): Plugin => ({
  name: 'cookiwiki-analysis-api',
  configureServer(server) {
    server.middlewares.use('/api/analyze-recipe', (req, res) => { void analyzeHandler(req, res); });
  },
});

// Server-only variables are loaded into Node, never exposed via import.meta.env.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const name of ['GEMINI_API_KEY', 'GEMINI_MODEL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
    if (!process.env[name] && env[name]) process.env[name] = env[name];
  }
  return ({
  define: { __COOKIWIKI_VERSION__: JSON.stringify(version) },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [analysisApi(), react(), tailwindcss()],
  build: {
    manifest: true,
    rollupOptions: { output: { manualChunks: {
      framework: ['react', 'react-dom', 'react-router-dom'],
      database: ['@supabase/supabase-js'],
    } } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});
