import type { Transport } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ItemService } from "../gen/item/v1/item_pb";
import type { ListItemsResponse } from "../gen/item/v1/item_pb";
import { Timestamp } from "@bufbuild/protobuf/wkt";
import {
  fetchItems,
  itemKeys,
  itemsInfiniteQueryOptions,
  updateItemStatus,
} from "./item-query";

// Mock the transport and client
const mockClient = {
  listItems: vi.fn(),
  updateItemStatus: vi.fn(),
};

vi.mock("@connectrpc/connect", () => ({
  createClient: vi.fn(() => mockClient),
}));

describe("Item Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate correct query keys", () => {
    expect(itemKeys.all).toEqual(["items"]);
    expect(itemKeys.list({ feedId: "123" })).toEqual([
      "items",
      "list",
      { feedId: "123" },
    ]);
    expect(itemKeys.list({})).toEqual(["items", "list", {}]);
  });

  it("should fetch items using the client", async () => {
    const mockResponse = {
      items: [{ id: "1", title: "Test Item" }],
      totalCount: 1,
    };
    mockClient.listItems.mockResolvedValue(mockResponse);

    const transport = {} as unknown as Transport; // Mock transport
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

  it("should fetch items with publishedSince filter", async () => {
    const mockResponse = { items: [], totalCount: 0 };
    mockClient.listItems.mockResolvedValue(mockResponse);

    const transport = {} as unknown as Transport;
    const since = { seconds: BigInt(1234567890), nanos: 0 } as Timestamp;
    const params = { publishedSince: since };

    await fetchItems(transport, params);

    expect(mockClient.listItems).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedSince: since,
      }),
    );
  });

  it("should generate correct infinite query options", () => {
    const transport = {} as unknown as Transport;
    const options = itemsInfiniteQueryOptions(transport, { feedId: "123" });

    expect(options.queryKey).toEqual(["items", "list", { feedId: "123" }]);
    expect(options.initialPageParam).toBe(0);

    // Test getNextPageParam
    const lastPage = {
      items: new Array(20).fill({}),
      totalCount: 100,
    } as unknown as ListItemsResponse;
    const allPages = [lastPage];
    const allPageParams = [0];
    // offset 0, limit 20 (default) -> next offset 20
    const nextParam = options.getNextPageParam(
      lastPage,
      allPages,
      0,
      allPageParams,
    );
    expect(nextParam).toBe(20);

    // Test end of list
    const emptyPage = {
      items: [],
      totalCount: 100,
    } as unknown as ListItemsResponse;
    const _endParam = options.getNextPageParam(
      emptyPage,
      [...allPages, emptyPage],
      20,
      [...allPageParams, 20],
    );
  });

  it("should update item status", async () => {
    mockClient.updateItemStatus.mockResolvedValue({});
    const transport = {} as unknown as Transport;
    const params = { ids: ["1"], isRead: true };

    await updateItemStatus(transport, params);

    expect(mockClient.updateItemStatus).toHaveBeenCalledWith({
      ids: ["1"],
      isRead: true,
    });
  });
});
