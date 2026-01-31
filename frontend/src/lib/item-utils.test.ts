import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import {
  filterAndSortItems,
  formatUnreadCount,
  getItemDisplayDate,
  getPublishedSince,
  type Item,
  SortOrder,
} from "./item-utils";

describe("item-utils", () => {
  describe("getPublishedSince", () => {
    it("should return undefined for 'all'", () => {
      expect(getPublishedSince("all")).toBeUndefined();
    });

    it("should calculate correct timestamp for presets", () => {
      const mockNow = new Date("2026-01-28T12:00:00Z");
      vi.setSystemTime(mockNow);

      const tests = [
        {
          value: "24h",
          expected: new Date(mockNow.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          value: "7d",
          expected: new Date(mockNow.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          value: "30d",
          expected: new Date(mockNow.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          value: "90d",
          expected: new Date(mockNow.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
        {
          value: "365d",
          expected: new Date(mockNow.getTime() - 365 * 24 * 60 * 60 * 1000),
        },
      ] as const;

      for (const { value, expected } of tests) {
        const result = getPublishedSince(value);
        expect(result).toBeDefined();
        expect(result?.seconds).toBe(
          BigInt(Math.floor(expected.getTime() / 1000)),
        );
      }

      vi.useRealTimers();
    });
  });

  describe("getItemDisplayDate", () => {
    it("should return Published label and date when publishedAt is present", () => {
      const item: Pick<Item, "publishedAt" | "createdAt"> = {
        publishedAt: "2026-01-01T00:00:00Z",
        createdAt: "2026-01-02T00:00:00Z",
      };
      const result = getItemDisplayDate(item);
      expect(result.label).toBe("Published");
      expect(result.date).toBe("2026-01-01T00:00:00Z");
    });

    it("should return Received label and createdAt when publishedAt is empty", () => {
      const item: Pick<Item, "publishedAt" | "createdAt"> = {
        publishedAt: "",
        createdAt: "2026-01-02T00:00:00Z",
      };
      const result = getItemDisplayDate(item);
      expect(result.label).toBe("Received");
      expect(result.date).toBe("2026-01-02T00:00:00Z");
    });
  });

  describe("formatUnreadCount", () => {
    it("should return exact count for values up to 999", () => {
      expect(formatUnreadCount(0)).toBe("0");
      expect(formatUnreadCount(1)).toBe("1");
      expect(formatUnreadCount(999)).toBe("999");
    });

    it("should return '999+' for values 1000 or more", () => {
      expect(formatUnreadCount(1000)).toBe("999+");
      expect(formatUnreadCount(1001)).toBe("999+");
      expect(formatUnreadCount(10000)).toBe("999+");
    });
  });
});

describe("item-utils PBT", () => {
  const itemArbitrary = fc.record({
    id: fc.uuid(),
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
    isRead: fc.boolean(),
  });

  const filtersArbitrary = fc.record({
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
            const b = result[i + 1].publishedAt || result[i + 1].createdAt;
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
