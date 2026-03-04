import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as queryLib from "./query";
import { toast } from "./toast";

describe("Query Setup", () => {
  beforeEach(() => {
    vi.spyOn(toast, "show").mockImplementation(() => "");
    // Clear global toasts before each test
    const currentToasts = toast.toasts();
    for (const t of currentToasts) {
      toast.dismiss(t.id);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should export a configured queryClient", () => {
    expect(queryLib.queryClient).toBeDefined();
  });

  it("should export a configured transport", () => {
    expect(queryLib.transport).toBeDefined();
  });

  it("should trigger toast on QueryCache error", () => {
    const queryCache = queryLib.queryClient.getQueryCache();
    const error = new Error("test error");
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (error as any)[Symbol.for("TOAST_SHOWN")] = true;

    queryCache.config.onError?.(
      error,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      { state: { fetchStatus: "idle" } } as any,
    );
    expect(toast.show).toHaveBeenCalledWith(
      "An error occurred. Please try again.",
      "error",
    );
  });

  it("should trigger toast on MutationCache error", () => {
    const mutationCache = queryLib.queryClient.getMutationCache();
    const error = new Error("test error");
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (error as any)[Symbol.for("TOAST_SHOWN")] = true;

    mutationCache.config.onError?.(
      error,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      {} as any,
    );
    expect(toast.show).toHaveBeenCalledWith(
      "An error occurred. Please try again.",
      "error",
    );
  });

  it("should only trigger toast on terminal failure (retry deduplication)", () => {
    const queryCache = queryLib.queryClient.getQueryCache();
    const error = new Error("retry error");
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (error as any)[Symbol.for("TOAST_SHOWN")] = true;

    // Simulate first failure (retrying)
    queryCache.config.onError?.(error, {
      state: { fetchStatus: "fetching" },
    } as any);
    expect(toast.show).not.toHaveBeenCalled();

    // Simulate final failure (terminal)
    queryCache.config.onError?.(error, {
      state: { fetchStatus: "idle" },
    } as any);
    expect(toast.show).toHaveBeenCalledTimes(1);
  });

  it("should not trigger toast for non-transport errors", () => {
    const queryCache = queryLib.queryClient.getQueryCache();
    const appError = new Error("application error");

    queryCache.config.onError?.(appError, {
      state: { fetchStatus: "idle" },
    } as any);
    expect(toast.show).not.toHaveBeenCalled();
  });
});
