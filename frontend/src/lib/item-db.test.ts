import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { type Item, items, useSortedLiveQuery } from "./item-db";
import { itemStore } from "./item-store";

// Mock dependencies if needed, but for now we rely on the real item-db
// ...

describe("items collection", () => {
  describe("reactivity", () => {
    it("should return a new collection when filters change", () => {
      createRoot(() => {
        const collection1 = items();

        // Change store state
        itemStore.setShowRead(!itemStore.state.showRead);

        const collection2 = items();

        expect(collection1).not.toBe(collection2);

        // Change date filter
        itemStore.setDateFilter("7d");

        const collection3 = items();
        expect(collection3).not.toBe(collection2);
      });
    });

    it("should return the same collection if filters are the same", () => {
      createRoot(() => {
        const collection1 = items();
        const collection2 = items();
        expect(collection1).toBe(collection2);
      });
    });
  });

  describe("sorting", () => {
    it("should sort items by createdAt in ascending order", async () => {
      await createRoot(async () => {
        const query = useSortedLiveQuery<Item>(
          // biome-ignore lint/suspicious/noExplicitAny: TanStack DB query builder
          (q: any) => q.from({ item: items() }),
        );

        // Wait for data to load with a timeout
        const success = await new Promise((resolve) => {
          const start = Date.now();
          const check = () => {
            if (query().length > 0) {
              resolve(true);
            } else if (Date.now() - start > 2000) {
              resolve(false);
            } else {
              setTimeout(check, 50);
            }
          };
          check();
        });

        expect(success, "Query timed out").toBe(true);

        const results = query();
        console.log("TEST RESULTS IDs:", results.map((r) => r.id).join(", "));
        console.log(
          "TEST RESULTS Dates:",
          results.map((r) => r.createdAt).join(", "),
        );

        for (let i = 0; i < results.length - 1; i++) {
          const current = new Date(results[i].createdAt).getTime();
          const next = new Date(results[i + 1].createdAt).getTime();
          expect(
            current,
            `Item at ${i} (${results[i].id}: ${results[i].createdAt}) should be before or same as item at ${i + 1} (${results[i + 1].id}: ${results[i + 1].createdAt})`,
          ).toBeLessThanOrEqual(next);
        }
      });
    });
  });
});
