import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemClient } from "./api/client";
import { type ItemRead, itemReadCollectionOptions } from "./item-read-db";
import { lastReadFetched, setLastReadFetched } from "./item-sync-state";
import { queryClient } from "./query";

describe("ItemRead collection options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setLastReadFetched(null);
    vi.spyOn(itemClient, "listItemRead");
    vi.spyOn(itemClient, "updateItemStatus");
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
        nextPageToken: "",
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

    it("should advance anchor based on server updatedAt", async () => {
      const mockItemReads = [
        {
          itemId: "1",
          isRead: true,
          updatedAt: { seconds: BigInt(2000), nanos: 0 },
        },
      ];

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: mockItemReads,
        nextPageToken: "",
      });

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(lastReadFetched()?.getTime()).toBe(2000 * 1000);
    });

    it("should keep anchor when no new data is returned", async () => {
      const initialAnchor = new Date(1500 * 1000);
      setLastReadFetched(initialAnchor);

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: [],
        nextPageToken: "",
      });

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(lastReadFetched()?.getTime()).toBe(1500 * 1000);
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

    it("should use the anchor (lastReadFetched) in the API call", async () => {
      const anchorDate = new Date(2026, 0, 1);
      setLastReadFetched(anchorDate);

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: [],
      });

      await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(itemClient.listItemRead).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedSince: {
            seconds: BigInt(Math.floor(anchorDate.getTime() / 1000)),
            nanos: 0,
          },
        }),
      );
    });

    it("should advance the anchor based on the most recent updatedAt from the server", async () => {
      const initialAnchor = new Date(2026, 0, 1);
      setLastReadFetched(initialAnchor);

      const serverTime1 = new Date(2026, 0, 2);
      const serverTime2 = new Date(2026, 0, 3);

      const mockItemReads = [
        {
          itemId: "1",
          isRead: true,
          updatedAt: {
            seconds: BigInt(serverTime1.getTime() / 1000),
            nanos: 0,
          },
        },
        {
          itemId: "2",
          isRead: true,
          updatedAt: {
            seconds: BigInt(serverTime2.getTime() / 1000),
            nanos: 0,
          },
        },
      ];

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: mockItemReads,
      });

      await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(lastReadFetched()).toEqual(serverTime2);
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

    it("should handle mixed isRead values in a single transaction", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.updateItemStatus as any).mockResolvedValue({});

      const mockTransaction = {
        mutations: [
          { modified: { id: "1", isRead: true } },
          { modified: { id: "2", isRead: false } },
          { modified: { id: "3", isRead: true } },
        ],
      };

      await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
      (itemReadCollectionOptions as any).onUpdate({
        transaction: mockTransaction,
      });

      expect(itemClient.updateItemStatus).toHaveBeenCalledTimes(2);
      expect(itemClient.updateItemStatus).toHaveBeenCalledWith({
        ids: ["1", "3"],
        isRead: true,
      });
      expect(itemClient.updateItemStatus).toHaveBeenCalledWith({
        ids: ["2"],
        isRead: false,
      });
    });
  });

  describe("onInsert", () => {
    it("should call updateItemStatus and return refetch: false", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.updateItemStatus as any).mockResolvedValue({});

      const mockTransaction = {
        mutations: [{ modified: { id: "3", isRead: true } }],
      };

      const result =
        await // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
        (itemReadCollectionOptions as any).onInsert({
          transaction: mockTransaction,
        });

      expect(itemClient.updateItemStatus).toHaveBeenCalledWith({
        ids: ["3"],
        isRead: true,
      });
      expect(result).toEqual({ refetch: false });
    });
  });

  describe("Conflict Resolution", () => {
    it("should allow server data to overwrite local data (Server Wins)", async () => {
      // Local data has id: "1" as isRead: true (optimistic update)
      queryClient.setQueryData(
        ["item-reads"],
        [{ id: "1", isRead: true, updatedAt: "2026-03-06T00:00:00Z" }],
      );

      // Server returns id: "1" as isRead: false (e.g. changed on another device)
      const mockItemReads = [
        {
          itemId: "1",
          isRead: false,
          updatedAt: { seconds: BigInt(2000), nanos: 0 },
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

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("1");
      expect(data[0].isRead).toBe(false); // Server value wins
    });
  });
});
