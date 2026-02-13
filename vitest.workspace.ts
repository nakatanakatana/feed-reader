import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "vite.config.js",
    test: {
      name: "browser",
      browser: {
        enabled: true,
        instances: [{ browser: "chromium" }],
      },
      include: ["frontend/src/**/*.test.{ts,tsx}"],
      exclude: ["frontend/src/pwa-infrastructure.test.ts"],
    },
  },
  {
    extends: "frontend/vitest.node.config.js",
    test: {
      name: "node",
      include: ["frontend/src/pwa-infrastructure.test.ts"],
    },
  },
]);
