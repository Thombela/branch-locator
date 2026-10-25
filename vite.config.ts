/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/**
 * `vite preview` sends the same security headers as production nginx, so the
 * end-to-end suite exercises the real Content-Security-Policy.
 */
function productionHeaders(): Record<string, string> {
  const conf = readFileSync(new URL('./nginx/security-headers.conf', import.meta.url), 'utf8');
  return Object.fromEntries(
    [...conf.matchAll(/^add_header\s+([\w-]+)\s+"([^"]+)"/gm)].map(
      ([, name, value]) => [name, value] as [string, string],
    ),
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  preview: { port: 4173, headers: productionHeaders() },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Two large chunks are lazy-loaded, so don't warn about them: MapLibre (~1.1 MB minified) and
    // the mock API with every store from the feed (~1.7 MB), which only loads when mocks are on.
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion';
          if (/[\\/]msw[\\/]|@mswjs/.test(id)) return 'mocks';
          // Only the lazily loaded map imports this, so it stays off the critical path.
          if (/[\\/](maplibre-gl|@maplibre|@mapbox)[\\/]/.test(id)) return 'maplibre';
          return 'vendor';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // The WebGL map can't run in jsdom; it's exercised end-to-end by Playwright instead.
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/features/map/BranchMap.tsx',
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
