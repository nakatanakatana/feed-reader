import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  coalesce,
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
import { createMemo, createRoot } from "solid-js";
import { ItemService } from "../gen/item/v1/item_pb";
import { itemReadCollection } from "./item-read-db";
import { itemStore } from "./item-store";
import {
  lastFetched,
  lastReadFetched,
  setLastFetched,
  setLastItemsSyncedAt,
  setLastReadFetched,
} from "./item-sync-state";
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
  publishedAt?: Date;
  isRead: boolean;
  createdAt?: Date;
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

const toDate = (ts: { seconds: bigint; nanos: number } | undefined) => {
  if (!ts) return undefined;
  return new Date(Number(ts.seconds) * 1000 + ts.nanos / 1000000);
};

const createItems = (showRead: boolean, since: DateFilterValue) => {
  setLastFetched(null);
  const isReadParam = showRead ? {} : { isRead: false };
  const sinceTimestamp = since !== "all" ? getPublishedSince(since) : undefined;
  const queryKey = ["items", { since, showRead }] as const;

  return createCollection(
    queryCollectionOptions<ListItem>({
      id: "items",
      gcTime: 5 * 1000,
      queryClient,

      refetchInterval: 1 * 60 * 1000,
      queryKey,
      queryFn: async ({ queryKey }) => {
        const existingData =
          (queryClient.getQueryData(queryKey) as ListItem[]) || [];
        const lastFetchedValue = lastFetched();
        const searchSince =
          lastFetchedValue === null
            ? sinceTimestamp
            : dateToTimestamp(lastFetchedValue);

        let pageToken = "";
        const allNewItems: ListItem[] = [];

        do {
          const response = await itemClient.listItems({
            since: searchSince,
            pageSize: 1000,
            pageToken: pageToken,
            ...isReadParam,
          });

          if (response.items && response.items.length > 0) {
            allNewItems.push(
              ...response.items.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                publishedAt: toDate(item.publishedAt),
                isRead: item.isRead,
                createdAt: toDate(item.createdAt),
                feedId: item.feedId,
                url: item.url,
              })),
            );
          }

          pageToken = response.nextPageToken;
        } while (pageToken);

        const syncTime = new Date();
        setLastItemsSyncedAt(syncTime);

        if (allNewItems.length > 0) {
          const validDates = allNewItems
            .map((item) => item.createdAt?.getTime())
            .filter((t): t is number => t !== undefined && !Number.isNaN(t));

          const maxTime = validDates.length > 0 ? Math.max(...validDates) : 0;

          // Initialize the read-state anchor if it hasn't been set yet.
          if (!lastReadFetched() && maxTime > 0) {
            const overlapMs = 5 * 1000; // 5 seconds overlap
            const initialReadAnchor = new Date(maxTime - overlapMs);
            setLastReadFetched(initialReadAnchor);
          }

          if (validDates.length > 0) {
            const currentAnchorTime = lastFetchedValue
              ? lastFetchedValue.getTime()
              : 0;

            if (maxTime > currentAnchorTime) {
              setLastFetched(new Date(maxTime));
            } else if (lastFetchedValue !== null) {
              setLastFetched(lastFetchedValue);
            }
          } else if (lastFetchedValue !== null) {
            setLastFetched(lastFetchedValue);
          }
        } else if (lastFetchedValue !== null) {
          setLastFetched(lastFetchedValue);
        }

        const itemMap = new Map<string, ListItem>();
        for (const item of existingData) {
          itemMap.set(item.id, item);
        }
        for (const item of allNewItems) {
          itemMap.set(item.id, item);
        }

        return Array.from(itemMap.values());
      },
      getKey: (item: ListItem) => item.id,
      onUpdate: async ({ transaction }) => {
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

        // Update the query cache for each group
        queryClient.setQueryData(queryKey, (old: ListItem[] | undefined) => {
          if (!old) return old;
          const updated = [...old];
          for (const [isRead, ids] of idsByIsRead.entries()) {
            const idSet = new Set(ids);
            for (let i = 0; i < updated.length; i++) {
              if (idSet.has(updated[i].id)) {
                updated[i] = { ...updated[i], isRead };
              }
            }
          }
          return updated;
        });

        for (const [isRead, ids] of idsByIsRead.entries()) {
          await itemClient.updateItemStatus({
            ids: ids,
            isRead: isRead,
          });
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
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ read: itemReadCollection() }, ({ item, read }: any) =>
        eq(item.id, read.id),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
      .where(({ item, read }: any) => {
        // Prioritize delta-synced read status for unread calculations
        return eq(coalesce(read?.isRead, item.isRead), false);
      })
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
      .select(({ item, read }: any) => ({
        ...item,
        isRead: coalesce(read?.isRead, item.isRead),
      })),
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
    publishedAt: toDate(response.item.publishedAt),
    isRead: response.item.isRead,
    createdAt: toDate(response.item.createdAt),
    feedId: response.item.feedId,
    url: response.item.url,
    author: response.item.author,
    categories: response.item.categories,
    imageUrl: response.item.imageUrl,
    content: response.item.content,
  };
};
