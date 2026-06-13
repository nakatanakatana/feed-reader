import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api/client";
import { type ListItem, updateItemStatus } from "./item-db";
import { queryClient } from "./query";

describe("itemDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.spyOn(apiClient, "post");
  });

  describe("updateItemStatus", () => {
    it("should update query cache optimistically and rollback on failure", async () => {
      const queryKey = ["items", { since: "30d", showRead: false }] as const;
      const initialData: ListItem[] = [
        { id: "1", title: "Item 1", isRead: false, feedId: "feed1" },
        { id: "2", title: "Item 2", isRead: false, feedId: "feed1" },
      ];

      queryClient.setQueryData(queryKey, initialData);

      // Mock client to fail
      const error = new Error("Failed to update status");
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (apiClient.post as any).mockRejectedValue(error);

      // Attempt updating item 1 to isRead: true
      await expect(updateItemStatus(["1"], true, queryKey)).rejects.toThrow(
        "Failed to update status",
      );

      // Verify rollback occurred
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

      // Mock client to succeed
      // biome-ignore lint/suspicious/noExplicitAny: mocking internal method
      (apiClient.post as any).mockResolvedValue({});

      await updateItemStatus(["1"], true, queryKey);

      // Verify update occurred
      const cache = queryClient.getQueryData(queryKey) as ListItem[];
      expect(cache.find((item) => item.id === "1")?.isRead).toBe(true);
    });
  });
});
