import { createEffect, createRoot, createStore } from "solid-js";
import {
  getStorageValue,
  STORAGE_KEYS,
  setStorageValue,
} from "./storage-utils";

export type FeedSortBy =
  | "title_asc"
  | "title_desc"
  | "last_fetched"
  | "next_fetch";

const isFeedSortBy = (val: unknown): val is FeedSortBy => {
  return (
    typeof val === "string" &&
    ["title_asc", "title_desc", "last_fetched", "next_fetch"].includes(val)
  );
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
  createEffect(
    () => state.sortBy,
    (sortBy) => {
      setStorageValue(STORAGE_KEYS.FEED_SORT_BY, sortBy);
    },
  );

  createEffect(
    () => state.selectedTagId,
    (selectedTagId) => {
      setStorageValue(STORAGE_KEYS.FEED_TAG_FILTER, selectedTagId);
    },
  );

  const setSortBy = (sortBy: FeedSortBy) => {
    setState((draft) => {
      draft.sortBy = sortBy;
    });
  };

  const setSelectedTagId = (tagId: string | undefined | null) => {
    setState((draft) => {
      draft.selectedTagId = tagId;
    });
  };

  return {
    state,
    setSortBy,
    setSelectedTagId,
  };
}

export const feedStore = createRoot(createFeedStore);
