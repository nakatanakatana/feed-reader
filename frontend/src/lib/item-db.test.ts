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

      const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      // Mock items().get to return null to force direct API path (simpler for unit test)
      const itemsSpy = vi.spyOn(items(), "get").mockReturnValue(undefined);

      await updateItemStatus(id, isRead);

      // Verify optimistic update
      expect(setQueryDataSpy).toHaveBeenCalledWith(
        ["item", id],
        expect.any(Function),
      );
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

      // Mock items().get to throw error
      const itemsSpy = vi.spyOn(items(), "get").mockImplementation(() => {
        throw new Error("Collection Error");
      });

      // Mock API to succeed (MSW default handler for UpdateItemStatus is likely success)
      // but let's be explicit
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

      itemsSpy.mockRestore();
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
