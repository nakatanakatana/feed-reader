/** @vitest-environment node */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";

type Ownership = {
  discoveredCases: string[];
  importedCases: string[];
};

const temporaryDirectories: string[] = [];

function collectFiles(
  directory: string,
  matches: (filePath: string) => boolean,
): string[] {
  const files: string[] = [];

  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, matches));
    } else if (entry.isFile() && matches(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function stripComments(source: string, entrypointPath: string): string {
  let result = "";
  let index = 0;
  let quote: '"' | "'" | undefined;

  while (index < source.length) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (quote !== undefined) {
      result += character;
      if (character === "\\") {
        result += nextCharacter ?? "";
        index += 2;
        continue;
      }
      if (character === quote) {
        quote = undefined;
      }
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      result += character;
      index += 1;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      while (index < source.length && source[index] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      const commentStart = index;
      result += "  ";
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        result += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      if (index === source.length) {
        throw new Error(
          `${entrypointPath}: unterminated block comment at offset ${commentStart}`,
        );
      }
      result += "  ";
      index += 2;
      continue;
    }

    result += character;
    index += 1;
  }

  return result;
}

function parseStaticSideEffectImports(entrypointPath: string): string[] {
  const source = stripComments(
    fs.readFileSync(entrypointPath, "utf8"),
    entrypointPath,
  );
  const imports: string[] = [];
  const importPattern = /^import\s+(["'])([^"'\\\r\n]+)\1\s*;?\s*$/;

  for (const [lineIndex, line] of source.split(/\r?\n/).entries()) {
    if (line.trim() === "") {
      continue;
    }

    const match = importPattern.exec(line.trim());
    if (match === null) {
      throw new Error(
        `${entrypointPath}:${lineIndex + 1}: only comments and static side-effect imports are allowed`,
      );
    }
    imports.push(match[2]);
  }

  return imports;
}

function isWithin(directory: string, filePath: string): boolean {
  const relativePath = path.relative(directory, filePath);
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`))
  );
}

function resolveCaseImport(
  specifier: string,
  entrypointPath: string,
  browserTestsDirectory: string,
): string {
  const unresolvedPath = path.resolve(path.dirname(entrypointPath), specifier);
  const extension = path.extname(unresolvedPath);
  const candidates =
    extension === ".ts" || extension === ".tsx"
      ? [unresolvedPath]
      : [`${unresolvedPath}.ts`, `${unresolvedPath}.tsx`];
  const existingTargets = candidates.filter((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

  if (existingTargets.length !== 1) {
    throw new Error(
      `${entrypointPath}: ${JSON.stringify(specifier)} must resolve to exactly one existing .ts or .tsx target`,
    );
  }

  const target = existingTargets[0];
  if (/\.test\.tsx?$/.test(target)) {
    if (isWithin(browserTestsDirectory, target)) {
      throw new Error(
        `${entrypointPath}: nested browser entrypoint import ${JSON.stringify(specifier)} is not allowed`,
      );
    }
    throw new Error(
      `${entrypointPath}: import of ordinary .test file ${JSON.stringify(specifier)} is not allowed`,
    );
  }
  if (!/\.browser\.case\.tsx?$/.test(target)) {
    throw new Error(
      `${entrypointPath}: ${JSON.stringify(specifier)} does not target a browser case`,
    );
  }

  return target;
}

function collectBrowserOwnership(srcDirectory: string): Ownership {
  const normalizedSrcDirectory = path.resolve(srcDirectory);
  const browserTestsDirectory = path.join(
    normalizedSrcDirectory,
    "browser-tests",
  );
  const discoveredCases = collectFiles(normalizedSrcDirectory, (filePath) =>
    /\.browser\.case\.tsx?$/.test(filePath),
  );
  const entrypoints = collectFiles(browserTestsDirectory, (filePath) =>
    /\.test\.ts$/.test(filePath),
  );
  const importedCases = entrypoints.flatMap((entrypointPath) =>
    parseStaticSideEffectImports(entrypointPath).map((specifier) =>
      resolveCaseImport(specifier, entrypointPath, browserTestsDirectory),
    ),
  );

  return { discoveredCases, importedCases };
}

function createFixture(files: Record<string, string>): string {
  const fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "browser-entrypoints-"),
  );
  temporaryDirectories.push(fixtureDirectory);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(fixtureDirectory, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  return fixtureDirectory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("browser entrypoint ownership", () => {
  test("accepts comments and static side-effect imports", () => {
    const srcDirectory = createFixture({
      "browser-tests/group.test.ts": `
        // Group cases that share safe setup.
        import /* first case */ "../components/First.browser.case";
        import '../components/Second.browser.case'
      `,
      "components/First.browser.case.ts": "",
      "components/Second.browser.case.tsx": "",
    });

    const ownership = collectBrowserOwnership(srcDirectory);
    const expectedCases = [
      path.join(srcDirectory, "components/First.browser.case.ts"),
      path.join(srcDirectory, "components/Second.browser.case.tsx"),
    ];

    expect(ownership.discoveredCases).toEqual(expectedCases);
    expect(ownership.importedCases).toEqual(expectedCases);
  });

  test("detects an unowned browser case", () => {
    const srcDirectory = createFixture({
      "browser-tests/owned.test.ts":
        'import "../components/Owned.browser.case";\n',
      "components/Owned.browser.case.ts": "",
      "components/Unowned.browser.case.tsx": "",
    });

    const { discoveredCases, importedCases } =
      collectBrowserOwnership(srcDirectory);

    expect([...importedCases].sort()).not.toEqual([...discoveredCases].sort());
  });

  test("detects a browser case imported more than once", () => {
    const srcDirectory = createFixture({
      "browser-tests/first.test.ts":
        'import "../components/Shared.browser.case";\n',
      "browser-tests/second.test.ts":
        'import "../components/Shared.browser.case";\n',
      "components/Shared.browser.case.ts": "",
    });

    const { importedCases } = collectBrowserOwnership(srcDirectory);

    expect(importedCases.length).not.toBe(new Set(importedCases).size);
  });

  test("rejects an import without exactly one existing TypeScript target", () => {
    const srcDirectory = createFixture({
      "browser-tests/missing.test.ts":
        'import "../components/Missing.browser.case";\n',
    });

    expect(() => collectBrowserOwnership(srcDirectory)).toThrow(
      /exactly one existing \.ts or \.tsx target/,
    );
  });

  test("rejects imports of ordinary test files", () => {
    const srcDirectory = createFixture({
      "browser-tests/ordinary.test.ts":
        'import "../components/Ordinary.test";\n',
      "components/Ordinary.test.tsx": "",
    });

    expect(() => collectBrowserOwnership(srcDirectory)).toThrow(
      /ordinary \.test file/,
    );
  });

  test("rejects imports of nested browser entrypoints", () => {
    const srcDirectory = createFixture({
      "browser-tests/outer.test.ts": 'import "./inner.test";\n',
      "browser-tests/inner.test.ts":
        'import "../components/Case.browser.case";\n',
      "components/Case.browser.case.ts": "",
    });

    expect(() => collectBrowserOwnership(srcDirectory)).toThrow(
      /nested browser entrypoint/,
    );
  });

  test.each([
    ["a named import", 'import { test } from "vitest";'],
    ["a default import", 'import helper from "./helper";'],
    ["a dynamic import", 'import("../components/Case.browser.case");'],
    ["an executable statement", "console.log('unexpected');"],
  ])("rejects %s", (_description, statement) => {
    const srcDirectory = createFixture({
      "browser-tests/invalid.test.ts": `${statement}\n`,
      "components/Case.browser.case.ts": "",
    });

    expect(() => collectBrowserOwnership(srcDirectory)).toThrow(
      /only comments and static side-effect imports/,
    );
  });

  test("owns every browser case in the repository exactly once", () => {
    const testFile = fileURLToPath(import.meta.url);
    const srcDirectory = path.resolve(path.dirname(testFile), "..");
    const { discoveredCases, importedCases } =
      collectBrowserOwnership(srcDirectory);

    expect(importedCases.length).toBeGreaterThan(0);
    expect(importedCases.length).toBe(new Set(importedCases).size);
    expect([...importedCases].sort()).toEqual([...discoveredCases].sort());
  });
});
