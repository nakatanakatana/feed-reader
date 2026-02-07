import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  eq,
  createCollection,
  createLiveQueryCollection,
} from "@tanstack/solid-db";
import { ItemService, type ListItem } from "../gen/item/v1/item_pb";
import { queryClient, transport } from "./query";
import {
  DateFilterValue,
  dateToTimestamp,
  getPublishedSince,
} from "./item-utils";
import { itemsDateFilter, itemsShowReadFilter } from "./default";

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

const createItems = (showRead: boolean, since: DateFilterValue) => {
  let lastFetched: Date | null = null;
  const isRead = showRead ? {} : { isRead: false };
  const sinceTimestamp = since !== "all" ? getPublishedSince(since) : undefined;
  console.log("isRead", isRead, since);
  
  return createCollection(
    queryCollectionOptions({
      id: "items",
	  gcTime: 5*1000,
      queryClient,
      refetchInterval: 1 * 60 * 1000,
      queryKey: ["items", { since }],
      queryFn: async ({ queryKey }) => {
        const existingData = queryClient.getQueryData(queryKey) || [];
        const searchSince =
          lastFetched === null ? sinceTimestamp : dateToTimestamp(lastFetched);
        const response = await itemClient.listItems({
          since: searchSince,
          limit: 10000,
          offset: 0,
          ...isRead,
        });
        lastFetched = new Date();

        const respList = response.items.map((item: ListItem) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          publishedAt: item.publishedAt,
          isRead: item.isRead,
          createdAt: item.createdAt,
          feedId: item.feedId,
        }));

        // @ts-expect-error
        return [...existingData, ...respList];
      },
      getKey: (item: ListItem) => item.id,
      onUpdate: async ({ transaction }) => {
        const ids = transaction.mutations.map((m) => m.modified.id);
        const isRead = transaction.mutations[0].modified.isRead;

        await itemClient.updateItemStatus({
          ids: ids,
          isRead: isRead,
        });
        return { refetch: false };
      },
    }),
  );
};

export let items = createItems(itemsShowReadFilter, itemsDateFilter);

export const setItemsBase = (showRead: boolean, since: DateFilterValue) => {
  items = createItems(showRead, since);
};

export const itemsUnreadQuery = createLiveQueryCollection((q) =>
  q
    .from({ item: items })
    .where(({ item }) => eq(item.isRead, false))
    .select(({ item }) => ({ ...item })),
);

export const getItem = async (id: string) => {
  const response = await itemClient.getItem({ id });
  return response.item;
};
