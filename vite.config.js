/// <reference types="vitest" />
import { createRequire } from "node:module";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { analyzer } from "vite-bundle-analyzer";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
let playwright;

// Only attempt to load playwright if we are in a Vitest context to avoid
// overhead and warnings during normal vite dev/build.
if (process.env.VITEST) {
  try {
    playwright = require("@vitest/browser-playwright").playwright;
  } catch (error) {
    const message =
      'Failed to load "@vitest/browser-playwright". Browser tests will be skipped. ' +
      "Please ensure the package is installed and configured correctly.";

    if (
      error &&
      (error.code === "MODULE_NOT_FOUND" ||
        error.code === "ERR_MODULE_NOT_FOUND")
    ) {
      // In CI, missing @vitest/browser-playwright should be a hard failure.
      if (process.env.CI) {
        throw new Error(message);
      }
      // In local development, just warn.
      console.warn(message, error);
    } else {
      // For other types of errors (ESM/CJS interop, etc.), always warn.
      console.warn(message, error);
    }
  }
}

const jsdomUnitTests = [
  "src/components/DynamicFavicon.test.tsx",
  "src/components/MarkdownRenderer.test.tsx",
  "src/components/PwaBadge.test.tsx",
  "src/lib/feed-store-persistence.test.ts",
  "src/lib/item-db.test.ts",
  "src/lib/storage-utils.test.ts",
  "src/lib/toast.test.tsx",
  "src/lib/use-swipe.test.ts",
  "src/pwa-registration.test.ts",
];

// https://vitejs.dev/config/
export default defineConfig({
  root: "frontend",
  build: {
    emptyOutDir: false,
  },
  plugins: [
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
      workbox: {
        globIgnores: ["**/*.html"],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
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
    silent: "passed-only",
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
                  "src/**/*.node.test.{ts,tsx}",
                  ...jsdomUnitTests,
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
        extends: true,
        test: {
          name: "jsdom",
          root: "frontend",
          environment: "jsdom",
          restoreMocks: true,
          mockReset: true,
          globals: true,
          include: jsdomUnitTests,
          setupFiles: ["./src/vitest-jsdom-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          root: "frontend",
          environment: "node",
          isolate: false,
          restoreMocks: true,
          mockReset: true,
          globals: true,
          include: ["src/**/*.node.test.{ts,tsx}"],
        },
      },
    ],
  },
});
