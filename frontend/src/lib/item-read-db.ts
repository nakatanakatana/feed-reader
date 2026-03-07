import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { createRoot } from "solid-js";
import { itemClient } from "./api/client";
import {
  lastFetched,
  lastReadFetched,
  setLastReadFetched,
} from "./item-sync-state";
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
      anchor = lastFetched();
    }

    let allNewReads: ItemRead[] = [];
    let pageToken = "";

    do {
      const response = await itemClient.listItemRead({
        updatedSince: anchor
          ? { seconds: BigInt(Math.floor(anchor.getTime() / 1000)), nanos: 0 }
          : undefined,
        pageSize: 1000,
        pageToken: pageToken || undefined,
      });

      const newReads: ItemRead[] = (response.itemReads || []).map((ir) => ({
        id: ir.itemId,
        isRead: ir.isRead,
        updatedAt: ir.updatedAt
          ? new Date(Number(ir.updatedAt.seconds) * 1000).toISOString()
          : (anchor ?? new Date(0)).toISOString(),
      }));
      allNewReads = allNewReads.concat(newReads);
      pageToken = response.nextPageToken;
    } while (pageToken);

    // Update anchor based on the most recent updatedAt from the server
    if (allNewReads.length > 0) {
      const maxUpdatedAt = new Date(
        Math.max(...allNewReads.map((r) => new Date(r.updatedAt).getTime())),
      );
      // Advance to the max timestamp from results
      setLastReadFetched(maxUpdatedAt);
    } else if (anchor) {
      // If no new data, keep using the previous anchor instead of advancing using client clock
      setLastReadFetched(anchor);
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
    console.warn(
      "ItemRead collection operation failed, calling API directly",
      e,
    );
    await itemClient.updateItemStatus({
      ids: ids,
      isRead: isRead,
    });
  }
};

export const markItemsRead = updateItemReadStatus;
