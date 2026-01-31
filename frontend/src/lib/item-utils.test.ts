import { describe, expect, it, vi } from "vitest";
import {
  formatUnreadCount,
  getItemDisplayDate,
  getPublishedSince,
  type Item,
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
