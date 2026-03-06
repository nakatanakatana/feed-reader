import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { createRoot, createSignal } from "solid-js";
import { itemClient } from "./api/client";
import { lastFetched as itemsLastFetched } from "./item-db";
import { queryClient } from "./query";

export interface ItemRead {
  id: string;
  isRead: boolean;
  updatedAt: string;
}

export const [lastReadFetched, setLastReadFetched] = createSignal<Date | null>(
  null,
);

export const itemReadCollectionOptions = {
  id: "item-reads",
  gcTime: 24 * 60 * 60 * 1000, // Keep for 24 hours
  queryClient,
  queryKey: ["item-reads"],
  // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB context
  queryFn: async ({ queryKey }: any) => {
    const existingData =
      (queryClient.getQueryData(queryKey) as ItemRead[]) || [];

    // Initial sync anchor baseline
    let anchor = lastReadFetched();
    if (!anchor) {
      anchor = itemsLastFetched();
    }

    const response = await itemClient.listItemRead({
      updatedSince: anchor
        ? { seconds: BigInt(Math.floor(anchor.getTime() / 1000)), nanos: 0 }
        : undefined,
      pageSize: 1000,
    });

    setLastReadFetched(new Date());

    const newReads: ItemRead[] = response.itemReads.map((ir) => ({
      id: ir.itemId,
      isRead: ir.isRead,
      updatedAt: ir.updatedAt
        ? new Date(Number(ir.updatedAt.seconds) * 1000).toISOString()
        : new Date().toISOString(),
    }));

    const readMap = new Map<string, ItemRead>();
    for (const read of existingData) {
      readMap.set(read.id, read);
    }
    for (const read of newReads) {
      readMap.set(read.id, read);
    }

    return Array.from(readMap.values());
  },
  getKey: (read: ItemRead) => read.id,
  // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
  onInsert: async ({ transaction }: any) => {
    // biome-ignore lint/suspicious/noExplicitAny: using any for mutation
    const ids = transaction.mutations.map((m: any) => {
      return m.modified.id;
    });

    const firstMutation = transaction.mutations[0];
    const isRead = firstMutation.modified.isRead;

    await itemClient.updateItemStatus({
      ids: ids,
      isRead: isRead,
    });

    return { refetch: false };
  },
  // biome-ignore lint/suspicious/noExplicitAny: using any for TanStack DB transaction
  onUpdate: async ({ transaction }: any) => {
    // biome-ignore lint/suspicious/noExplicitAny: using any for mutation
    const ids = transaction.mutations.map((m: any) => {
      // Update local state immediately (handled by tanstack/db)
      return m.modified.id;
    });

    const firstMutation = transaction.mutations[0];
    const isRead = firstMutation.modified.isRead;

    await itemClient.updateItemStatus({
      ids: ids,
      isRead: isRead,
    });

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
  itemReadCollection().utils.writeUpsert(
    ids.map((id) => ({
      id,
      isRead,
      updatedAt: new Date().toISOString(),
    })),
  );
};

export const markItemsRead = updateItemReadStatus;
