/// <reference types="vitest" />
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { playwright } from '@vitest/browser-playwright';
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
    environment: 'node',
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        {
          browser: 'chromium',
        },
      ],
      headless: true,
    },
    setupFiles: ['./src/vitest-setup.ts'],
    globals: true,
  },
});
