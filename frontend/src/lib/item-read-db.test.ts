import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemClient } from "./api/client";
import { type ItemRead, itemReadCollectionOptions } from "./item-read-db";
import { queryClient } from "./query";

vi.mock("./api/client", () => ({
  itemClient: {
    listItemRead: vi.fn(),
    updateItemStatus: vi.fn(),
  },
}));

describe("ItemRead collection options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe("queryFn", () => {
    it("should fetch and merge data correctly", async () => {
      const mockItemReads = [
        {
          itemId: "1",
          isRead: true,
          updatedAt: { seconds: BigInt(1000), nanos: 0 },
        },
        {
          itemId: "2",
          isRead: false,
          updatedAt: { seconds: BigInt(1001), nanos: 0 },
        },
      ];

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: mockItemReads,
      });

      const data =
        (await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
        (itemReadCollectionOptions as any).queryFn({
          queryKey: ["item-reads"],
        })) as ItemRead[];

      expect(data).toHaveLength(2);
      expect(data[0].id).toBe("1");
      expect(data[0].isRead).toBe(true);
      expect(data[1].id).toBe("2");
      expect(data[1].isRead).toBe(false);
    });

    it("should merge with existing data", async () => {
      queryClient.setQueryData(
        ["item-reads"],
        [{ id: "1", isRead: false, updatedAt: "some-date" }],
      );

      const mockItemReads = [
        {
          itemId: "2",
          isRead: true,
          updatedAt: { seconds: BigInt(1002), nanos: 0 },
        },
      ];

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: mockItemReads,
      });

      const data =
        (await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
        (itemReadCollectionOptions as any).queryFn({
          queryKey: ["item-reads"],
        })) as ItemRead[];

      expect(data).toHaveLength(2);
      expect(data.find((d: ItemRead) => d.id === "1")?.isRead).toBe(false);
      expect(data.find((d: ItemRead) => d.id === "2")?.isRead).toBe(true);
    });
  });

  describe("onUpdate", () => {
    it("should call updateItemStatus and return refetch: false", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.updateItemStatus as any).mockResolvedValue({});

      const mockTransaction = {
        mutations: [
          { modified: { id: "1", isRead: true } },
          { modified: { id: "2", isRead: true } },
        ],
      };

      const result =
        await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
        (itemReadCollectionOptions as any).onUpdate({
          transaction: mockTransaction,
        });

      expect(itemClient.updateItemStatus).toHaveBeenCalledWith({
        ids: ["1", "2"],
        isRead: true,
      });
      expect(result).toEqual({ refetch: false });
    });
  });
});
