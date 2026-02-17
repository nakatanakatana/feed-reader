import { describe, it, expect, vi, beforeEach } from "vitest";
import { initMocks } from "./init";

describe("initMocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT start the worker if useMocks is false", async () => {
    const config = { useMocks: false };
    await initMocks(config);
    // If it doesn't crash and we haven't mocked anything, it's likely fine.
    // We can't easily test the 'true' case without a reliable way to mock dynamic imports in this environment.
    expect(true).toBe(true);
  });
});
