import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { resetDatabase } from "./lib/db";
import { worker } from "./mocks/browser";
import { resetState } from "./mocks/handlers";

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
