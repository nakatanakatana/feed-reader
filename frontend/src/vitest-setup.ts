import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { worker } from "./mocks/browser";

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  worker.resetHandlers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

afterAll(() => {
  worker.stop();
});
