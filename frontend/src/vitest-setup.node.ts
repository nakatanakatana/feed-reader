import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { resetDatabase } from "./lib/db";
import { resetQueryClient } from "./lib/query";
import { resetState } from "./mocks/handlers";
import { server } from "./mocks/server";

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

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  resetState();
  resetDatabase();
  resetQueryClient();
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});
