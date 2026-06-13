import { createSignal } from "solid-js";

// Shared sync anchor for item read states
export const [lastReadFetched, setLastReadFetched] = createSignal<Date | null>(
  null,
);

// Shared sync anchor for items list, keyed by filter options (e.g. showRead-since)
export const [lastFetchedMap, setLastFetchedMap] = createSignal<
  Record<string, Date | null>
>({});

// Legacy compatibility for database resets
export const setLastFetched = (val: Date | null) => {
  if (val === null) {
    setLastFetchedMap({});
  }
};

// Last time items were successfully synced (for UI indicators)
export const [lastItemsSyncedAt, setLastItemsSyncedAt] =
  createSignal<Date | null>(null);
