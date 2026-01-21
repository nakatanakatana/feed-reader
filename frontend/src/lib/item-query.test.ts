import { createClient } from "@connectrpc/connect";
import { describe, expect, it, vi } from "vitest";
import { ItemService } from "../gen/item/v1/item_connect";
import { itemKeys, fetchItems, itemsInfiniteQueryOptions, updateItemStatus } from "./item-query";

// Mock the transport and client
const mockClient = {
  listItems: vi.fn(),
  updateItemStatus: vi.fn(),
};

vi.mock("@connectrpc/connect", () => ({
  createClient: vi.fn(() => mockClient),
}));

describe("Item Queries", () => {
  it("should generate correct query keys", () => {
    expect(itemKeys.all).toEqual(["items"]);
    expect(itemKeys.list({ feedId: "123" })).toEqual(["items", "list", { feedId: "123" }]);
    expect(itemKeys.list({})).toEqual(["items", "list", {}]);
  });

  it("should fetch items using the client", async () => {
    const mockResponse = {
      items: [{ id: "1", title: "Test Item" }],
      totalCount: 1,
    };
    mockClient.listItems.mockResolvedValue(mockResponse);

    const transport = {} as any; // Mock transport
    const params = { feedId: "123", limit: 10, offset: 0 };

    const result = await fetchItems(transport, params);

    expect(createClient).toHaveBeenCalledWith(ItemService, transport);
    expect(mockClient.listItems).toHaveBeenCalledWith({
      feedId: "123",
      limit: 10,
      offset: 0,
      sortOrder: 0, // UNSPECIFIED
    });
    expect(result).toEqual(mockResponse);
  });

  it("should generate correct infinite query options", () => {
    const transport = {} as any;
    const options = itemsInfiniteQueryOptions(transport, { feedId: "123" });
    
    expect(options.queryKey).toEqual(["items", "list", { feedId: "123" }]);
    expect(options.initialPageParam).toBe(0);
    
    // Test getNextPageParam
    const lastPage = { items: new Array(20).fill({}), totalCount: 100 } as any;
    const allPages = [lastPage];
    // offset 0, limit 20 (default) -> next offset 20
    const nextParam = options.getNextPageParam(lastPage, allPages, 0);
    expect(nextParam).toBe(20);

    // Test end of list
    const emptyPage = { items: [], totalCount: 100 } as any;
    const endParam = options.getNextPageParam(emptyPage, [...allPages, emptyPage], 20);
    expect(endParam).toBeUndefined();
  });

  it("should update item status", async () => {
    mockClient.updateItemStatus.mockResolvedValue({});
    const transport = {} as any;
    const params = { ids: ["1"], isRead: true };

    await updateItemStatus(transport, params);

    expect(mockClient.updateItemStatus).toHaveBeenCalledWith({
      ids: ["1"],
      isRead: true,
    });
  });
});
