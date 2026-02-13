import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createLiveQueryCollection,
  eq,
  useLiveQuery,
} from "@tanstack/solid-db";
import { type Accessor, createMemo, createRoot, createSignal } from "solid-js";
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

        return { refetch: false };
      },
    }),
  );
};

export const items = createRoot(() =>
  createMemo(() =>
    createItems(itemStore.state.showRead, itemStore.state.since),
  ),
);

export const itemsUnreadQuery = createRoot(() =>
  createMemo(() =>
    createLiveQueryCollection((q) =>
      q
        .from({ item: items() })
        .where(({ item }) => eq(item.isRead, false))
        .select(({ item }) => ({ ...item })),
    ),
  ),
);

export function useSortedLiveQuery<T extends { createdAt: string }>(
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB query builder types are complex
  callback: (q: any) => any,
) {
  const query = useLiveQuery(callback);

  const sortedData = createMemo(() => {
    const data = (query() || []) as T[];
    return [...data].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  });

  const wrapped = () => sortedData();

  Object.defineProperties(wrapped, {
    isLoading: {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing isLoading from useLiveQuery result
      get: () => (query as any).isLoading,
      enumerable: true,
    },
    isError: {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing isError from useLiveQuery result
      get: () => (query as any).isError,
      enumerable: true,
    },
    // Also include isPending for compatibility
    isPending: {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing isPending from useLiveQuery result
      get: () => (query as any).isPending,
      enumerable: true,
    },
  });

  return wrapped as Accessor<T[]> & {
    isLoading: boolean;
    isError: boolean;
    isPending: boolean;
  };
}

export const getItem = async (id: string) => {
  const response = await itemClient.getItem({ id });
  return response.item;
};
