/** @vitest-environment node */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "vitest";

test("PWA infrastructure is correctly configured", async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, "..", "..");

  // 1. Check if vite-plugin-pwa is in package.json
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  expect(pkg.devDependencies["vite-plugin-pwa"]).toBeDefined();

  // 2. Check VitePWA configuration in Vite config structurally
  const configPath = path.join(rootDir, "vite.config.js");
  const configModule = await import(pathToFileURL(configPath).href);
  const config = configModule.default ?? configModule;
  const plugins = Array.isArray(config?.plugins) ? config.plugins : [];

  // Flatten plugins if they are nested (some plugins return arrays)
  const flatPlugins = plugins.flat();
  const pwaPlugin = flatPlugins.find(
    (plugin: unknown) =>
      (plugin as { name?: string })?.name === "vite-plugin-pwa",
  );
  expect(
    pwaPlugin,
    "vite-plugin-pwa not found in vite.config.js",
  ).toBeDefined();

  // 3. Check if PWA icons exist
  const icon192 = path.join(rootDir, "frontend/public/pwa-192x192.png");
  const icon512 = path.join(rootDir, "frontend/public/pwa-512x512.png");
  expect(fs.existsSync(icon192), "192x192 icon missing").toBe(true);
  expect(fs.existsSync(icon512), "512x512 icon missing").toBe(true);
});
