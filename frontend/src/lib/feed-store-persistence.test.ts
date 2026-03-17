import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedStore } from "./feed-store";
import { STORAGE_KEYS } from "./storage-utils";

// Helper to wait for effects
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe("feedStore Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    feedStore.setSortBy("title_asc");
    feedStore.setSelectedTagId(undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should save sortBy to localStorage when changed", async () => {
    feedStore.setSortBy("last_fetched");
    await wait(); // wait for effect
    expect(localStorage.getItem(STORAGE_KEYS.FEED_SORT_BY)).toBe('"last_fetched"');

    feedStore.setSortBy("title_desc");
    await wait(); // wait for effect
    expect(localStorage.getItem(STORAGE_KEYS.FEED_SORT_BY)).toBe('"title_desc"');
  });

  it("should save selectedTagId to localStorage when changed", async () => {
    feedStore.setSelectedTagId("tag-1");
    await wait(); // wait for effect
    expect(localStorage.getItem(STORAGE_KEYS.FEED_TAG_FILTER)).toBe('"tag-1"');

    feedStore.setSelectedTagId(null); // untagged
    await wait(); // wait for effect
    expect(localStorage.getItem(STORAGE_KEYS.FEED_TAG_FILTER)).toBe("null");

    feedStore.setSelectedTagId(undefined); // all
    await wait(); // wait for effect
    // Our setStorageValue removes item for undefined
    expect(localStorage.getItem(STORAGE_KEYS.FEED_TAG_FILTER)).toBeNull();
  });
});
