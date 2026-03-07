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
  // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
  onInsert: async ({ transaction }: any) => {
    const idsByIsRead = new Map<boolean, string[]>();

    for (const m of transaction.mutations) {
      const id = m.modified.id;
      const isRead = m.modified.isRead;
      let group = idsByIsRead.get(isRead);
      if (!group) {
        group = [];
        idsByIsRead.set(isRead, group);
      }
      group.push(id);
    }

    for (const [isRead, ids] of idsByIsRead.entries()) {
      await itemClient.updateItemStatus({
        ids: ids,
        isRead: isRead,
      });
    }

    return { refetch: false };
  },
  // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
  onUpdate: async ({ transaction }: any) => {
    const idsByIsRead = new Map<boolean, string[]>();

    for (const m of transaction.mutations) {
      const id = m.modified.id;
      const isRead = m.modified.isRead;
      let group = idsByIsRead.get(isRead);
      if (!group) {
        group = [];
        idsByIsRead.set(isRead, group);
      }
      group.push(id);
    }

    for (const [isRead, ids] of idsByIsRead.entries()) {
      await itemClient.updateItemStatus({
        ids: ids,
        isRead: isRead,
      });
    }

    return { refetch: false };
  },
};

const collection = createRoot(() => {
  return createCollection(
    // biome-ignore lint/suspicious/noExplicitAny: using any for options
    queryCollectionOptions(itemReadCollectionOptions as any),
  );
});

export const itemReadCollection = () => collection;

export const updateItemReadStatus = async (ids: string[], isRead: boolean) => {
  try {
    await itemReadCollection().utils.writeUpsert(
      ids.map((id) => ({
        id,
        isRead,
        updatedAt: new Date().toISOString(),
      })),
    );
  } catch (e) {
    console.warn("ItemRead collection cache update failed", e);
    throw e;
  }
};

export const markItemsRead = updateItemReadStatus;
