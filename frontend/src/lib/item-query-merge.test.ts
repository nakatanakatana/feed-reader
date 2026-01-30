import { describe, expect, it, beforeEach } from "vitest";
import { items, unreadItems, readItems, Item } from "./db";
import { getMergedItemsQuery } from "./item-query";
import { queryClient } from "./query";

describe("Item Collection Filtering", () => {
  beforeEach(() => {
    queryClient.clear();
    const k1 = [...items.keys()];
    if (k1.length) items.delete(k1);
  });

  it("unreadItems and readItems should filter correctly from items collection", async () => {
    const item1: Item = {
      id: "1",
      url: "http://example.com/1",
      title: "Item 1",
      description: "",
      publishedAt: "",
      author: "",
      feedId: "f1",
      isRead: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const item2: Item = {
      id: "2",
      url: "http://example.com/2",
      title: "Item 2",
      description: "",
      publishedAt: "",
      author: "",
      feedId: "f1",
      isRead: true,
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    };

    items.insert([item1, item2]);

    // Wait for live queries
    await unreadItems.toArrayWhenReady();
    await readItems.toArrayWhenReady();

    expect(unreadItems.toArray).toHaveLength(1);
    expect(unreadItems.toArray[0].id).toBe("1");

    expect(readItems.toArray).toHaveLength(1);
    expect(readItems.toArray[0].id).toBe("2");

    // Test merging via LiveQuery (getMergedItemsQuery)
    const mergedQuery = getMergedItemsQuery();
    await mergedQuery.toArrayWhenReady();
    const mergedResults = mergedQuery.toArray;
    expect(mergedResults).toHaveLength(2);
    expect(mergedResults[0].id).toBe("1"); // Oldest first
    expect(mergedResults[1].id).toBe("2");
  });
});