import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createTransaction,
  localStorageCollectionOptions,
} from "@tanstack/solid-db";
import { ItemService, type ListItem } from "../gen/item/v1/item_pb";
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
}

const itemClient = createClient(ItemService, transport);

export const updateItemStatus = async (params: {
  ids: string[];
  isRead?: boolean;
}) => {
  await itemClient.updateItemStatus(params);
  // queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const localRead = createCollection(
  localStorageCollectionOptions({
    id: "local-read-items",
    storageKey: "local-read-items",
    getKey: (item: { id: string }) => item.id,
    onInsert: async ({ transaction }) => {
      const ids = transaction.mutations.map((mutation) => mutation.modified.id);
      await updateItemStatus({
        ids: ids,
        isRead: true,
      });
    },
    onDelete: async () => {},
  }),
);

export const createItemBulkMarkAsReadTx = () =>
  createTransaction({
    mutationFn: async ({ transaction }) => {
      const ids = transaction.mutations
        // @ts-expect-error
        .filter((m) => m.collection === localRead)
        .map((m) => m.modified.id);

      console.log("ids", ids);
      localRead.utils.acceptMutations(transaction);
    },
  });

export const createItems = (showRead: boolean, since: DateFilterValue) => {
  let lastFetched: Date | null = null;
  const isRead = showRead ? {} : { isRead: false };
  const sinceTimestamp = since !== "all" ? getPublishedSince(since) : undefined;
  const items = createCollection(
    queryCollectionOptions({
      id: "items",
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
    }),
  );

  return items;
};
