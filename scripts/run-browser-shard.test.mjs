import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createVitestArguments, parseArguments } from "./run-browser-shard.mjs";

const runner = fileURLToPath(
  new URL("./run-browser-shard.mjs", import.meta.url),
);

test("builds an isolated browser shard command without starting Chromium", () => {
  const options = parseArguments(["--dry-run"], {
    SHARD_INDEX: "2",
    SHARD_COUNT: "3",
    VITEST_BROWSER_API_PORT: "4100",
  });
  const result = createVitestArguments(options).join(" ");

  assert.equal(options.browserApiPort, 4101);
  assert.match(result, /--project browser/);
  assert.match(result, /--shard=2\/3/);
  assert.match(result, /--reporter=blob/);
  assert.match(result, /--config scripts\/vite-browser-shard\.config\.mjs/);
});

test("rejects a shard index outside the shard count", () => {
  assert.throws(
    () => parseArguments(["--index", "4", "--count", "3"], {}),
    /shard index must be at most shard count/,
  );
});

test("rejects values outside the safe integer range", () => {
  assert.throws(
    () => parseArguments(["--index", "9007199254740992", "--count", "3"], {}),
    /shard index must be a safe integer/,
  );
});

test("runs the runner dry-run through a child process without starting Vitest", () => {
  const result = spawnSync(
    process.execPath,
    [runner, "--dry-run", "--index", "2", "--count", "3"],
    {
      env: {
        ...process.env,
        VITEST_BROWSER_API_PORT: "4100",
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.signal, null);
  assert.match(result.stdout, /VITEST_BROWSER_API_PORT=4101/);
  assert.match(result.stdout, /--shard=2\/3/);
  assert.match(result.stdout, /--reporter=blob/);
  assert.match(
    result.stdout,
    /--config scripts\/vite-browser-shard\.config\.mjs/,
  );
});
