import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Appen publiceras på https://jo-han-c.github.io/Sudoku/
export default defineConfig({
  base: '/Sudoku/',
  plugins: [preact()],
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
