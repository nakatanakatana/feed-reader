import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import {
  setLastFetched,
  setLastItemsSyncedAt,
  setLastReadFetched,
} from "./lib/item-sync-state";
import { queryClient } from "./lib/query";
import { resetState } from "./mocks/handlers";
import { server } from "./test-utils/api-server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  resetState();
});

afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  setLastFetched(null);
  setLastReadFetched(null);
  setLastItemsSyncedAt(null);
  localStorage.clear();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});
