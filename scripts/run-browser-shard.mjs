import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_BROWSER_API_PORT = 63315;

function usage() {
  return `Usage: npm run test:browser:shard -- --index <index> --count <count>

Environment variables:
  SHARD_INDEX               1-based shard index (overridden by --index)
  SHARD_COUNT               total shard count (overridden by --count)
  VITEST_BROWSER_API_PORT   base Browser API port (default: ${DEFAULT_BROWSER_API_PORT})

Options:
  --index <number>          1-based shard index
  --count <number>          total number of shards
  --dry-run                 print the Vitest command without starting Chromium
  --help                    show this help
`;
}

function parsePositiveInteger(value, name) {
  if (!/^[1-9]\d*$/.test(value ?? "")) {
    throw new Error(
      `${name} must be a positive integer, got ${JSON.stringify(value)}`,
    );
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new Error(
      `${name} must be a safe integer, got ${JSON.stringify(value)}`,
    );
  }
  return number;
}

function parseArguments(argv, env) {
  let index = env.SHARD_INDEX;
  let count = env.SHARD_COUNT;
  let dryRun = false;

  for (let position = 0; position < argv.length; position += 1) {
    const argument = argv[position];
    if (argument === "--dry-run") {
      dryRun = true;
    } else if (argument === "--help") {
      return { help: true };
    } else if (argument === "--index" || argument === "--count") {
      const value = argv[position + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a value`);
      }
      if (argument === "--index") index = value;
      else count = value;
      position += 1;
    } else if (argument.startsWith("--index=")) {
      index = argument.slice("--index=".length);
    } else if (argument.startsWith("--count=")) {
      count = argument.slice("--count=".length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (index === undefined || count === undefined) {
    throw new Error("SHARD_INDEX/--index and SHARD_COUNT/--count are required");
  }

  const shardIndex = parsePositiveInteger(index, "shard index");
  const shardCount = parsePositiveInteger(count, "shard count");
  if (shardIndex > shardCount) {
    throw new Error(
      `shard index must be at most shard count, got ${shardIndex}/${shardCount}`,
    );
  }

  const basePort = parsePositiveInteger(
    env.VITEST_BROWSER_API_PORT ?? String(DEFAULT_BROWSER_API_PORT),
    "VITEST_BROWSER_API_PORT",
  );
  const browserApiPort = basePort + shardIndex - 1;
  if (browserApiPort > 65535) {
    throw new Error(
      `Browser API port must be at most 65535, got ${browserApiPort}`,
    );
  }

  return { browserApiPort, dryRun, shardCount, shardIndex, help: false };
}

function createVitestArguments({ shardCount, shardIndex }) {
  return [
    "run",
    "--project",
    "browser",
    `--shard=${shardIndex}/${shardCount}`,
    "--reporter=blob",
    "--config",
    "scripts/vite-browser-shard.config.mjs",
  ];
}

function run() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2), process.env);
  } catch (error) {
    console.error(`run-browser-shard: ${error.message}`);
    console.error(usage());
    return 2;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }

  const vitestArguments = createVitestArguments(options);
  const executable = process.platform === "win32" ? "vitest.cmd" : "vitest";
  if (options.dryRun) {
    console.log(`VITEST_BROWSER_API_PORT=${options.browserApiPort}`);
    console.log([executable, ...vitestArguments].join(" "));
    return 0;
  }

  const child = spawn(executable, vitestArguments, {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      VITEST_BROWSER_API_PORT: String(options.browserApiPort),
    },
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(
      `run-browser-shard: failed to start Vitest: ${error.message}`,
    );
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  return undefined;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const exitCode = run();
  if (exitCode !== undefined) process.exitCode = exitCode;
}

export { createVitestArguments, parseArguments };
