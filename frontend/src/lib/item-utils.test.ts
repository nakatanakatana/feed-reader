import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import {
  formatUnreadCount,
  getItemDisplayDate,
  getPublishedSince,
  type Item,
  normalizeCategories,
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

    it("should match preset offsets", () => {
      vi.useFakeTimers();
      const presets = [
        { value: "24h", ms: 24 * 60 * 60 * 1000 },
        { value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
        { value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
        { value: "90d", ms: 90 * 24 * 60 * 60 * 1000 },
        { value: "365d", ms: 365 * 24 * 60 * 60 * 1000 },
      ] as const;
      try {
        fc.assert(
          fc.property(
            fc.date({
              min: new Date("2000-01-01T00:00:00Z"),
              max: new Date("2100-01-01T00:00:00Z"),
            }),
            fc.constantFrom(...presets),
            (now, preset) => {
              vi.setSystemTime(now);
              const result = getPublishedSince(preset.value);
              if (!result) return false;
              const expectedSeconds = BigInt(
                Math.floor((now.getTime() - preset.ms) / 1000),
              );
              return result.seconds === expectedSeconds;
            },
          ),
          { numRuns: 100 },
        );
      } finally {
        vi.useRealTimers();
      }
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

    it("should satisfy basic output invariants", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5000 }), (count) => {
          const result = formatUnreadCount(count);
          if (count < 1000) {
            return result === String(count);
          }
          return result === "999+";
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("normalizeCategories", () => {
    it("returns an empty array for empty or whitespace values", () => {
      expect(normalizeCategories("")).toEqual([]);
      expect(normalizeCategories("   ")).toEqual([]);
    });

    it("parses JSON arrays with mixed types", () => {
      expect(normalizeCategories('["Tech", 42, true]')).toEqual([
        "Tech",
        "42",
        "true",
      ]);
    });

    it("filters out nullish and empty values from JSON arrays", () => {
      expect(normalizeCategories('["Tech", null, "", "  "]')).toEqual(["Tech"]);
    });

    it("falls back to CSV parsing when JSON is malformed", () => {
      expect(normalizeCategories('["Tech","SolidJS"')).toEqual([
        "Tech",
        "SolidJS",
      ]);
    });

    it("strips surrounding quotes in CSV values", () => {
      expect(normalizeCategories('"Tech", "SolidJS"')).toEqual([
        "Tech",
        "SolidJS",
      ]);
    });

    it("preserves special characters", () => {
      expect(normalizeCategories('["C++","Foo/Bar","R&D"]')).toEqual([
        "C++",
        "Foo/Bar",
        "R&D",
      ]);
    });

    it("should return trimmed, non-empty values", () => {
      const jsonArray = fc.array(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
      );
      const csvArray = fc.array(fc.string());
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            jsonArray.map((values) => JSON.stringify(values)),
            csvArray.map((values) => values.join(",")),
          ),
          (input) => {
            const result = normalizeCategories(input);
            return result.every(
              (value) => value.length > 0 && value === value.trim(),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return empty array for blank input", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          if (value.trim().length !== 0) return true;
          return normalizeCategories(value).length === 0;
        }),
        { numRuns: 100 },
      );
    });
  });
});
