import { HttpResponse, http } from "msw";
import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worker } from "../mocks/browser";
import { items, updateItemStatus } from "./item-db";
import { itemStore } from "./item-store";
import { queryClient } from "./query";

describe("items collection", () => {
  beforeEach(() => {
    itemStore.setShowRead(false);
    itemStore.setDateFilter("30d");
    vi.clearAllMocks();
  });

  afterEach(() => {
    itemStore.setShowRead(false);
    itemStore.setDateFilter("30d");
    worker.resetHandlers();
  });

  describe("updateItemStatus", () => {
    it("updates query cache optimistically and invalidates", async () => {
      const id = "item-1";
      const isRead = true;
      const oldData = { id, isRead: false, title: "Test" };

      // Setup cache
      queryClient.setQueryData(["item", id], oldData);

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      // Mock items().get to return null to force direct API path (simpler for unit test)
      const itemsSpy = vi.spyOn(items(), "get").mockReturnValue(undefined);

      await updateItemStatus(id, isRead);

      // Verify optimistic update
      expect(queryClient.getQueryData(["item", id])).toEqual({
        ...oldData,
        isRead,
      });

      // Verify invalidation
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["item", id],
      });

      itemsSpy.mockRestore();
    });

    it("uses collection update when item exists and calls items().update with correct parameters", async () => {
      const id = "item-collection-1";
      const isRead = true;
      const oldData = { id, isRead: false, title: "Test from collection" };

      // Setup cache
      queryClient.setQueryData(["item", id], oldData);

      const collection = items();
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      // Mock items().get to return an existing item in the collection
      const getSpy = vi.spyOn(collection, "get").mockReturnValue({
        ...oldData,
      } as any);

      // Spy on items().update to verify it is called correctly
      // We mock implementation to do nothing (success)
      const updateSpy = vi
        .spyOn(collection, "update")
        // biome-ignore lint/suspicious/noExplicitAny: Mocking complex Transaction return type
        .mockImplementation((() => {}) as any);

      await updateItemStatus(id, isRead);

      // Verify cache reflects updated status
      expect(queryClient.getQueryData(["item", id])).toEqual({
        ...oldData,
        isRead,
      });

      // Verify collection update was used with correct parameters
      expect(updateSpy).toHaveBeenCalledWith(
        id,
        expect.any(Function), // The draft update function
      );

      // In the collection path, invalidateQueries should NOT be called directly by updateItemStatus
      // because it's handled by onUpdate to avoid race conditions.
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();

      getSpy.mockRestore();
      updateSpy.mockRestore();
    });

    it("rolls back optimistic update on error (both collection and API fail)", async () => {
      const id = "item-2";
      const isRead = true;
      const oldData = { id, isRead: false, title: "Test" };

      // Setup cache
      queryClient.setQueryData(["item", id], oldData);

      // Mock items().get to throw error
      const itemsSpy = vi.spyOn(items(), "get").mockImplementation(() => {
        throw new Error("Collection Error");
      });

      // Mock API to also throw error
      worker.use(
        http.post("*/item.v1.ItemService/UpdateItemStatus", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      await expect(updateItemStatus(id, isRead)).rejects.toThrow();

      // Verify rollback
      expect(queryClient.getQueryData(["item", id])).toEqual(oldData);

      itemsSpy.mockRestore();
    });

    it("does not roll back if collection update fails but API fallback succeeds", async () => {
      const id = "item-3";
      const isRead = true;
      const oldData = { id, isRead: false, title: "Test" };

      // Setup cache
      queryClient.setQueryData(["item", id], oldData);

      const collection = items();
      // Mock items().get to return a valid item
      const getSpy = vi.spyOn(collection, "get").mockReturnValue({
        ...oldData,
      } as any);
      // Mock collection.update to throw error
      const updateSpy = vi
        .spyOn(collection, "update")
        // biome-ignore lint/suspicious/noExplicitAny: Mocking complex Transaction return type
        .mockImplementation((() => {
          throw new Error("Collection Update Error");
        }) as any);

      // Mock API to succeed
      worker.use(
        http.post("*/item.v1.ItemService/UpdateItemStatus", () => {
          return HttpResponse.json({});
        }),
      );

      await updateItemStatus(id, isRead);

      // Verify NO rollback (status remains isRead: true)
      expect(queryClient.getQueryData(["item", id])).toEqual({
        ...oldData,
        isRead,
      });

      getSpy.mockRestore();
      updateSpy.mockRestore();
    });
  });

  describe("reactivity", () => {
    it("should return a new collection when filters change", () => {
      const dispose = createRoot((dispose) => {
        const collection1 = items();

        // Change store state
        itemStore.setShowRead(!itemStore.state.showRead);

        const collection2 = items();

        expect(collection1).not.toBe(collection2);

        // Change date filter
        itemStore.setDateFilter("7d");

        const collection3 = items();
        expect(collection3).not.toBe(collection2);

        return dispose;
      });
      dispose();
    });

    it("should return the same collection if filters are the same", () => {
      const dispose = createRoot((dispose) => {
        const collection1 = items();
        const collection2 = items();
        expect(collection1).toBe(collection2);
        return dispose;
      });
      dispose();
    });
  });
});
