/** @vitest-environment node */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("production mock exclusion", () => {
  test("initMocks only loads MSW in dev when useMocks is enabled", () => {
    const source = fs.readFileSync(path.join(__dirname, "init.ts"), "utf-8");

    expect(source).toMatch(
      /if\s*\(\s*import\.meta\.env\.DEV\s*&&\s*cfg\.useMocks\s*\)/,
    );
    expect(source).toMatch(/await\s+import\s*\(\s*["']\.\/browser["']\s*\)/);
  });
});
