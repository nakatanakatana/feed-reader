import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStorageValue,
  setStorageValue,
  STORAGE_KEYS,
} from "./storage-utils";

describe("storage-utils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("setStorageValue", () => {
    it("should save value to localStorage as JSON", () => {
      const key = STORAGE_KEYS.FEED_SORT_BY;
      const value = "title_asc";
      setStorageValue(key, value);
      expect(localStorage.getItem(key)).toBe('"title_asc"');
    });

    it("should handle objects", () => {
      const key = STORAGE_KEYS.FEED_SORT_BY;
      const value = { sort: "title" };
      // @ts-expect-error - testing arbitrary objects
      setStorageValue(key, value);
      expect(localStorage.getItem(key)).toBe('{"sort":"title"}');
    });

    it("should remove item on undefined", () => {
      const key = STORAGE_KEYS.FEED_SORT_BY;
      localStorage.setItem(key, '"title_asc"');
      setStorageValue(key, undefined);
      expect(localStorage.getItem(key)).toBeNull();
    });

    it("should log error on failure", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const originalSetItem = localStorage.setItem;
      // Manually overwrite to ensure it throws
      localStorage.setItem = () => {
        throw new Error("Storage full");
      };

      try {
        setStorageValue(STORAGE_KEYS.FEED_SORT_BY, "title_asc");
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        localStorage.setItem = originalSetItem;
      }
    });
  });

  describe("getStorageValue", () => {
    it("should return default value if key is not present", () => {
      const defaultValue = "title_asc";
      const result = getStorageValue(STORAGE_KEYS.FEED_SORT_BY, defaultValue);
      expect(result).toBe(defaultValue);
    });

    it("should return parsed value if key is present", () => {
      const key = STORAGE_KEYS.FEED_SORT_BY;
      localStorage.setItem(key, '"title_desc"');
      const result = getStorageValue(key, "title_asc");
      expect(result).toBe("title_desc");
    });

    it("should return default value and warn if validation fails", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const key = STORAGE_KEYS.FEED_SORT_BY;
      localStorage.setItem(key, '"invalid"');

      const validate = (val: unknown): val is "title_asc" | "title_desc" =>
        val === "title_asc" || val === "title_desc";
      const defaultValue = "title_asc";

      const result = getStorageValue(key, defaultValue, validate);

      expect(result).toBe(defaultValue);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should return default value on parse error", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const key = STORAGE_KEYS.FEED_SORT_BY;
      localStorage.setItem(key, "invalid-json");

      const result = getStorageValue(key, "title_asc");
      expect(result).toBe("title_asc");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
