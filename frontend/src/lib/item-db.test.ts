import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { items, sortedItems } from "./item-db";
import { itemStore } from "./item-store";

describe("items collection", () => {
  beforeEach(() => {
    itemStore.setShowRead(false);
    itemStore.setDateFilter("30d");
  });

  afterEach(() => {
    itemStore.setShowRead(false);
    itemStore.setDateFilter("30d");
  });

  describe("reactivity", () => {
    it("should return a new collection when filters change", () => {
      const dispose = createRoot((dispose) => {
        const collection1 = items();

        // Change store state
        itemStore.setShowRead(!itemStore.state.showRead);

        const collection2 = items();

        expect(collection1).not.toBe(collection2);

        // Change date filter
        itemStore.setDateFilter("7d");

        const collection3 = items();
        expect(collection3).not.toBe(collection2);

        return dispose;
      });
      dispose();
    });

    it("should return the same collection if filters are the same", () => {
      const dispose = createRoot((dispose) => {
        const collection1 = items();
        const collection2 = items();
        expect(collection1).toBe(collection2);
        return dispose;
      });
      dispose();
    });
  });

  describe("sorting", () => {
    it("should be defined as a reactive collection", () => {
      expect(sortedItems).toBeDefined();
      const dispose = createRoot((dispose) => {
        const col = sortedItems();
        expect(col).toBeDefined();
        return dispose;
      });
      dispose();
    });
  });
});
