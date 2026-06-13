import {
  setLastFetched,
  setLastItemsSyncedAt,
  setLastReadFetched,
} from "./item-sync-state";
import { queryClient } from "./query";

export * from "./block-db";
export * from "./feed-db";
export * from "./item-db";
export * from "./item-read-db";
export * from "./item-sync-state";
export * from "./queries/feed-queries";
export * from "./queries/item-queries";
export { queryClient } from "./query";
export * from "./tag-db";

export const resetDatabase = () => {
  console.log("DB: resetDatabase called");
  setLastFetched(null);
  setLastReadFetched(null);
  setLastItemsSyncedAt(null);
  // resetQueries will clear data and trigger refetch for active queries
  queryClient.resetQueries();
};
