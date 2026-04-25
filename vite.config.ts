import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Inject a build timestamp so users can verify they're running the latest
// version (visible at the bottom of the Profile screen).
const BUILD_ID = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kaloriak',
        short_name: 'Kaloriak',
        description: 'Přehled · Kontrola · Výsledky — sleduj kalorie a makra',
        theme_color: '#111113',
        background_color: '#111113',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
        // Take over immediately when a new SW is available. Without this
        // the PWA serves the old bundle until every installed instance is
        // fully closed — on iOS/Android home-screen apps that can mean
        // basically never. With these on, users get the latest code on
        // next refresh.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // OFF legacy host (for any non-search reads). CORS workaround for dev.
      '/off-api': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/off-api/, ''),
        headers: {
          'User-Agent': 'Kaloriak/0.1 (dev; contact: barthquattro@gmail.com)',
        },
      },
      // OFF new search service (search.openfoodfacts.org). Required because
      // the legacy /cgi/search.pl returns 503 to browser clients; the new
      // service works but doesn't send Access-Control-Allow-Origin.
      '/off-search': {
        target: 'https://search.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/off-search/, ''),
        headers: {
          'User-Agent': 'Kaloriak/0.1 (dev; contact: barthquattro@gmail.com)',
        },
      },
    },
  },
});
