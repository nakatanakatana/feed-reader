import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemClient } from "./api/client";
import {
  type ItemRead,
  itemReadCollection,
  itemReadCollectionOptions,
  updateItemReadStatus,
} from "./item-read-db";
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

      // First page should include since
      expect(firstCallArgs).toHaveProperty("since");
      expect(firstCallArgs.pageToken).toBe("");

      // Second page should include pageToken and OMIT since
      expect(secondCallArgs.pageToken).toBe("token-1");
      expect(secondCallArgs.since).toBeUndefined();
    });

    it("should merge with existing data", async () => {
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
      queryClient.setQueryData(
        ["item-reads"],
        [{ id: "1", isRead: false, updatedAt: new Date() }],
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
      const existingData = [{ id: "1", isRead: false, updatedAt: new Date() }];
      queryClient.setQueryData(["item-reads"], existingData);

      // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
      const data = await (itemReadCollectionOptions as any).queryFn({
        queryKey: ["item-reads"],
      });

      expect(itemClient.listItemRead).not.toHaveBeenCalled();
      expect(data).toEqual(existingData);
    });
  });

  describe("updateItemReadStatus", () => {
    it("should call updateItemStatus and writeUpsert", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.updateItemStatus as any).mockResolvedValue({});

      await updateItemReadStatus(["1", "2"], true);

      expect(itemClient.updateItemStatus).toHaveBeenCalledWith({
        ids: ["1", "2"],
        isRead: true,
      });
    });

    it("should ignore SyncNotInitializedError during optimistic update", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.updateItemStatus as any).mockResolvedValue({});

      // Mock writeUpsert to throw SyncNotInitializedError
      const error = new Error("Sync not initialized");
      error.name = "SyncNotInitializedError";
      vi.spyOn(itemReadCollection().utils, "writeUpsert").mockRejectedValue(
        error,
      );

      // Should NOT throw
      await updateItemReadStatus(["1"], true);

      expect(itemClient.updateItemStatus).toHaveBeenCalled();
    });

    it("should perform optimistic update and rollback on server failure, cleaning up new records", async () => {
      // Setup initial state: id: "1" exists, "2" is new
      const initialData = [
        { id: "1", isRead: false, updatedAt: new Date() },
      ];
      queryClient.setQueryData(itemReadCollectionOptions.queryKey, initialData);

      // Mock server to fail
      const error = new Error("Server error");
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (itemClient.updateItemStatus as any).mockRejectedValue(error);

      // Attempt update for both existing and new IDs
      await expect(updateItemReadStatus(["1", "2"], true)).rejects.toThrow(
        "Server error",
      );

      const cache = queryClient.getQueryData(
        itemReadCollectionOptions.queryKey,
      ) as ItemRead[];
      // id: "1" should be rolled back to false
      expect(cache.find((i) => i.id === "1")?.isRead).toBe(false);
      // id: "2" should be removed from cache
      expect(cache.find((i) => i.id === "2")).toBeUndefined();
    });
  });

  describe("Conflict Resolution", () => {
    it("should allow server data to overwrite local data (Server Wins)", async () => {
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
      // Local data has id: "1" as isRead: true (optimistic update)
      queryClient.setQueryData(
        ["item-reads"],
        [{ id: "1", isRead: true, updatedAt: new Date("2026-03-06T00:00:00Z") }],
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
