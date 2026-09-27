import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  // "/" locally; the deploy workflow sets BASE_PATH=/<repo>/ for GitHub Pages.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    // Mirrors the "@/*" path in tsconfig.app.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rolldownOptions: {
      output: {
        // Give the runtimes every page needs their own long-cached chunks, which
        // also keeps the main chunk under Vite's 500 kB warning. Only list code
        // that always loads up front: a group captures a module even when only a
        // lazy route imports it, which would pull lazy code into the first load.
        // Individual MUI components and other libraries stay with their importer.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            {
              name: 'mui-core',
              test: /node_modules[\\/](@emotion[\\/]|@mui[\\/](system|styled-engine|utils|private-theming)[\\/])/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
