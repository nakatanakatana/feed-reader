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

const itemClient = createClient(ItemService, transport);

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

        // Invalidate all queries whose key starts with ["item"] in a single call.
        // This avoids O(n) invalidateQueries calls over each id, at the cost of also
        // refetching some unrelated item queries.
        queryClient.invalidateQueries({ queryKey: ["item"], exact: false });

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
  // biome-ignore lint/suspicious/noExplicitAny: Cache type is complex
  let previousItemCache: any;
  // Update the item query cache directly for immediate UI feedback in the modal
  // biome-ignore lint/suspicious/noExplicitAny: Query data type is complex
  queryClient.setQueryData(["item", id], (old: any) => {
    previousItemCache = old;
    if (!old) return old;
    return { ...old, isRead };
  });

  // Decide whether we need to call the API directly.
  let shouldCallApi = false;
  const collection = items();

  try {
    const itemInCollection = collection.get(id);

    if (itemInCollection) {
      // Try to update the items collection if the item is present.
      // If this fails (including any onUpdate side effects), fall back to a direct API call.
      try {
        collection.update(id, (draft) => {
          draft.isRead = isRead;
        });
      } catch (e) {
        console.warn(
          "Failed to update items collection, falling back to API call",
          e,
        );
        shouldCallApi = true;
      }
    } else {
      // If not in collection, call the API directly.
      shouldCallApi = true;
    }

    if (shouldCallApi) {
      await itemClient.updateItemStatus({
        ids: [id],
        isRead: isRead,
      });
    }
  } catch (error) {
    // Roll back optimistic update if the backend update ultimately fails
    if (previousItemCache !== undefined) {
      queryClient.setQueryData(["item", id], previousItemCache);
    }
    throw error;
  } finally {
    // Invalidate to ensure consistency across the app.
    // Note: If we used collection.update, onUpdate already handles invalidation after API success.
    // However, if we called API directly or there's a delay, we invalidate again here.
    if (shouldCallApi || !collection.get(id)) {
      queryClient.invalidateQueries({ queryKey: ["item", id] });
    }
  }
};
