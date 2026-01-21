import { createClient } from "@connectrpc/connect";
import { describe, expect, it, vi } from "vitest";
import { ItemService } from "../gen/item/v1/item_connect";
import { itemKeys, fetchItems } from "./item-query";

// Mock the transport and client
const mockClient = {
  listItems: vi.fn(),
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
});
