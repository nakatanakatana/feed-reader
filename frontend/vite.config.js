/// <reference types="vitest" />

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { playwright } from "@vitest/browser-playwright";
import devtools from "solid-devtools/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [devtools(), tanstackRouter({ target: "solid" }), solid()],
  server: {
    proxy: {
      "/feed.v1.FeedService": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "node",
    browser: {
      enabled: true,
      provider: playwright(),
      screenshotFailures: false,
      instances: [
        {
          browser: "chromium",
        },
      ],
      headless: true,
    },
    setupFiles: ["./src/vitest-setup.ts"],
    globals: true,
  },
});
