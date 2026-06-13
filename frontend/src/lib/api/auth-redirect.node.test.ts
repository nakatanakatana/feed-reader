/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  redirectOnUnauthorized,
  resetUnauthorizedRedirectGuard,
} from "./auth-redirect";

describe("redirectOnUnauthorized", () => {
  afterEach(() => {
    resetUnauthorizedRedirectGuard();
    vi.restoreAllMocks();
  });

  it("assigns / when not on home", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/feeds",
      assign,
      reload: vi.fn(),
    });

    redirectOnUnauthorized();

    expect(assign).toHaveBeenCalledWith("/");
  });

  it("reloads when already on /", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/",
      assign: vi.fn(),
      reload,
    });

    redirectOnUnauthorized();

    expect(reload).toHaveBeenCalled();
  });

  it("ignores subsequent calls (guard)", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/feeds",
      assign,
      reload: vi.fn(),
    });

    redirectOnUnauthorized();
    redirectOnUnauthorized();

    expect(assign).toHaveBeenCalledTimes(1);
  });
});
