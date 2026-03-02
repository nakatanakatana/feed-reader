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
  type ListItemReadsResponse,
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

// Global promise to deduplicate concurrent read status synchronizations
let pendingReadsSync: Promise<ListItemReadsResponse> | null = null;

/**
 * Synchronizes read/unread status of items across clients.
 * Uses a deduplication pattern to ensure only one request is pending at a time.
 * Cursor is advanced to the acquisition start time on success.
 */
export const syncItemReads = async (): Promise<ListItemReadsResponse | { itemReads: [] }> => {
  const lastSyncedValue = lastSyncedReads();
  if (lastSyncedValue === null) {
    return { itemReads: [] };
  }
  const searchSince = dateToTimestamp(lastSyncedValue);
  const fetchStartTime = new Date();

  if (pendingReadsSync) return pendingReadsSync;

  pendingReadsSync = (async () => {
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

        // 1. Update all items queries in the TanStack Query cache
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

        // 2. Update active solid-db collection directly to prevent "revert" flickering
        try {
          const currentCollection = items();
          for (const read of response.itemReads) {
            currentCollection.utils.writeUpdate({
              id: read.itemId,
              isRead: read.isRead,
            });
          }
        } catch (error) {
          // Items collection might not be initialized
        }
      }

      // Always advance the cursor to the timing of this acquisition on success
      setLastSyncedReads(fetchStartTime);
      return response;
    } catch (error) {
      console.error("Failed to sync item reads", error);
      throw error;
    } finally {
      pendingReadsSync = null;
    }
  })();

  return pendingReadsSync;
};

const createItems = (showRead: boolean, since: DateFilterValue) => {
  const isReadFilter = showRead ? {} : { isRead: false };
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
        const existingDataCache = queryClient.getQueryData(queryKey);
        const isFirstLoadForThisQuery = !existingDataCache;
        
        // Use global lastFetched cursor for incremental, or filters-based timestamp for first load
        const searchSince = isFirstLoadForThisQuery
          ? sinceTimestamp
          : (lastFetchedValue ? dateToTimestamp(lastFetchedValue) : sinceTimestamp);

        const fetchStartTime = new Date();

        // Coordinated fetch for both new items and read status updates
        const [response] = await Promise.all([
          itemClient.listItems({
            since: searchSince,
            limit: 10000,
            offset: 0,
            ...isReadFilter,
          }),
          // Only sync reads if it's an incremental update
          !isFirstLoadForThisQuery && lastFetchedValue !== null
            ? syncItemReads()
            : Promise.resolve({ itemReads: [] }),
        ]);

        // Advance global cursors
        setLastFetched(fetchStartTime);
        if (isFirstLoadForThisQuery || lastSyncedReads() === null) {
          setLastSyncedReads(fetchStartTime);
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

        // Get latest data from cache AFTER the await to avoid overwriting updates from parallel sync
        const currentData =
          (queryClient.getQueryData(queryKey) as ListItem[]) || [];

        const itemMap = new Map<string, ListItem>();
        // Add items from the ListItems response first
        for (const item of respList) {
          itemMap.set(item.id, item);
        }
        // Overwrite/Add existing data from cache (which now includes sync updates from Step 1)
        for (const item of currentData) {
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
