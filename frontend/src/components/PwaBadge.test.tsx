import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaBadge } from "./PwaBadge";

describe("PwaBadge", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      setAppBadge: vi.fn().mockResolvedValue(undefined),
      clearAppBadge: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("calls setAppBadge when unreadCount > 0", async () => {
    render(() => <PwaBadge unreadCount={5} />, document.body);

    await expect.poll(() => navigator.setAppBadge).toHaveBeenCalledWith(5);
  });

  it("calls clearAppBadge when unreadCount === 0", async () => {
    render(() => <PwaBadge unreadCount={0} />, document.body);

    await expect.poll(() => navigator.clearAppBadge).toHaveBeenCalled();
  });

  it("updates badge when unreadCount changes", async () => {
    const [unreadCount, setUnreadCount] = createSignal(5);
    render(() => <PwaBadge unreadCount={unreadCount()} />, document.body);

    await expect.poll(() => navigator.setAppBadge).toHaveBeenCalledWith(5);

    setUnreadCount(10);
    await expect.poll(() => navigator.setAppBadge).toHaveBeenCalledWith(10);

    setUnreadCount(0);
    await expect.poll(() => navigator.clearAppBadge).toHaveBeenCalled();
  });

  it("does not crash if Badging API is not supported", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      setAppBadge: undefined,
      clearAppBadge: undefined,
    });

    render(() => <PwaBadge unreadCount={5} />, document.body);
    // Should not throw
  });
});
