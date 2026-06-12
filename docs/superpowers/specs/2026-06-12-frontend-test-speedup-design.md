# Frontend Test Speedup Design Spec

* **Date**: 2026-06-12
* **Author**: Antigravity
* **Status**: Proposed

## 1. Background & Purpose

The current frontend tests in this project run mostly in Vitest's **Browser Mode** (via Playwright/Chromium). Running tests in a real browser introduces significant startup overhead and execution latency. Additionally, in certain environments (e.g., Ubuntu 26.04), Playwright may fail to run due to missing browser binaries or platform support.

To address these performance and environment issues, this design aims to separate tests that do not strictly require a full browser environment into faster, lightweight execution environments:
1. **Node.js Environment**: For pure logic and utilities without any DOM dependency.
2. **Happy DOM Environment**: For logic and custom hooks that depend on basic DOM APIs (like `localStorage` or `window`) but do not need visual layout rendering.
3. **Browser (Playwright) Environment**: Reserved exclusively for actual UI components (`*.tsx`).

## 2. Detailed Design

### 2.1. Node.js Environment Migration

* **Goal**: Move tests that only verify pure TypeScript logic to the Node.js environment.
* **Target File**: `frontend/src/pwa-registration.test.ts`
  * Action: Rename to `frontend/src/pwa-registration.node.test.ts`.
  * Since `vite.config.js` is already configured to route `src/**/*.node.test.{ts,tsx}` to the Node.js project, this file will automatically execute in Node.js.

### 2.2. Happy DOM Environment Setup

* **Goal**: Add a `happy-dom` project in Vitest to run non-UI tests that use DOM APIs.
* **Dependencies**:
  * Install `happy-dom` as a development dependency in [package.json](file:///home/tanaka/repos/github.com/nakatanakatana/feed-reader/package.json).
* **Configuration Changes** in [vite.config.js](file:///home/tanaka/repos/github.com/nakatanakatana/feed-reader/vite.config.js):
  * **Modify `browser` project**:
    * Change `include` to `["src/**/*.test.tsx"]` (restrict to TSX component tests).
  * **Add `happy-dom` project**:
    * Add a new project config with `environment: 'happy-dom'`.
    * Set `include` to `["src/**/*.test.ts"]` (exclude UI components, route to Happy DOM).
    * Exclude `src/**/*.node.test.{ts,tsx}`.

```typescript
// Proposed project configuration in vite.config.js
test: {
  projects: [
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
                instances: [{ browser: "chromium" }],
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
              include: ["src/**/*.test.tsx"], // Limited to TSX files
              setupFiles: ["./src/vitest-setup.ts"],
              globals: true,
            },
          },
        ]
      : []),
    {
      extends: true,
      test: {
        name: "happy-dom",
        root: "frontend",
        environment: "happy-dom",
        isolate: false,
        restoreMocks: true,
        mockReset: true,
        globals: true,
        include: ["src/**/*.test.ts"], // Targets TS files (logic & hooks)
        exclude: [
          "src/**/*.node.test.{ts,tsx}",
          "**/node_modules/**",
          "**/dist/**",
          "**/cypress/**",
          "**/.{idea,git,cache,output,temp}/**",
          "**/{karma,rollup,webpack,vite,vitest}.config.*",
        ],
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
}
```

## 3. Risks & Considerations

* **Compatibility with Happy DOM**: Happy DOM simulates browser APIs in Node.js. In rare cases, some advanced DOM APIs or SolidJS reactive logic might behave differently than in a real chromium browser.
  * *Mitigation*: We will carefully verify that all tests in `src/**/*.test.ts` (such as `storage-utils.test.ts`, `use-swipe.test.ts`) pass successfully in the `happy-dom` environment. If any test fails due to environment mismatch, we can either mock the missing API or revert that specific file back to the browser project using explicit exclusions.

## 4. Verification Plan

1. **Pre-verification**:
   * Verify git status is clean.
2. **Step 1 Migration (Node)**:
   * Rename `pwa-registration.test.ts` to `pwa-registration.node.test.ts`.
   * Run `npm run test` (only node tests should run if browser mode fails, or all if browser mode passes) and ensure it passes.
3. **Step 2 Migration (Happy DOM)**:
   * Add `happy-dom` to `package.json` devDependencies.
   * Run `npm install` (and `npm ci` as per rules) to download dependency.
   * Apply changes to `vite.config.js`.
   * Run `npm run test` and check if the new `happy-dom` project runs and executes the target tests successfully.
   * Compare execution time.
