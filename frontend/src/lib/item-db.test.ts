import { describe, expect, it, vi } from "vitest";
import { createRoot } from "solid-js";
import { items } from "./item-db";
import { itemStore } from "./item-store";

// Mock dependencies if needed, but for now we rely on the real item-db
// which uses queryClient. We might need to mock queryClient if it tries to fetch on creation.
// createCollection usually sets up listeners but might not fetch immediately unless queried.

describe("items collection reactivity", () => {
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
