import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Transport } from "@connectrpc/connect";
import { fetchNewItems, fetchOlderItems } from "./item-query";

// Mock the transport and client
const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    listItems: vi.fn(),
  },
}));

vi.mock("@connectrpc/connect", () => ({
  createClient: vi.fn(() => mockClient),
}));

describe("Incremental Item Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchNewItems should call listItems with publishedSince", async () => {
    const mockResponse = { items: [], totalCount: 0 };
    mockClient.listItems.mockResolvedValue(mockResponse);

    const transport = {} as unknown as Transport;
    const lastFetchedAt = "2026-01-31T00:00:00Z";

    await fetchNewItems(transport, { lastFetchedAt });

    expect(mockClient.listItems).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedSince: expect.objectContaining({
          seconds: expect.any(BigInt),
        }),
      }),
    );
  });

  it("fetchOlderItems should call listItems with offset", async () => {
    const mockResponse = { items: [], totalCount: 0 };
    mockClient.listItems.mockResolvedValue(mockResponse);

    const transport = {} as unknown as Transport;
    const currentOffset = 20;

    await fetchOlderItems(transport, { offset: currentOffset });

    expect(mockClient.listItems).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: currentOffset,
      }),
    );
  });
});
