import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { items, syncItemReads, lastSyncedReads, setLastSyncedReads } from "./item-db";
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

  describe("syncItemReads", () => {
    it("should update queryClient data when sync returns items", async () => {
      const currentQueryKey = ["items", { since: "30d", showRead: false }];
      const initialData = [
        { id: "item1", title: "Item 1", isRead: false },
        { id: "item2", title: "Item 2", isRead: false },
      ];
      queryClient.setQueryData(currentQueryKey, initialData);
      setLastSyncedReads(new Date("2023-11-14T22:13:00Z"));

      worker.use(
        http.all("*/item.v1.ItemService/ListItemReads", () => {
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

      await syncItemReads();

      const updatedData = queryClient.getQueryData<any[]>(currentQueryKey);
      expect(updatedData).toBeDefined();
      expect(updatedData!.find((i) => i.id === "item1")!.isRead).toBe(true);
      expect(updatedData!.find((i) => i.id === "item2")!.isRead).toBe(false);

      const lastSynced = lastSyncedReads();
      expect(lastSynced).toBeDefined();
      expect(lastSynced?.getTime()).toBe(1700000000000 + 1);
    });
  });
});
