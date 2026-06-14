import { beforeEach, describe, expect, it, vi } from "vitest";
import * as itemReadsListClient from "./api/generated/client/itemReadsList";
import * as itemsUpdateStatusClient from "./api/generated/client/itemsUpdateStatus";
import {
  type ItemRead,
  itemReadQueryOptions,
  updateItemReadStatus,
} from "./item-read-db";
import {
  lastReadFetched,
  setLastItemsSyncedAt,
  setLastReadFetched,
} from "./item-sync-state";
import { queryClient } from "./query";

describe("ItemRead query options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    setLastReadFetched(null);
    setLastItemsSyncedAt(null);
    vi.spyOn(itemReadsListClient, "itemReadsList");
    vi.spyOn(itemsUpdateStatusClient, "itemsUpdateStatus");
  });

  describe("queryFn", () => {
    it("should fetch and merge data correctly", async () => {
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
      const mockItemReads = [
        {
          itemId: "1",
          isRead: true,
          updatedAt: "1970-01-01T00:16:40.000Z",
        },
        {
          itemId: "2",
          isRead: false,
          updatedAt: "1970-01-01T00:16:41.000Z",
        },
      ];

      vi.mocked(itemReadsListClient.itemReadsList).mockResolvedValue({
        itemReads: mockItemReads,
        nextPageToken: "",
      });

      const data = (await itemReadQueryOptions.queryFn()) as ItemRead[];

      expect(data).toHaveLength(2);
      expect(data[0].id).toBe("1");
      expect(data[0].isRead).toBe(true);
      expect(data[1].id).toBe("2");
      expect(data[1].isRead).toBe(false);
    });

    it("should advance anchor based on max server timestamp", async () => {
      const anchorDate = new Date("2026-03-07T12:00:00Z");
      setLastReadFetched(anchorDate);

      const serverTimestamp = new Date(
        anchorDate.getTime() + 10_000,
      ).toISOString();
      const mockItemReads = [
        {
          itemId: "1",
          isRead: true,
          updatedAt: serverTimestamp,
        },
      ];

      vi.mocked(itemReadsListClient.itemReadsList).mockResolvedValue({
        itemReads: mockItemReads,
        nextPageToken: "",
      });

      await itemReadQueryOptions.queryFn();

      const expectedAnchor = new Date(serverTimestamp);
      expect(lastReadFetched()).toEqual(expectedAnchor);
    });

    it("should keep anchor when no new data is returned", async () => {
      const anchorDate = new Date("2026-03-07T13:00:00Z");
      setLastReadFetched(anchorDate);

      vi.mocked(itemReadsListClient.itemReadsList).mockResolvedValue({
        itemReads: [],
        nextPageToken: "",
      });

      await itemReadQueryOptions.queryFn();

      expect(lastReadFetched()).toEqual(anchorDate);
    });

    it("should handle pagination correctly and exclude updatedSince when pageToken is present", async () => {
      const anchorDate = new Date("2026-03-07T14:00:00Z");
      setLastReadFetched(anchorDate);

      vi.mocked(itemReadsListClient.itemReadsList)
        .mockResolvedValueOnce({
          itemReads: [
            {
              itemId: "1",
              isRead: true,
              updatedAt: "1970-01-01T00:00:01.000Z",
            },
          ],
          nextPageToken: "token-1",
        })
        .mockResolvedValueOnce({
          itemReads: [
            {
              itemId: "2",
              isRead: false,
              updatedAt: "1970-01-01T00:00:02.000Z",
            },
          ],
          nextPageToken: "",
        });

      await itemReadQueryOptions.queryFn();

      expect(itemReadsListClient.itemReadsList).toHaveBeenCalledTimes(2);
      expect(itemReadsListClient.itemReadsList).toHaveBeenNthCalledWith(1, {
        pageSize: 1000,
        since: anchorDate.toISOString(),
      });
      expect(itemReadsListClient.itemReadsList).toHaveBeenNthCalledWith(2, {
        pageSize: 1000,
        pageToken: "token-1",
      });
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
          updatedAt: "1970-01-01T00:16:42.000Z",
        },
      ];

      vi.mocked(itemReadsListClient.itemReadsList).mockResolvedValue({
        itemReads: mockItemReads,
        nextPageToken: "",
      });

      const data = (await itemReadQueryOptions.queryFn()) as ItemRead[];

      expect(data).toHaveLength(2);
      expect(data.find((d: ItemRead) => d.id === "1")?.isRead).toBe(false);
      expect(data.find((d: ItemRead) => d.id === "2")?.isRead).toBe(true);
    });

    it("should skip fetching and return an empty array if no anchor is present", async () => {
      setLastReadFetched(null);
      setLastItemsSyncedAt(null);
      const existingData = [{ id: "1", isRead: false, updatedAt: new Date() }];
      queryClient.setQueryData(["item-reads"], existingData);

      const data = await itemReadQueryOptions.queryFn();

      expect(itemReadsListClient.itemReadsList).not.toHaveBeenCalled();
      expect(data).toEqual([]);
    });
  });

  describe("updateItemReadStatus", () => {
    it("should call updateItemStatus", async () => {
      vi.mocked(itemsUpdateStatusClient.itemsUpdateStatus).mockResolvedValue(
        {},
      );

      await updateItemReadStatus(["1", "2"], true);

      expect(itemsUpdateStatusClient.itemsUpdateStatus).toHaveBeenCalledWith({
        ids: ["1", "2"],
        isRead: true,
      });
    });

    it("should perform optimistic update and rollback on server failure, cleaning up new records", async () => {
      const initialData = [{ id: "1", isRead: false, updatedAt: new Date() }];
      queryClient.setQueryData(itemReadQueryOptions.queryKey, initialData);

      const error = new Error("Server error");
      vi.mocked(itemsUpdateStatusClient.itemsUpdateStatus).mockRejectedValue(
        error,
      );

      await expect(updateItemReadStatus(["1", "2"], true)).rejects.toThrow(
        "Server error",
      );

      const cache = queryClient.getQueryData(
        itemReadQueryOptions.queryKey,
      ) as ItemRead[];
      expect(cache.find((i) => i.id === "1")?.isRead).toBe(false);
      expect(cache.find((i) => i.id === "2")).toBeUndefined();
    });
  });

  describe("Conflict Resolution", () => {
    it("should allow server data to overwrite local data (Server Wins)", async () => {
      setLastReadFetched(new Date("2026-03-01T00:00:00Z"));
      queryClient.setQueryData(
        ["item-reads"],
        [
          {
            id: "1",
            isRead: true,
            updatedAt: new Date("2026-03-06T00:00:00Z"),
          },
        ],
      );

      const mockItemReads = [
        {
          itemId: "1",
          isRead: false,
          updatedAt: "1970-01-01T00:33:20.000Z",
        },
      ];

      vi.mocked(itemReadsListClient.itemReadsList).mockResolvedValue({
        itemReads: mockItemReads,
        nextPageToken: "",
      });

      const data = (await itemReadQueryOptions.queryFn()) as ItemRead[];

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("1");
      expect(data[0].isRead).toBe(false);
    });
  });
});
