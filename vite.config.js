/// <reference types="vitest" />
import { createRequire } from "node:module";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import devtools from "solid-devtools/vite";
import { analyzer } from "vite-bundle-analyzer";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("@vitest/browser-playwright").playwright;
} catch (_e) {
  // Ignore error if package is not available or fails to load in this environment
}

// https://vitejs.dev/config/
export default defineConfig({
  root: "frontend",
  build: {
    emptyOutDir: false,
  },
  plugins: [
    devtools(),
    tanstackRouter({
      target: "solid",
      autoCodeSplitting: true,
    }),
    solid(),
    process.env.ANALYZE === "true" && [
      analyzer({
        analyzerMode: "static",
        openAnalyzer: false,
        filename: "stats",
      }),
      analyzer({
        analyzerMode: "json",
        openAnalyzer: false,
        filename: "stats",
      }),
    ],
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
    coverage: {
      provider: "v8",
      reporter: ["lcov"],
    },
    projects: [
      // Only include browser project if playwright is available
      ...(playwright
        ? [
            {
              extends: true,
              test: {
                name: "browser",
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
                exclude: [
                  "src/pwa-infrastructure.test.ts",
                  "**/node_modules/**",
                  "**/dist/**",
                  "**/cypress/**",
                  "**/.{idea,git,cache,output,temp}/**",
                  "**/{karma,rollup,webpack,vite,vitest}.config.*",
                ],
                include: ["src/**/*.test.{ts,tsx}"],
                setupFiles: ["./src/vitest-setup.ts"],
                globals: true,
              },
            },
          ]
        : []),
      {
        test: {
          name: "node",
          root: "frontend",
          environment: "node",
          globals: true,
          include: ["src/pwa-infrastructure.test.ts"],
        },
      },
    ],
  },
});
