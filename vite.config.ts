import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Three.js is a deliberately lazy-loaded engine (~148 kB gzipped).
  build: { sourcemap: true, chunkSizeWarningLimit: 650 },
});
