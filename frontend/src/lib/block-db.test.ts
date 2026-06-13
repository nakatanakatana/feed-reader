import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  itemBlockRuleDelete,
  itemBlockRuleInsert,
  itemBlockRulesQueryOptions,
  urlParsingRuleDelete,
  urlParsingRuleInsert,
  urlParsingRulesQueryOptions,
} from "./block-db";
import { queryClient } from "./query";

describe("block-db", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("query options", () => {
    it("urlParsingRulesQueryOptions should be defined", () => {
      expect(urlParsingRulesQueryOptions).toBeDefined();
      expect(urlParsingRulesQueryOptions.queryKey).toEqual(["url-rules"]);
    });

    it("itemBlockRulesQueryOptions should be defined", () => {
      expect(itemBlockRulesQueryOptions).toBeDefined();
      expect(itemBlockRulesQueryOptions.queryKey).toEqual(["block-rules"]);
    });
  });

  describe("helpers", () => {
    it("urlParsingRuleInsert should complete successfully and invalidate queries", async () => {
      await urlParsingRuleInsert("example.com", "subdomain", "");

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["url-rules"],
      });
    });

    it("urlParsingRuleDelete should complete successfully and invalidate queries", async () => {
      await urlParsingRuleDelete("1");

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["url-rules"],
      });
    });

    it("itemBlockRuleInsert should complete successfully and invalidate queries", async () => {
      const rules = [{ ruleType: "domain", value: "example.com" }];
      await itemBlockRuleInsert(rules);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["block-rules"],
      });
    });

    it("itemBlockRuleDelete should complete successfully and invalidate queries", async () => {
      await itemBlockRuleDelete("1");

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["block-rules"],
      });
    });
  });
});
