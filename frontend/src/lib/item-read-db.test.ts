import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemClient } from "./api/client";
import { type ItemRead, itemReadCollectionOptions } from "./item-read-db";
import {
  lastReadFetched,
  setLastItemsSyncedAt,
  setLastReadFetched,
} from "./item-sync-state";
import { queryClient } from "./query";

describe("ItemRead collection options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setLastReadFetched(null);
    setLastItemsSyncedAt(null);
    vi.spyOn(itemClient, "listItemRead");
    vi.spyOn(itemClient, "updateItemStatus");
  });

  describe("queryFn", () => {
    it("should fetch and merge data correctly", async () => {
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
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

    it("should use lastItemsSyncedAt as initial baseline when lastReadFetched is null", async () => {
      const syncedAt = new Date("2026-03-01T10:00:00Z");
      setLastItemsSyncedAt(syncedAt);

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: [],
      });

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(itemClient.listItemRead).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedSince: {
            seconds: BigInt(Math.floor(syncedAt.getTime() / 1000)),
            nanos: (syncedAt.getTime() % 1000) * 1000000,
          },
        }),
      );
    });

    it("should advance anchor based on max server timestamp", async () => {
      const anchorDate = new Date("2026-03-07T12:00:00Z");
      setLastReadFetched(anchorDate);

      const serverTimestamp = {
        seconds: BigInt(Math.floor(anchorDate.getTime() / 1000) + 10),
        nanos: 0,
      };
      const mockItemReads = [
        {
          itemId: "1",
          isRead: true,
          updatedAt: serverTimestamp,
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

      const expectedAnchor = new Date(Number(serverTimestamp.seconds) * 1000);
      expect(lastReadFetched()).toEqual(expectedAnchor);
    });

    it("should keep anchor when no new data is returned", async () => {
      const anchorDate = new Date("2026-03-07T13:00:00Z");
      setLastReadFetched(anchorDate);

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any).mockResolvedValue({
        itemReads: [],
        nextPageToken: "",
      });

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(lastReadFetched()).toEqual(anchorDate);
    });

    it("should handle pagination correctly and exclude updatedSince when pageToken is present", async () => {
      const anchorDate = new Date("2026-03-07T14:00:00Z");
      setLastReadFetched(anchorDate);

      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.listItemRead as any)
        .mockResolvedValueOnce({
          itemReads: [
            {
              itemId: "1",
              isRead: true,
              updatedAt: { seconds: BigInt(1), nanos: 0 },
            },
          ],
          nextPageToken: "token-1",
        })
        .mockResolvedValueOnce({
          itemReads: [
            {
              itemId: "2",
              isRead: false,
              updatedAt: { seconds: BigInt(2), nanos: 0 },
            },
          ],
          nextPageToken: "",
        });

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(itemClient.listItemRead).toHaveBeenCalledTimes(2);

      // biome-ignore lint/suspicious/noExplicitAny: asserting mock calls
      const firstCallArgs = (itemClient.listItemRead as any).mock.calls[0][0];
      // biome-ignore lint/suspicious/noExplicitAny: asserting mock calls
      const secondCallArgs = (itemClient.listItemRead as any).mock.calls[1][0];

      // First page should include updatedSince
      expect(firstCallArgs).toHaveProperty("updatedSince");
      expect(firstCallArgs.pageToken).toBe("");

      // Second page should include pageToken and OMIT updatedSince
      expect(secondCallArgs.pageToken).toBe("token-1");
      expect(secondCallArgs.updatedSince).toBeUndefined();
    });

    it("should merge with existing data", async () => {
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
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

    it("should skip fetching and return existing data if no anchor is present", async () => {
      setLastReadFetched(null);
      setLastItemsSyncedAt(null);
      const existingData = [{ id: "1", isRead: false, updatedAt: "date" }];
      queryClient.setQueryData(["item-reads"], existingData);

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      const data = await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(itemClient.listItemRead).not.toHaveBeenCalled();
      expect(data).toEqual(existingData);
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
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
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
