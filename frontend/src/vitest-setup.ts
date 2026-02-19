import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import "./styles.css";
import { resetDatabase } from "./lib/db";
import { worker } from "./mocks/browser";
import { resetState } from "./mocks/handlers";

// Force UTC timezone for consistent snapshot testing
const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
) {
  return originalToLocaleString.call(this, locales || "en-US", {
    ...options,
    timeZone: "UTC",
  });
};

// Custom snapshot serializer to format HTML strings
expect.addSnapshotSerializer({
  test: (val) =>
    typeof document !== "undefined" &&
    typeof val === "string" &&
    val.trim().startsWith("<") &&
    val.trim().endsWith(">"),
  print: (val, serialize) => {
    const template = document.createElement("template");
    template.innerHTML = (val as string).trim();
    return serialize(template.content);
  },
});

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  worker.resetHandlers();
  resetState();
  resetDatabase();
  vi.useRealTimers();
  vi.clearAllMocks();
});

afterAll(() => {
  worker.stop();
});
