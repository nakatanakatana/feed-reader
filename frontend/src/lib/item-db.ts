import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  coalesce,
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
import { createMemo, createRoot, createSignal } from "solid-js";
import {
  ItemService,
  type ListItem as ProtoListItem,
} from "../gen/item/v1/item_pb";
import { itemReadCollection } from "./item-read-db";
import { itemStore } from "./item-store";
import { lastFetched, setLastFetched } from "./item-sync-state";
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
        const existingData =
          (queryClient.getQueryData(queryKey) as ListItem[]) || [];
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
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ read: itemReadCollection() }, ({ item, read }: any) =>
        eq(item.id, read.id),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
      .where(({ item, read }: any) => {
        // Prioritize delta-synced read status for unread calculations
        return eq(coalesce(read.isRead, item.isRead), false);
      })
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
      .select(({ item, read }: any) => ({
        ...item,
        isRead: coalesce(read.isRead, item.isRead),
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
