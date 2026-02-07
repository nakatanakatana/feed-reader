import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createTransaction,
  localStorageCollectionOptions,
} from "@tanstack/solid-db";
import { ItemService, type ListItem } from "../gen/item/v1/item_pb";
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

export const items = createCollection(
  queryCollectionOptions({
    id: "items",
    queryClient,
    refetchInterval: 1 * 60 * 1000,
    queryKey: ["items"],
    queryFn: async () => {
      const response = await itemClient.listItems({
        limit: 10000,
        offset: 0,
      });

      return response.items.map((item: ListItem) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        publishedAt: item.publishedAt,
        isRead: item.isRead,
        createdAt: item.createdAt,
        feedId: item.feedId,
      }));
    },
    getKey: (item: Item) => item.id,
  }),
);

export const getItem = async (id: string) => {
  const response = await itemClient.getItem({ id });
  return response.item;
};
