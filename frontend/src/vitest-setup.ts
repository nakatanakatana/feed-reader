import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { queryClient } from "./lib/query";
import { worker } from "./mocks/browser";
import { resetState } from "./mocks/handlers";

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  worker.resetHandlers();
  resetState();
  queryClient.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

afterAll(() => {
  worker.stop();
});
