import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { createRoot } from "solid-js";
import { itemClient } from "./api/client";
import {
  lastItemsSyncedAt,
  lastReadFetched,
  setLastReadFetched,
} from "./item-sync-state";
import { dateToTimestamp } from "./item-utils";
import { queryClient } from "./query";

export interface ItemRead {
  id: string;
  isRead: boolean;
  updatedAt: string;
}

export const itemReadCollectionOptions = {
  id: "item-reads",
  gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
  queryClient,
  refetchInterval: 1 * 60 * 1000, // Sync every minute
  queryKey: ["item-reads"],
  // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
  queryFn: async ({ queryKey }: any) => {
    const existingData =
      (queryClient.getQueryData(queryKey) as ItemRead[]) || [];

    // Initial sync anchor baseline
    let anchor = lastReadFetched();
    if (!anchor) {
      // Use the completion time of the items list sync as the initial baseline
      anchor = lastItemsSyncedAt();
    }

    // Skip fetching read states if we don't have an anchor yet.
    // The anchor will be initialized during the initial items fetch.
    if (!anchor) {
      return existingData;
    }

    let pageToken = "";
    const allNewReads: ItemRead[] = [];
    let maxServerUpdatedAt: Date | undefined;

    do {
      const response = await itemClient.listItemRead({
        // The backend explicitly rejects requests that specify both updatedSince and pageToken.
        // Send updatedSince only on the first page.
        updatedSince:
          !pageToken && anchor ? dateToTimestamp(anchor) : undefined,
        pageToken: pageToken,
        pageSize: 1000,
      });

      for (const ir of response.itemReads || []) {
        let updatedAtDate: Date;

        if (ir.updatedAt) {
          updatedAtDate = new Date(
            Number(ir.updatedAt.seconds) * 1000 +
              Math.floor(ir.updatedAt.nanos / 1000000),
          );

          if (
            !maxServerUpdatedAt ||
            updatedAtDate.getTime() > maxServerUpdatedAt.getTime()
          ) {
            maxServerUpdatedAt = updatedAtDate;
          }
        } else {
          // Fall back to the previous anchor when server timestamp is missing
          updatedAtDate = anchor ?? new Date(0);
        }

        allNewReads.push({
          id: ir.itemId,
          isRead: ir.isRead,
          updatedAt: updatedAtDate.toISOString(),
        });
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    // Advance the anchor based on the latest server-updated timestamp seen.
    // If there are no results (or no server timestamps), leave the anchor unchanged.
    if (maxServerUpdatedAt) {
      if (!anchor || maxServerUpdatedAt.getTime() > anchor.getTime()) {
        setLastReadFetched(maxServerUpdatedAt);
      }
    }

    const readMap = new Map<string, ItemRead>();
    for (const read of existingData) {
      readMap.set(read.id, read);
    }
    for (const read of allNewReads) {
      readMap.set(read.id, read);
    }

    return Array.from(readMap.values());
  },
  getKey: (read: ItemRead) => read.id,
};

const collection = createRoot(() => {
  return createCollection(
    // biome-ignore lint/suspicious/noExplicitAny: using any for options
    queryCollectionOptions(itemReadCollectionOptions as any),
  );
});

export const itemReadCollection = () => collection;

export const updateItemReadStatus = async (ids: string[], isRead: boolean) => {
  // Save previous states for rollback if needed
  const existingData =
    (queryClient.getQueryData(itemReadCollectionOptions.queryKey) as
      | ItemRead[]
      | undefined) || [];
  const previousStates = existingData.filter((d) => ids.includes(d.id));

  // Update local cache first (optimistic update)
  try {
    await itemReadCollection().utils.writeUpsert(
      ids.map((id) => ({
        id,
        isRead,
        updatedAt: new Date().toISOString(),
      })),
    );
  } catch (e) {
    // If the collection is not ready, we can safely ignore the local cache update
    // because the server will be updated and the next delta sync will fetch the state.
    if (!(e instanceof Error && e.name === "SyncNotInitializedError")) {
      console.warn("ItemRead collection cache update failed", e);
    }
  }

  // Then send the authoritative update to the server
  try {
    await itemClient.updateItemStatus({
      ids: ids,
      isRead: isRead,
    });
  } catch (e) {
    console.warn("Failed to update item status on server, rolling back", e);

    // Rollback local cache to previous states
    try {
      if (previousStates.length > 0) {
        await itemReadCollection().utils.writeUpsert(previousStates);
      }
      // Note: We don't have a direct way to remove newly added optimistic records
      // if they weren't in the cache before, but restoring known previous states
      // covers most rollback scenarios.
    } catch (re) {
      console.error("Rollback failed", re);
    }

    throw e;
  }
};

export const markItemsRead = updateItemReadStatus;
