// vite.config.ts: serves the tiny demo page and configures Vitest.
// `base: './'` makes the built site work from any sub-path (GitHub Pages).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
