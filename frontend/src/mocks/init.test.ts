import { describe, expect, it, vi } from "vitest";
import { worker } from "./browser";
import { initMocks } from "./init";

describe("initMocks", () => {
  it("should start the worker if useMocks is true", async () => {
    // Spy on the worker's start method
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined);

    const config = { useMocks: true };
    await initMocks(config);

    expect(startSpy).toHaveBeenCalledWith({
      onUnhandledRequest: "bypass",
    });

    startSpy.mockRestore();
  });

  it("should NOT start the worker if useMocks is false", async () => {
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined);

    const config = { useMocks: false };
    await initMocks(config);

    expect(startSpy).not.toHaveBeenCalled();

    startSpy.mockRestore();
  });
});
