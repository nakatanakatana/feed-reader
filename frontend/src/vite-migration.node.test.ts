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
});
