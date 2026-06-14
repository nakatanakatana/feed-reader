import { beforeEach, describe, expect, it, vi } from "vitest";
import * as itemsUpdateStatusClient from "./api/generated/client/itemsUpdateStatus";
import { type ListItem, updateItemStatus } from "./item-db";
import { queryClient } from "./query";

describe("itemDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.spyOn(itemsUpdateStatusClient, "itemsUpdateStatus");
  });

  describe("updateItemStatus", () => {
    it("should update query cache optimistically and rollback on failure", async () => {
      const queryKey = ["items", { since: "30d", showRead: false }] as const;
      const initialData: ListItem[] = [
        { id: "1", title: "Item 1", isRead: false, feedId: "feed1" },
        { id: "2", title: "Item 2", isRead: false, feedId: "feed1" },
      ];

      queryClient.setQueryData(queryKey, initialData);

      const error = new Error("Failed to update status");
      vi.mocked(itemsUpdateStatusClient.itemsUpdateStatus).mockRejectedValue(
        error,
      );

      await expect(updateItemStatus(["1"], true, queryKey)).rejects.toThrow(
        "Failed to update status",
      );

      const cache = queryClient.getQueryData(queryKey) as ListItem[];
      expect(cache.find((item) => item.id === "1")?.isRead).toBe(false);
    });

    it("should update query cache optimistically on success", async () => {
      const queryKey = ["items", { since: "30d", showRead: false }] as const;
      const initialData: ListItem[] = [
        { id: "1", title: "Item 1", isRead: false, feedId: "feed1" },
        { id: "2", title: "Item 2", isRead: false, feedId: "feed1" },
      ];

      queryClient.setQueryData(queryKey, initialData);

      vi.mocked(itemsUpdateStatusClient.itemsUpdateStatus).mockResolvedValue(
        {},
      );

      await updateItemStatus(["1"], true, queryKey);

      const cache = queryClient.getQueryData(queryKey) as ListItem[];
      expect(cache.find((item) => item.id === "1")?.isRead).toBe(true);
    });
  });
});
