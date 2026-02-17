import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
import { createMemo, createRoot, createSignal } from "solid-js";
import { ItemService, type ListItem } from "../gen/item/v1/item_pb";
import { itemStore } from "./item-store";
import {
  type DateFilterValue,
  dateToTimestamp,
  getPublishedSince,
} from "./item-utils";
import { queryClient, transport } from "./query";

export interface Item {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  isRead: boolean;
  createdAt: string;
  feedId: string;
  url?: string;
  author?: string;
  categories?: string;
  imageUrl?: string;
  content?: string;
}

export const itemClient = createClient(ItemService, transport);

export const [lastFetched, setLastFetched] = createSignal<Date | null>(null);

const createItems = (showRead: boolean, since: DateFilterValue) => {
  setLastFetched(null);
  const isRead = showRead ? {} : { isRead: false };
  const sinceTimestamp = since !== "all" ? getPublishedSince(since) : undefined;

  return createCollection(
    queryCollectionOptions({
      id: "items",
      gcTime: 5 * 1000,
      queryClient,

      refetchInterval: 1 * 60 * 1000,
      queryKey: ["items", { since, showRead }],
      queryFn: async ({ queryKey }) => {
        // Clear transient removed items on any fresh fetch/refetch
        itemStore.clearTransientRemovedIds();

        const existingData = queryClient.getQueryData(queryKey) || [];
        const lastFetchedValue = lastFetched();
        const searchSince =
          lastFetchedValue === null
            ? sinceTimestamp
            : dateToTimestamp(lastFetchedValue);
        const response = await itemClient.listItems({
          since: searchSince,
          limit: 10000,
          offset: 0,
          ...isRead,
        });
        setLastFetched(new Date());

        const respList = response.items.map((item: ListItem) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          publishedAt: item.publishedAt,
          isRead: item.isRead,
          createdAt: item.createdAt,
          feedId: item.feedId,
          url: item.url,
        }));

        // @ts-expect-error
        return [...existingData, ...respList];
      },
      getKey: (item: ListItem) => item.id,
      onUpdate: async ({ transaction }) => {
        const ids = transaction.mutations.map((m) => {
          //NOTE: update localClientState
          items().utils.writeUpdate({
            ...m.modified,
          });
          return m.modified.id;
        });
        const firstMutation = transaction.mutations[0];
        const isRead = firstMutation.modified.isRead;

        await itemClient.updateItemStatus({
          ids: ids,
          isRead: isRead,
        });

        // Invalidate individual item queries to ensure consistency
        for (const id of ids) {
          queryClient.invalidateQueries({ queryKey: ["item", id] });
        }

        return { refetch: false };
      },
    }),
  );
};

export const items = createRoot(() => {
  return createMemo(() =>
    createItems(itemStore.state.showRead, itemStore.state.since),
  );
});

export const itemsUnreadQuery = createRoot(() => {
  const collection = createLiveQueryCollection((q) =>
    q
      .from({ item: items() })
      .where(({ item }) => eq(item.isRead, false))
      .select(({ item }) => ({ ...item })),
  );
  return () => collection;
});

export const getItem = async (id: string) => {
  const response = await itemClient.getItem({ id });
  return response.item;
};

export const updateItemStatus = async (id: string, isRead: boolean) => {
  // Update the item query cache directly for immediate UI feedback in the modal
  queryClient.setQueryData(["item", id], (old: any) => {
    if (!old) return old;
    return { ...old, isRead };
  });

  // Try to update the items collection if the item is present
  try {
    const itemInCollection = items().get(id);
    if (itemInCollection) {
      items().update(id, (draft) => {
        draft.isRead = isRead;
      });
    } else {
      // If not in collection, call the API directly
      await itemClient.updateItemStatus({
        ids: [id],
        isRead: isRead,
      });
    }
  } catch (e) {
    // If update fails (e.g. not in collection), fallback to direct API call
    console.warn("Failed to update items collection, calling API directly", e);
    await itemClient.updateItemStatus({
      ids: [id],
      isRead: isRead,
    });
  }

  // Invalidate to ensure consistency across the app
  queryClient.invalidateQueries({ queryKey: ["item", id] });
};
