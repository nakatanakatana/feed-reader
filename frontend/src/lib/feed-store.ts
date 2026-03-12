import { createRoot, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { getStorageValue, setStorageValue, STORAGE_KEYS } from "./storage-utils";

export type FeedSortBy = "title_asc" | "title_desc" | "last_fetched" | "next_fetch";

const isFeedSortBy = (val: unknown): val is FeedSortBy => {
  return ["title_asc", "title_desc", "last_fetched", "next_fetch"].includes(val as string);
};

const isTagFilter = (val: unknown): val is string | undefined | null => {
  return typeof val === "string" || val === undefined || val === null;
};

function createFeedStore() {
  const initialSortBy = getStorageValue<FeedSortBy>(
    STORAGE_KEYS.FEED_SORT_BY,
    "title_asc",
    isFeedSortBy,
  );

  const initialTagId = getStorageValue<string | undefined | null>(
    STORAGE_KEYS.FEED_TAG_FILTER,
    undefined,
    isTagFilter,
  );

  const [state, setState] = createStore({
    sortBy: initialSortBy,
    selectedTagId: initialTagId,
  });

  // Persistence
  createEffect(() => {
    setStorageValue(STORAGE_KEYS.FEED_SORT_BY, state.sortBy);
  });

  createEffect(() => {
    setStorageValue(STORAGE_KEYS.FEED_TAG_FILTER, state.selectedTagId);
  });

  const setSortBy = (sortBy: FeedSortBy) => {
    setState("sortBy", sortBy);
  };

  const setSelectedTagId = (tagId: string | undefined | null) => {
    setState("selectedTagId", tagId);
  };

  return {
    state,
    setSortBy,
    setSelectedTagId,
  };
}

export const feedStore = createRoot(createFeedStore);
