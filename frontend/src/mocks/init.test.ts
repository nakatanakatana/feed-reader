import { describe, it, expect, vi } from "vitest";
import { initMocks } from "./init";
import { worker } from "./browser";

describe("initMocks", () => {
  it("should start the worker if useMocks is true", async () => {
    // Spy on the worker's start method
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined as any);

    const config = { useMocks: true };
    await initMocks(config);

    expect(startSpy).toHaveBeenCalledWith({
      onUnhandledRequest: "bypass",
    });

    startSpy.mockRestore();
  });

  it("should NOT start the worker if useMocks is false", async () => {
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined as any);

    const config = { useMocks: false };
    await initMocks(config);

    expect(startSpy).not.toHaveBeenCalled();

    startSpy.mockRestore();
  });
});
