/// <reference types="vitest" />
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { playwright } from "@vitest/browser-playwright";
import devtools from "solid-devtools/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";

// https://vitejs.dev/config/
export default defineConfig({
  root: "frontend",
  plugins: [
    devtools(),
    tanstackRouter({ target: "solid" }),
    solid(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Feed Reader",
        short_name: "Feed Reader",
        description: "A simple PWA Feed Reader",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  cacheDir: "../node_modules/.vite",
  server: {
    proxy: {
      "/api": {
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
      viewport: { width: 1280, height: 720 },
      headless: true,
    },
    exclude: ["**/pwa-infrastructure.test.ts", "**/node_modules/**", "**/dist/**", "**/cypress/**", "**/.{idea,git,cache,output,temp}/**", "**/{karma,rollup,webpack,vite,vitest}.config.*"],
    setupFiles: ["./src/vitest-setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["lcov"],
    },
  },
});
