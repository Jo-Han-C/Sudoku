import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import pkg from './package.json' with { type: 'json' };

// Appen publiceras på https://jo-han-c.github.io/Sudoku/
export default defineConfig({
  base: '/Sudoku/',
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
