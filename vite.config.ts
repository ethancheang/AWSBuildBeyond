import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  // Three.js is a deliberately lazy-loaded engine (~148 kB gzipped).
  build: { sourcemap: true, chunkSizeWarningLimit: 650 },
  plugins: [
    // Installable app with an offline cache of the whole game. Lessons and the
    // hall work offline; multiplayer needs a connection. The service worker is
    // only built for production, so `npm run dev` and the tests are unaffected.
    VitePWA({
      // A new version activates on the next launch, never mid-game.
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'Kopi That! Learn the lingo',
        short_name: 'Kopi That!',
        description:
          'Explore a 3D Singapore hawker centre and learn to order kopi, fishball noodles and nasi lemak.',
        lang: 'en-SG',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#fff8ee',
        theme_color: '#d32f2f',
        categories: ['education', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Modern browsers only need the woff2 fonts; skip woff and source maps.
        globPatterns: ['**/*.{html,js,css,woff2,png,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
