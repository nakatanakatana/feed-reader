import { describe, expect, it } from "vitest";
import { itemsCollection } from "./item-db";
import { itemStore } from "./item-store";

describe("items collection", () => {
  it("should be a singleton collection", () => {
    const col1 = itemsCollection;
    const col2 = itemsCollection;
    expect(col1).toBe(col2);
    expect(col1.id).toBe("items");
  });

  it("should maintain the same instance when filters change", () => {
    const col1 = itemsCollection;

    // Change store state
    const originalShowRead = itemStore.state.showRead;
    itemStore.setShowRead(!originalShowRead);
    const col2 = itemsCollection;
    expect(col1).toBe(col2);

    // Change date filter
    itemStore.setDateFilter("7d");
    const col3 = itemsCollection;
    expect(col1).toBe(col3);

    // Cleanup
    itemStore.setShowRead(originalShowRead);
    itemStore.setDateFilter("30d");
  });
});
