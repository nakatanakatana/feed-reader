/** @vitest-environment node */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");

describe("Vite 8 migration", () => {
  test("pins Vite 8 in package.json", () => {
    const pkgPath = path.join(rootDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(pkg.devDependencies.vite).toMatch(/^\^?8\./);
  });

  test("does not rely on deprecated Vite 7 config fields", async () => {
    const configPath = path.join(rootDir, "vite.config.js");
    const configModule = await import(pathToFileURL(configPath).href);
    const config = configModule.default ?? configModule;

    expect(config.optimizeDeps?.esbuildOptions).toBeUndefined();
    expect(config.esbuild).toBeUndefined();
    expect(config.build?.rollupOptions).toBeUndefined();
  });

  test("moves browser-independent frontend tests out of the browser project", async () => {
    const configPath = path.join(rootDir, "vite.config.js");
    const configSource = fs.readFileSync(configPath, "utf-8");
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

    expect(configSource).toContain('name: "jsdom"');
    expect(configSource).toContain('environment: "jsdom"');

    for (const testPath of jsdomUnitTests) {
      expect(configSource).toContain(`"${testPath}"`);
    }
  });
});
