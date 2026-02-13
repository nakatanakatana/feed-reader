/** @vitest-environment node */

import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

test("PWA infrastructure is correctly configured", () => {
  const rootDir = process.cwd();

  // 1. Check if vite-plugin-pwa is in package.json
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  expect(pkg.devDependencies["vite-plugin-pwa"]).toBeDefined();

  // 2. Check if vite.config.js has VitePWA configuration
  const configPath = path.join(rootDir, "vite.config.js");
  const configContent = fs.readFileSync(configPath, "utf-8");
  expect(configContent).toContain("VitePWA({");
  expect(configContent).toContain('registerType: "autoUpdate"');
  expect(configContent).toContain('display: "standalone"');

  // 3. Check if PWA icons exist
  const icon192 = path.join(rootDir, "frontend/public/pwa-192x192.png");
  const icon512 = path.join(rootDir, "frontend/public/pwa-512x512.png");
  expect(fs.existsSync(icon192), "192x192 icon missing").toBe(true);
  expect(fs.existsSync(icon512), "512x512 icon missing").toBe(true);
});
