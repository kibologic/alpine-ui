import { defineConfig } from 'vitest/config';
import { swissjs } from '@swissjs/vite-plugin';

// Matches swiss-lib's own runtime/vitest.config.ts stack (vitest + jsdom)
// per TEST-001's never_touch. @swissjs/vite-plugin (swiss-lib/plugins/vite)
// is pure delegation to @swissjs/compiler's own transform -- the same one
// swite's dev-engine calls -- so .uix components compile identically to how
// they'd compile inside a real Alpine app. See DRR-001.
export default defineConfig({
  plugins: [swissjs()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
