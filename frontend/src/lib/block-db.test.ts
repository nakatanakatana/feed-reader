import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  itemBlockRuleDelete,
  itemBlockRuleInsert,
  itemBlockRules,
  urlParsingRuleDelete,
  urlParsingRuleInsert,
  urlParsingRules,
} from "./block-db";
import { queryClient } from "./query";

describe("block-db", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("collections", () => {
    it("urlParsingRules collection should be defined", () => {
      expect(urlParsingRules).toBeDefined();
    });

    it("itemBlockRules collection should be defined", () => {
      expect(itemBlockRules).toBeDefined();
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
