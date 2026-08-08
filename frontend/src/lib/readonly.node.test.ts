import { afterEach, describe, expect, it, vi } from "vitest";

describe("isReadOnly", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns true when VITE_READONLY is true", async () => {
    vi.stubEnv("VITE_READONLY", "true");
    const { isReadOnly } = await import("./readonly");
    const { getConfig } = await import("../config");

    expect(isReadOnly()).toBe(true);
    expect(getConfig().readOnly).toBe(true);
  });

  it("returns false by default after module reset", async () => {
    vi.resetModules();
    const { isReadOnly } = await import("./readonly");
    const { getConfig } = await import("../config");

    expect(isReadOnly()).toBe(false);
    expect(getConfig().readOnly).toBe(false);
  });
});
