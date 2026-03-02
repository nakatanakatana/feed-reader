import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
import { createMemo, createRoot, createSignal } from "solid-js";
import {
  ItemService,
  type ListItem as ProtoListItem,
} from "../gen/item/v1/item_pb";
import { itemStore } from "./item-store";
import {
  type DateFilterValue,
  dateToTimestamp,
  getPublishedSince,
} from "./item-utils";
import { queryClient, transport } from "./query";

export interface ListItem {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  isRead: boolean;
  createdAt: string;
  feedId: string;
  url?: string;
}

export interface Item extends ListItem {
  author?: string;
  categories?: string;
  imageUrl?: string;
  content?: string;
}

const itemClient = createClient(ItemService, transport);

export const [lastFetched, setLastFetched] = createSignal<Date | null>(null);
export const [lastSyncedReads, setLastSyncedReads] = createSignal<Date | null>(null);

export const syncItemReads = async () => {
  const lastSyncedValue = lastSyncedReads();
  if (lastSyncedValue === null) {
    // Wait until the initial items are fetched to have a base timestamp
    return;
  }
  const searchSince = dateToTimestamp(lastSyncedValue);
  const now = new Date();

  try {
    const response = await itemClient.listItemReads({
      since: searchSince,
      limit: 10000,
      offset: 0,
    });

    if (response.itemReads && response.itemReads.length > 0) {
      const updatesMap = new Map(
        response.itemReads.map((read) => [read.itemId, read.isRead]),
      );

      // Update all items queries in the cache
      queryClient.setQueriesData<ListItem[]>(
        { queryKey: ["items"] },
        (existingData) => {
          if (!existingData) return existingData;

          let hasChanges = false;
          const newData = existingData.map((item) => {
            if (updatesMap.has(item.id)) {
              const newIsRead = updatesMap.get(item.id)!;
              if (item.isRead !== newIsRead) {
                hasChanges = true;
                return { ...item, isRead: newIsRead };
              }
            }
            return item;
          });

          return hasChanges ? newData : existingData;
        },
      );

      // Update the active solid-db collection directly to prevent "revert" behavior
      try {
        const currentCollection = items();
        for (const read of response.itemReads) {
          currentCollection.utils.writeUpdate({
            id: read.itemId,
            isRead: read.isRead,
          });
        }
      } catch (error) {
        // Items collection might not be initialized in some contexts (e.g. background sync before first mount)
        // In that case, the setQueriesData update above is sufficient as it will be picked up
        // when the collection eventually initializes.
      }

      let maxTimestamp = 0;
      for (const read of response.itemReads) {
        if (read.updatedAt) {
          let ts = 0;
          if (typeof read.updatedAt === "string") {
            ts = new Date(read.updatedAt).getTime();
          } else if ("seconds" in read.updatedAt) {
            ts =
              Number(read.updatedAt.seconds) * 1000 +
              (read.updatedAt.nanos || 0) / 1000000;
          }

          if (ts > maxTimestamp) {
            maxTimestamp = ts;
          }
        }
      }

      if (maxTimestamp > 0) {
        // Use maxTimestamp + 1ms to avoid fetching the same items in the next poll
        setLastSyncedReads(new Date(maxTimestamp + 1));
      } else {
        setLastSyncedReads(now);
      }
    } else {
      // No new items, move the cursor forward to current time
      setLastSyncedReads(now);
    }
  } catch (error) {
    console.error("Failed to sync item reads", error);
  }
};

setInterval(() => {
  syncItemReads();
}, 60 * 1000);

const createItems = (showRead: boolean, since: DateFilterValue) => {
  setLastFetched(null);
  const isRead = showRead ? {} : { isRead: false };
  const sinceTimestamp = since !== "all" ? getPublishedSince(since) : undefined;

  return createCollection(
    queryCollectionOptions<ListItem>({
      id: "items",
      gcTime: 5 * 1000,
      queryClient,

      refetchInterval: 1 * 60 * 1000,
      queryKey: ["items", { since, showRead }],
      queryFn: async ({ queryKey }) => {
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
        
        const now = new Date();
        setLastFetched(now);

        // Initialize lastSyncedReads if it's the first fetch
        if (lastSyncedReads() === null) {
          setLastSyncedReads(now);
        }

        const respList = response.items.map((item: ProtoListItem) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          publishedAt: item.publishedAt,
          isRead: item.isRead,
          createdAt: item.createdAt,
          feedId: item.feedId,
          url: item.url,
        }));

        // Get the latest data from cache AFTER the await to avoid overwriting sync updates
        const existingData =
          (queryClient.getQueryData(queryKey) as ListItem[]) || [];

        const itemMap = new Map<string, ListItem>();
        for (const item of existingData) {
          itemMap.set(item.id, item);
        }
        for (const item of respList) {
          itemMap.set(item.id, item);
        }

        return Array.from(itemMap.values());
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

export const getItem = async (id: string): Promise<Item | null> => {
  const response = await itemClient.getItem({ id });
  if (!response.item) return null;
  return {
    id: response.item.id,
    title: response.item.title,
    description: response.item.description,
    publishedAt: response.item.publishedAt,
    isRead: response.item.isRead,
    createdAt: response.item.createdAt,
    feedId: response.item.feedId,
    url: response.item.url,
    author: response.item.author,
    categories: response.item.categories,
    imageUrl: response.item.imageUrl,
    content: response.item.content,
  };
};

export const updateItemReadStatus = async (ids: string[], isRead: boolean) => {
  await itemClient.updateItemStatus({
    ids: ids,
    isRead: isRead,
  });
};
