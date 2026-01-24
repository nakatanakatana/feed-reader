import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterAndSortItems, SortOrder } from "./item-utils";

describe("item-utils PBT", () => {
  const itemArbitrary = fc.record({
    id: fc.uuid(),
    url: fc.webUrl(),
    title: fc.string(),
    description: fc.string(),
    publishedAt: fc
      .date({ min: new Date(2000, 0, 1), max: new Date(2100, 0, 1) })
      .map((d) => d.toISOString()),
    feedId: fc.uuid(),
    isRead: fc.boolean(),
    isSaved: fc.boolean(),
  });

  const filtersArbitrary = fc.record({
    feedId: fc.option(fc.uuid(), { nil: undefined }),
    isRead: fc.option(fc.boolean(), { nil: undefined }),
    isSaved: fc.option(fc.boolean(), { nil: undefined }),
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
          if (filters.isSaved !== undefined) {
            expect(
              result.every((item) => item.isSaved === filters.isSaved),
            ).toBe(true);
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
            const a = result[i].publishedAt;
            const b = result[i + 1].publishedAt;
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
