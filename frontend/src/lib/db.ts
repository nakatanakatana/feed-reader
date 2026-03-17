import { queryClient } from "./query";

// Re-export all database modules
export * from "./feed-db";
export * from "./item-db";
export * from "./item-read-db";
export * from "./item-sync-state";
export * from "./tag-db";

// Import for db object
import { feeds, feedTag } from "./feed-db";
import { itemReadCollection } from "./item-read-db";
import { setLastFetched, setLastItemsSyncedAt, setLastReadFetched } from "./item-sync-state";
import { tags } from "./tag-db";

// We still export a "db" object if we want to follow the spec's "Initialize the TanStack DB instance"
// even if it's just a collection of collections.
export const db = {
  feeds,
  feedTag,
  tags,
  itemRead: itemReadCollection,
};

export const resetDatabase = () => {
  console.log("DB: resetDatabase called");
  setLastFetched(null);
  setLastReadFetched(null);
  setLastItemsSyncedAt(null);
  // resetQueries will clear data and trigger refetch for active queries
  queryClient.resetQueries();
};
