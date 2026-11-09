import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const BASE = '/Sudoku/';
const BG = '#16171b';

// Appen publiceras på https://jo-han-c.github.io/Sudoku/
export default defineConfig({
  base: BASE,
  plugins: [
    preact(),
    VitePWA({
      // Ny version installeras först när spelaren trycker "Uppdatera", så att
      // sidan aldrig laddas om mitt i ett spel.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'Sudoku',
        short_name: 'Sudoku',
        description: 'Sudoku utan reklam.',
        lang: 'sv',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: BG,
        theme_color: BG,
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
        // All kod, inklusive pusselbanken för varje nivå, sparas för offlinebruk.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        // Första versionen tar kontroll direkt, så att senare uppdateringar kan laddas om korrekt.
        clientsClaim: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
