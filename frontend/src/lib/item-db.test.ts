import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { items, lastSyncedReads, setLastSyncedReads, lastFetched, setLastFetched, syncItemReads } from "./item-db";
import { itemStore } from "./item-store";
import { worker } from "../mocks/browser";
import { http, HttpResponse } from "msw";
import { queryClient } from "./query";

describe("items collection", () => {
  beforeEach(() => {
    itemStore.setShowRead(false);
    itemStore.setDateFilter("30d");
  });

  afterEach(() => {
    itemStore.setShowRead(false);
    itemStore.setDateFilter("30d");
    queryClient.clear();
    setLastSyncedReads(null);
    setLastFetched(null);
    vi.useRealTimers();
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

  describe("coordinated sync", () => {
    it("should fetch items and reads in parallel and merge them", async () => {
      const now = new Date("2023-11-14T22:15:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const currentQueryKey = ["items", { since: "30d", showRead: false }];
      const initialData = [
        { id: "item1", title: "Item 1", isRead: false },
        { id: "item2", title: "Item 2", isRead: false },
      ];
      queryClient.setQueryData(currentQueryKey, initialData);
      
      const baseDate = new Date("2023-11-14T22:13:00Z");
      setLastFetched(baseDate);
      setLastSyncedReads(baseDate);

      let listItemsCalled = false;
      let listItemReadsCalled = false;

      worker.use(
        http.all("*/item.v1.ItemService/ListItems", () => {
          listItemsCalled = true;
          return HttpResponse.json({
            items: [
              { id: "item3", title: "Item 3", isRead: false, createdAt: now.toISOString() },
            ],
          });
        }),
        http.all("*/item.v1.ItemService/ListItemReads", () => {
          listItemReadsCalled = true;
          return HttpResponse.json({
            itemReads: [
              {
                itemId: "item1",
                isRead: true,
                updatedAt: "2023-11-14T22:13:20Z",
              },
            ],
          });
        }),
      );

      // Initialize and trigger sync
      const dispose = createRoot((dispose) => {
        items();
        return dispose;
      });

      await syncItemReads();

      const updatedData = queryClient.getQueryData<any[]>(currentQueryKey);
      expect(updatedData).toBeDefined();
      // item1: updated to read by sync
      expect(updatedData!.find((i) => i.id === "item1")!.isRead).toBe(true);
      // item2: unchanged
      expect(updatedData!.find((i) => i.id === "item2")!.isRead).toBe(false);

      expect(lastSyncedReads()?.getTime()).toBe(now.getTime());
      
      dispose();
    });
  });
});
