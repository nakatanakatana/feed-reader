import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { type Item, items, sortedItems } from "./item-db";
import { itemStore } from "./item-store";

describe("items collection", () => {
  describe("reactivity", () => {
    it("should return a new collection when filters change", () => {
      createRoot(() => {
        const collection1 = items();

        // Change store state
        itemStore.setShowRead(!itemStore.state.showRead);

        const collection2 = items();

        expect(collection1).not.toBe(collection2);

        // Change date filter
        itemStore.setDateFilter("7d");

        const collection3 = items();
        expect(collection3).not.toBe(collection2);
      });
    });

    it("should return the same collection if filters are the same", () => {
      createRoot(() => {
        const collection1 = items();
        const collection2 = items();
        expect(collection1).toBe(collection2);
      });
    });
  });

  describe("sorting", () => {
    it("should be defined as a reactive collection", () => {
      expect(sortedItems).toBeDefined();
      createRoot(() => {
        const col = sortedItems();
        expect(col).toBeDefined();
      });
    });
  });
});
