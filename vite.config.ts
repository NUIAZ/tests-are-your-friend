// vite.config.ts: serves the tiny demo page and configures Vitest.
// One file for both because Vitest reads Vite's config; `test.globals` gives us
// describe/it/expect without importing them in every test file, and `include`
// keeps Vitest from picking up anything under docs/. `base: './'` makes the
// built site work from any sub-path (GitHub Pages serves it under /<repo>/).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
