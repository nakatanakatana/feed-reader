import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { filterAndSortItems, getItemDisplayDate, SortOrder } from "./item-utils";

describe("item-utils", () => {
  describe("getItemDisplayDate", () => {
    it("should return Published label and date when publishedAt is present", () => {
      const item = {
        publishedAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-02T00:00:00Z",
      } as any;
      const result = getItemDisplayDate(item);
      expect(result.label).toBe("Published");
      expect(result.date).toBe("2026-01-01T00:00:00Z");
    });

    it("should return Received label and createdAt when publishedAt is empty", () => {
      const item = {
        publishedAt: "",
        createdAt: "2026-01-02T00:00:00Z",
      } as any;
      const result = getItemDisplayDate(item);
      expect(result.label).toBe("Received");
      expect(result.date).toBe("2026-01-02T00:00:00Z");
    });
  });
});

describe("item-utils PBT", () => {
  const itemArbitrary = fc.record({
    id: fc.uuid(),
    url: fc.webUrl(),
    title: fc.string(),
    description: fc.string(),
    publishedAt: fc
      .date({
        min: new Date(2000, 0, 1),
        max: new Date(2100, 0, 1),
        noInvalidDate: true,
      })
      .map((d) => (Math.random() > 0.2 ? d.toISOString() : "")),
    createdAt: fc
      .date({
        min: new Date(2000, 0, 1),
        max: new Date(2100, 0, 1),
        noInvalidDate: true,
      })
      .map((d) => d.toISOString()),
    feedId: fc.uuid(),
    isRead: fc.boolean(),
  });

  const filtersArbitrary = fc.record({
    feedId: fc.option(fc.uuid(), { nil: undefined }),
    isRead: fc.option(fc.boolean(), { nil: undefined }),
    sortOrder: fc.constantFrom(
      SortOrder.UNSPECIFIED,
      SortOrder.ASC,
      SortOrder.DESC,
    ),
  });

  it("should always satisfy filtering invariants", () => {
    fc.assert(
      fc.property(
        fc.array(itemArbitrary),
        filtersArbitrary,
        (items, filters) => {
          const result = filterAndSortItems(items, filters);

          // 1. Result should only contain items from the original list
          expect(
            result.every((item) => items.some((i) => i.id === item.id)),
          ).toBe(true);

          // 2. Result should not contain items that don't match the filters
          if (filters.feedId) {
            expect(result.every((item) => item.feedId === filters.feedId)).toBe(
              true,
            );
          }
          if (filters.isRead !== undefined) {
            expect(result.every((item) => item.isRead === filters.isRead)).toBe(
              true,
            );
          }
        },
      ),
    );
  });

  it("should always satisfy sorting invariants", () => {
    fc.assert(
      fc.property(
        fc.array(itemArbitrary),
        filtersArbitrary,
        (items, filters) => {
          const result = filterAndSortItems(items, filters);

          if (result.length < 2) return;

          for (let i = 0; i < result.length - 1; i++) {
            const a = result[i].publishedAt || result[i].createdAt;
            const b = result[i+1].publishedAt || result[i+1].createdAt;
            if (filters.sortOrder === SortOrder.ASC) {
              expect(a <= b).toBe(true);
            } else {
              // DESC or UNSPECIFIED
              expect(a >= b).toBe(true);
            }
          }
        },
      ),
    );
  });
});
