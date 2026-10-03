import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      // Registered from src/lib/pwa/register.ts; new versions activate immediately.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeManifestIcons: false, // already matched by globPatterns
      manifest: {
        id: './',
        name: 'Veil',
        short_name: 'Veil',
        description: 'A private map of the world. No accounts, no tracking.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        categories: ['navigation', 'travel', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png}', // og.jpg (link previews) is not needed offline
          'assets/sprites/**/*.json',
          // UI font: Latin and Cyrillic subsets (others load on demand, if ever needed).
          'assets/jetbrains-mono-{latin,cyrillic}-wght-normal-*.woff2',
          // Glyph ranges for Latin and Cyrillic labels; others are cached on first use.
          'assets/fonts/Noto Sans {Regular,Medium,Italic}/{0-255,256-511,1024-1279,8192-8447}.pbf',
        ],
        globIgnores: ['dev/**'],
        // The plugin turns these on for autoUpdate only with its own injected registration;
        // without them a new worker waits until every tab is closed and users keep the old
        // version.
        skipWaiting: true,
        clientsClaim: true,
        // Only Vite's hashed file names are immutable. The plugin's default trusts all of
        // assets/, so unhashed files from public/assets (icons.svg) kept their first cached
        // version forever, even after the service worker updated.
        dontCacheBustURLsMatching: /^assets\/[^/]+-[\w-]{8}\.\w+$/,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Runtime config may change on the server; use the cached copy only offline.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\/(config|regions\/index|dev\/index)\.json$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'config', networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('.pbf'),
            handler: 'CacheFirst',
            options: { cacheName: 'glyphs', expiration: { maxEntries: 400 } },
          },
          // Tiles (.pmtiles range requests) and geocoder responses are never cached here:
          // offline tiles live in OPFS, and search results must be fresh.
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    // Fonts are never inlined as data: URIs (the CSP allows fonts only from 'self').
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
});
