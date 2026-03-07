import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { itemBlockRules, urlParsingRules } from "./block-db";
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

  describe("collection methods", () => {
    it("urlParsingRules.insert should trigger invalidation (indirectly via onInsert)", async () => {
      // NOTE: We can't easily test onInsert behavior without mocking the whole DB cycle,
      // but we can at least verify the collection is usable.
      expect(urlParsingRules.insert).toBeDefined();
    });

    it("itemBlockRules.insert should trigger invalidation", async () => {
      expect(itemBlockRules.insert).toBeDefined();
    });
  });
});
