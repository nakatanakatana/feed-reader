import { afterAll, afterEach, beforeAll, vi } from "vitest";
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
