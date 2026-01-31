import { describe, expect, it, beforeEach, vi } from "vitest";
import { unreadItems, readItems, items, Item, updateItemStatus } from "./db";
import { queryClient } from "./query";
import { worker } from "../mocks/browser";
import { mockConnectWeb } from "../mocks/connect";
import { ItemService, ListItemsResponseSchema, ItemSchema } from "../gen/item/v1/item_pb";
import { create } from "@bufbuild/protobuf";

describe("db refactoring", () => {
  beforeEach(() => {
    queryClient.clear();
    const k1 = [...items.keys()];
    if (k1.length) items.delete(k1);
    const k2 = [...unreadItems.keys()];
    if (k2.length) unreadItems.delete(k2);
    const k3 = [...readItems.keys()];
    if (k3.length) readItems.delete(k3);
  });
  
  it("should have unreadItems collection", () => {
    expect(unreadItems).toBeDefined();
  });

  it("should have readItems collection", () => {
    expect(readItems).toBeDefined();
  });

  it("should synchronize items between collections when updateItemStatus is called", async () => {
    const testItem: Item = {
      id: "test-1",
      url: "http://example.com",
      title: "Test Item",
      description: "Test Description",
      publishedAt: new Date().toISOString(),
      author: "Test Author",
      feedId: "feed-1",
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mock MSW
    worker.use(
      mockConnectWeb(ItemService)({
        method: "listItems",
        handler: (req) => {
          return create(ListItemsResponseSchema, {
            items: [
              create(ItemSchema, { ...testItem, isRead: req.isRead ?? false })
            ],
            totalCount: 1,
          });
        },
      })
    );

    // Manually populate both main and derived collections for the test
    items.insert(testItem);
    unreadItems.insert(testItem);

    expect(items.get("test-1")).toBeDefined();
    expect(unreadItems.get("test-1")).toBeDefined();
    expect(readItems.get("test-1")).toBeUndefined();

    // Mock invalidateQueries to avoid refetch wiping out optimistic state
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockImplementation(() => Promise.resolve());

    // Call updateItemStatus
    await updateItemStatus({ ids: ["test-1"], isRead: true });

    // Wait a bit for everything to settle
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(items.get("test-1")?.isRead).toBe(true);
    expect(unreadItems.get("test-1")).toBeUndefined();
    expect(readItems.get("test-1")).toBeDefined();
    expect(readItems.get("test-1")?.isRead).toBe(true);

    invalidateSpy.mockRestore();
  });
});