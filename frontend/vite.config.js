/// <reference types="vitest" />
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { playwright } from '@vitest/browser-playwright'
import devtools from 'solid-devtools/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [devtools(), tanstackRouter({ target: 'solid' }), solid()],
  server: {
    proxy: {
      '/feed.v1.FeedService': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    projects: [
      {
        name: "unit",
        test: {
          environment: 'jsdom',
          setupFiles: ['./src/vitest-setup.ts'],
          globals: true,
          include: [
            'src/**/*.{test,spec}.ts',
          ],
        },
      },
      {
        name: 'browser',
        test: {
          include: [
            'tests/browser/**/*.{test,spec}.ts',
            'tests/**/*.browser.{test,spec}.ts',
          ],
        },
        browser: {
          enabled: true,
          provider: playwright(),
          instances: [],
        },
      },
    ],
  },
});
