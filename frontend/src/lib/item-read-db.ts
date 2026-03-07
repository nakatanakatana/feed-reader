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

    // Record the start time of this fetch to use as the next anchor
    const syncStartTime = new Date();

    const response = await itemClient.listItemRead({
      updatedSince: anchor ? dateToTimestamp(anchor) : undefined,
    });

    const allNewReads: ItemRead[] = (response.itemReads || []).map((ir) => ({
      id: ir.itemId,
      isRead: ir.isRead,
      updatedAt: ir.updatedAt
        ? new Date(
            Number(ir.updatedAt.seconds) * 1000 +
              Math.floor(ir.updatedAt.nanos / 1000000),
          ).toISOString()
        : (anchor ?? new Date(0)).toISOString(),
    }));

    // Update anchor based on the start time of the request
    setLastReadFetched(syncStartTime);

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

export const createItemReadCollection = () => {
  return createCollection(
    // biome-ignore lint/suspicious/noExplicitAny: using any for options
    queryCollectionOptions(itemReadCollectionOptions as any),
  );
};

const collection = createRoot(() => {
  return createItemReadCollection();
});

export const itemReadCollection = () => collection;

export const updateItemReadStatus = async (ids: string[], isRead: boolean) => {
  const coll = itemReadCollection();
  try {
    coll.utils.writeUpsert(
      ids.map((id) => ({
        id,
        isRead,
        updatedAt: new Date().toISOString(),
      })),
    );
  } catch (e) {
    console.warn("ItemRead collection cache update failed", e);
  }

  // Always send the authoritative update to the server
  await itemClient.updateItemStatus({
    ids: ids,
    isRead: isRead,
  });
};

export const markItemsRead = updateItemReadStatus;
