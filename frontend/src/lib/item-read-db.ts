import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { createRoot } from "solid-js";
import { itemClient } from "./api/client";
import { lastReadFetched, setLastReadFetched } from "./item-sync-state";
import { dateToTimestamp } from "./item-utils";
import { queryClient } from "./query";

export interface ItemRead {
  id: string;
  isRead: boolean;
  updatedAt: Date;
}

export const itemReadCollectionOptions = {
  id: "item-reads",
  gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
  queryClient,
  refetchInterval: 1 * 60 * 1000, // Sync every minute
  queryKey: ["item-reads"],
  queryFn: async ({ queryKey }: any) => {
    // Initial sync anchor baseline
    const anchor = lastReadFetched();

    // Skip fetching read states if we don't have an anchor yet.
    // Return an empty array to ensure a clean state (e.g. during reset or initial sync).
    if (!anchor) {
      return [];
    }

    const existingData = (queryClient.getQueryData(queryKey) as ItemRead[]) || [];

    let pageToken = "";
    const allNewReads: ItemRead[] = [];
    let maxServerUpdatedAt: Date | undefined;

    do {
      const response = await itemClient.listItemRead({
        // The backend explicitly rejects requests that specify both since and pageToken.
        // Send since only on the first page.
        since: !pageToken && anchor ? dateToTimestamp(anchor) : undefined,
        pageToken: pageToken,
        pageSize: 1000,
      });

      for (const ir of response.itemReads || []) {
        let updatedAtDate: Date;

        if (ir.updatedAt) {
          updatedAtDate = new Date(
            Number(ir.updatedAt.seconds) * 1000 + Math.floor(ir.updatedAt.nanos / 1000000),
          );

          if (!maxServerUpdatedAt || updatedAtDate.getTime() > maxServerUpdatedAt.getTime()) {
            maxServerUpdatedAt = updatedAtDate;
          }
        } else {
          // Fall back to the previous anchor when server timestamp is missing
          updatedAtDate = anchor ?? new Date(0);
        }

        allNewReads.push({
          id: ir.itemId,
          isRead: ir.isRead,
          updatedAt: updatedAtDate,
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
  return createCollection(queryCollectionOptions(itemReadCollectionOptions as any));
});

export const itemReadCollection = () => collection;

export const updateItemReadStatus = async (ids: string[], isRead: boolean) => {
  // Save previous states for rollback if needed
  const existingData =
    (queryClient.getQueryData(itemReadCollectionOptions.queryKey) as ItemRead[] | undefined) || [];
  const previousStates = existingData.filter((d) => ids.includes(d.id));

  // Update local cache first (optimistic update)
  try {
    await itemReadCollection().utils.writeUpsert(
      ids.map((id) => ({
        id,
        isRead,
        updatedAt: new Date(),
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
        await itemReadCollection().utils.writeUpsert(previousStates as any);
      }

      // Explicitly remove optimistic rows for ids that had no prior state
      const idsWithPreviousState = new Set(previousStates.map((s) => s.id));
      const idsToRemove = ids.filter((id) => !idsWithPreviousState.has(id));

      if (idsToRemove.length > 0) {
        queryClient.setQueryData(
          itemReadCollectionOptions.queryKey,
          (oldData: ItemRead[] | undefined) =>
            (oldData || []).filter((item) => !idsToRemove.includes(item.id)),
        );
      }
    } catch (re) {
      console.error("Rollback failed", re);
    }

    throw e;
  }
};

export const markItemsRead = updateItemReadStatus;
