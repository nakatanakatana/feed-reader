import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as queryLib from "./query";
import { toast } from "./toast";

describe("Query Setup", () => {
  beforeEach(() => {
    vi.spyOn(toast, "show");
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
    queryCache.config.onError?.(
      new Error("test error"),
      // biome-ignore lint/suspicious/noExplicitAny: testing internal interface
      {} as any,
    );
    expect(toast.show).toHaveBeenCalledWith(
      "An error occurred. Please try again.",
      "error",
    );
  });

  it("should trigger toast on MutationCache error", () => {
    const mutationCache = queryLib.queryClient.getMutationCache();
    mutationCache.config.onError?.(
      new Error("test error"),
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
});
