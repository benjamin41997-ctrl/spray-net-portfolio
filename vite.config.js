import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative assets + hash routes also work under any GitHub Pages repository name.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['branding/*'],
      manifest: {
        id: './',
        name: 'Spray-Net Portfolio',
        short_name: 'Spray-Net',
        description: 'Custom Chemistry. Smarter Painting. Spray-Net South Charlotte.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#003965',
        lang: 'en',
        icons: [
          { src: 'branding/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'branding/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'branding/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cacheId: 'spray-net-portfolio',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,avif,ttf,woff2,webmanifest,vtt}',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Local MP4s are optional/on-demand; online embeds are never cached.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('.mp4'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'spray-net-local-videos',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
