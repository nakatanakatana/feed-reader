import { afterEach, describe, expect, it, vi } from "vitest";
import { initMocks } from "./init";

describe("initMocks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should start the worker if useMocks is true in dev", async () => {
    vi.stubEnv("DEV", true);

    const { worker } = await import("./browser");
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined);

    await initMocks({ useMocks: true });

    expect(startSpy).toHaveBeenCalledWith({
      onUnhandledRequest: "bypass",
    });

    startSpy.mockRestore();
  });

  it("should NOT start the worker if useMocks is false", async () => {
    vi.stubEnv("DEV", true);

    const { worker } = await import("./browser");
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined);

    await initMocks({ useMocks: false });

    expect(startSpy).not.toHaveBeenCalled();
    startSpy.mockRestore();
  });

  it("should NOT start the worker if useMocks is true outside dev", async () => {
    vi.stubEnv("DEV", false);

    const { worker } = await import("./browser");
    const startSpy = vi.spyOn(worker, "start").mockResolvedValue(undefined);

    await initMocks({ useMocks: true });

    expect(startSpy).not.toHaveBeenCalled();
    startSpy.mockRestore();
  });
});
