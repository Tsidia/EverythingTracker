/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'EverythingTracker',
        short_name: 'Tracker',
        description: 'Local-first daily task tracker with streaks, focus timer, and mind map.',
        theme_color: '#6c5ce7',
        background_color: '#0f0f13',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache everything built by Vite (hashed JS/CSS, images, SVGs)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // SPA: any navigation request falls back to index.html
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // Relative paths so built assets work at any deployment subpath
  // (GitHub Pages under /repo-name/, custom domain root, etc.)
  base: './',
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
