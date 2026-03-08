import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { itemBlockRulesOptions, urlParsingRulesOptions } from "./block-db";
import { queryClient } from "./query";

describe("block-db", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle hooks", () => {
    it("urlParsingRules.onInsert should trigger invalidation", async () => {
      if (!urlParsingRulesOptions.onInsert)
        throw new Error("onInsert not defined");

      const transaction = {
        mutations: [
          {
            type: "insert",
            modified: {
              domain: "test.com",
              ruleType: "subdomain",
              pattern: "test",
            },
          },
        ],
      };

      // Mock queryClient.invalidateQueries is already spied in beforeEach
      // We don't easily mock the RPC call here but we can check if invalidation is called
      // Since it's an async call that might fail due to RPC, we catch it
      try {
        await urlParsingRulesOptions.onInsert({
          // biome-ignore lint/suspicious/noExplicitAny: mock
          transaction: transaction as any,
          // biome-ignore lint/suspicious/noExplicitAny: mock
          collection: {} as any,
        });
      } catch (_e) {
        // Expected to fail because RPC is not mocked, but invalidation should still be called if it's before or after
      }

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["url-rules"],
      });
    });

    it("itemBlockRules.onInsert should trigger invalidation", async () => {
      if (!itemBlockRulesOptions.onInsert)
        throw new Error("onInsert not defined");

      const transaction = {
        mutations: [
          {
            type: "insert",
            modified: { ruleType: "user", value: "bad-user" },
          },
        ],
      };

      try {
        await itemBlockRulesOptions.onInsert({
          // biome-ignore lint/suspicious/noExplicitAny: mock
          transaction: transaction as any,
          // biome-ignore lint/suspicious/noExplicitAny: mock
          collection: {} as any,
        });
      } catch (_e) {}

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["block-rules"],
      });
    });
  });
});
