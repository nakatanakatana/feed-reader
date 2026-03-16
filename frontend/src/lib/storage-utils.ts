/**
 * Simple wrapper for localStorage with error handling and validation.
 */

export const STORAGE_KEYS = {
  FEED_SORT_BY: "feed-reader:settings:feed-sort-by",
  FEED_TAG_FILTER: "feed-reader:settings:feed-tag-filter",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Safely writes a value to localStorage.
 * If value is undefined, removes the item from storage.
 */
export function setStorageValue<T>(key: StorageKey, value: T): void {
  try {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`Error writing to localStorage for key "${key}":`, error);
  }
}

/**
 * Safely reads a value from localStorage and validates it.
 */
export function getStorageValue<T>(
  key: StorageKey,
  defaultValue: T,
  validate?: (value: unknown) => value is T,
): T {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) {
      return defaultValue;
    }

    const parsed = JSON.parse(storedValue);

    if (validate && !validate(parsed)) {
      console.warn(
        `Invalid value found in localStorage for key "${key}". Falling back to default.`,
        parsed,
      );
      return defaultValue;
    }

    return parsed as T;
  } catch (error) {
    console.error(`Error reading from localStorage for key "${key}":`, error);
    return defaultValue;
  }
}
