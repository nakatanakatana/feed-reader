import { Code, ConnectError } from "@connectrpc/connect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import * as queryLib from "./query";
import { ERROR_TOAST_ELIGIBLE, errorInterceptor } from "./query";
import { toast } from "./toast";

describe("Query Setup", () => {
  beforeEach(() => {
    vi.spyOn(toast, "show").mockImplementation(() => "");
    toast.clear();
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

  describe("errorInterceptor", () => {
    it("should mark transport errors with ERROR_TOAST_ELIGIBLE and not call toast.show directly", async () => {
      const error = new ConnectError("unavailable", Code.Unavailable);
      const next = vi.fn().mockRejectedValue(error);
      const req = {
        url: "/test",
        method: "POST",
        header: new Headers(),
        body: {},
      };

      // biome-ignore lint/suspicious/noExplicitAny: testing internal interceptor interface
      await expect(errorInterceptor(next)(req as any)).rejects.toThrow("unavailable");

      // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
      expect((error as any)[ERROR_TOAST_ELIGIBLE]).toBe(true);
      expect(toast.show).not.toHaveBeenCalled();
    });

    it("should NOT mark application errors (e.g. PermissionDenied)", async () => {
      const error = new ConnectError("denied", Code.PermissionDenied);
      const next = vi.fn().mockRejectedValue(error);
      const req = {
        url: "/test",
        method: "POST",
        header: new Headers(),
        body: {},
      };

      // biome-ignore lint/suspicious/noExplicitAny: testing internal interceptor interface
      await expect(errorInterceptor(next)(req as any)).rejects.toThrow("denied");

      // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
      expect((error as any)[ERROR_TOAST_ELIGIBLE]).toBeUndefined();
    });

    it("should pass through successful requests", async () => {
      const res = { stream: false, header: new Headers(), message: {} };
      const next = vi.fn().mockResolvedValue(res);
      const req = {
        url: "/test",
        method: "POST",
        header: new Headers(),
        body: {},
      };

      // biome-ignore lint/suspicious/noExplicitAny: testing internal interceptor interface
      const result = await errorInterceptor(next)(req as any);
      expect(result).toBe(res);
      expect(toast.show).not.toHaveBeenCalled();
    });
  });

  it("should trigger toast on QueryCache error", () => {
    const queryCache = queryLib.queryClient.getQueryCache();
    const error = new Error("test error");
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (error as any)[ERROR_TOAST_ELIGIBLE] = true;

    queryCache.config.onError?.(
      error,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      { state: { fetchStatus: "idle" } } as any,
    );
    expect(toast.show).toHaveBeenCalledWith("An error occurred. Please try again.", "error");
  });

  it("should trigger toast on MutationCache error", () => {
    const mutationCache = queryLib.queryClient.getMutationCache();
    const error = new Error("test error");
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (error as any)[ERROR_TOAST_ELIGIBLE] = true;

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
    expect(toast.show).toHaveBeenCalledWith("An error occurred. Please try again.", "error");
  });

  it("should only trigger toast on terminal failure (retry deduplication)", () => {
    const queryCache = queryLib.queryClient.getQueryCache();
    const error = new Error("retry error");
    // biome-ignore lint/suspicious/noExplicitAny: using Symbol to mark handled errors
    (error as any)[ERROR_TOAST_ELIGIBLE] = true;

    // Simulate first failure (retrying)
    queryCache.config.onError?.(
      error,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      { state: { fetchStatus: "fetching" } } as any,
    );
    expect(toast.show).not.toHaveBeenCalled();

    // Simulate final failure (terminal)
    queryCache.config.onError?.(
      error,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      { state: { fetchStatus: "idle" } } as any,
    );
    expect(toast.show).toHaveBeenCalledTimes(1);
  });

  it("should not trigger toast for non-transport errors", () => {
    const queryCache = queryLib.queryClient.getQueryCache();
    const appError = new Error("application error");

    queryCache.config.onError?.(
      appError,
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      { state: { fetchStatus: "idle" } } as any,
    );
    expect(toast.show).not.toHaveBeenCalled();
  });
});
