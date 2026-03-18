import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import devtools from "solid-devtools/vite";
import { analyzer } from "vite-bundle-analyzer";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";

const require = createRequire(import.meta.url);
const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

const browserProject = (() => {
  try {
    require.resolve("playwright");
    return {
      extends: true as const,
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
    };
  } catch (error) {
    const message =
      'Failed to load "playwright". Browser tests will be skipped. ' +
      "Please ensure the package is installed and configured correctly.";

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "MODULE_NOT_FOUND" || error.code === "ERR_MODULE_NOT_FOUND")
    ) {
      if (process.env.CI) {
        throw new Error(message);
      }

      console.warn(message, error);
      return null;
    }

    console.warn(message, error);
    return null;
  }
})();

const config = {
  root: "frontend",
  build: {
    emptyOutDir: false,
  },
  plugins: [
    devtools() as any,
    tanstackRouter({
      target: "solid",
      routesDirectory: path.join(workspaceRoot, "frontend/src/routes"),
      generatedRouteTree: path.join(workspaceRoot, "frontend/src/routeTree.gen.ts"),
      autoCodeSplitting: true,
    }),
    solid(),
    process.env.ANALYZE === "true" && [
      analyzer({
        analyzerMode: "static",
        fileName: "stats.html",
      }),
      analyzer({
        analyzerMode: "json",
        fileName: "stats.json",
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
    silent: "passed-only",
    coverage: {
      provider: "v8",
      reporter: ["lcov"],
    },
    projects: [
      ...(browserProject ? [browserProject] : []),
      {
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
  lint: {
    ignorePatterns: [
      ".agents/**",
      ".gemini/**",
      ".github/**",
      "conductor/*",
      "docs/**",
      "**/gen/**/*.ts",
      "**/*.gen.ts",
      "**/dist/**",
      "openspec/specs/**",
      "**/public/mockServiceWorker.js",
      "README.md",
      "aqua.yaml",
      ".octocov.yml",
      "renovate.json",
    ],
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "vitest"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "no-unused-vars": "off",
      "no-unassigned-vars": "off",
      "no-unused-expressions": "off",
      "unicorn/no-useless-length-check": "off",
      "typescript/no-floating-promises": "off",
      "typescript/await-thenable": "off",
      "typescript/unbound-method": "off",
      "typescript/no-redundant-type-constituents": "off",
      "typescript/no-misused-spread": "off",
      "typescript/restrict-template-expressions": "off",
    },
  },
  fmt: {
    ignorePatterns: [
      ".agents/**",
      ".gemini/**",
      ".github/**",
      "conductor/*",
      "docs/**",
      "**/gen/**/*.ts",
      "**/*.gen.ts",
      "**/dist/**",
      "openspec/specs/**",
      "**/public/mockServiceWorker.js",
      "README.md",
      "aqua.yaml",
      ".octocov.yml",
      "renovate.json",
    ],
    tabWidth: 2,
    singleQuote: false,
    sortImports: {},
  },
  staged: {
    "*.{js,jsx,ts,tsx}": "vp check --fix",
  },
} as any;

export default defineConfig(config);
