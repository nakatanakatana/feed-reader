import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { FeedService } from "../gen/feed/v1/feed_pb";
import { ItemService } from "../gen/item/v1/item_pb";
import type { Tag } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "./query";

export type { Tag };

export interface Feed {
  id: string;
  url: string;
  link?: string;
  title: string;
  description?: string;
  lang?: string;
  imageUrl?: string;
  copyright?: string;
  feedType?: string;
  feedVersion?: string;
  lastFetchedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  unreadCount?: bigint;
}

export interface Item {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  feedId: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
}

const feedClient = createClient(FeedService, transport);
const itemClient = createClient(ItemService, transport);

export const addFeed = async (url: string, tagIds?: string[]) => {
  const response = await feedClient.createFeed({ url, tagIds });
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
  return response.feed;
};

export const updateItemStatus = async (params: {
  ids: string[];
  isRead?: boolean;
}) => {
  // Optimistic update
  for (const id of params.ids) {
    const item = items.get(id) || unreadItems.get(id) || readItems.get(id);
    if (item) {
      const updatedItem = { ...item, isRead: !!params.isRead };
      
      // Update items collection
      if (items.has(id)) {
        items.update(id, (draft) => { draft.isRead = !!params.isRead; });
      } else {
        items.insert(updatedItem);
      }

      if (params.isRead) {
        unreadItems.delete(id);
        if (!readItems.has(id)) {
          readItems.insert(updatedItem);
        }
      } else {
        readItems.delete(id);
        if (!unreadItems.has(id)) {
          unreadItems.insert(updatedItem);
        }
      }
    }
  }

  try {
    await itemClient.updateItemStatus(params);
  } finally {
    queryClient.invalidateQueries({ queryKey: ["items"] });
  }
};

const mapItem = (item: any): Item => ({
  id: item.id,
  url: item.url,
  title: item.title,
  description: item.description,
  publishedAt: item.publishedAt,
  author: item.author,
  feedId: item.feedId,
  isRead: item.isRead,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt || item.createdAt,
});

export const feeds = createCollection(
  queryCollectionOptions({
    id: "feeds",
    queryClient,
    queryKey: ["feeds"],
    queryFn: async () => {
      const response = await feedClient.listFeeds({});
      return response.feeds;
    },
    getKey: (feed: Feed) => feed.id,
    onInsert: async () => {},
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        if (mutation.type === "delete") {
          await feedClient.deleteFeed({ id: mutation.key as string });
        }
      }
    },
  }),
);

export const unreadItems = createCollection(
  queryCollectionOptions({
    id: "unreadItems",
    queryClient,
    queryKey: ["items", "list", { isRead: false }],
    queryFn: async () => {
      const response = await itemClient.listItems({ isRead: false });
      return response.items.map(mapItem);
    },
    getKey: (item: Item) => item.id,
    indices: ["createdAt", "updatedAt", "id"],
    onInsert: async () => {},
    onUpdate: async () => {},
    onDelete: async () => {},
  }),
);

export const readItems = createCollection(
  queryCollectionOptions({
    id: "readItems",
    queryClient,
    queryKey: ["items", "list", { isRead: true }],
    queryFn: async () => {
      const response = await itemClient.listItems({ isRead: true });
      return response.items.map(mapItem);
    },
    getKey: (item: Item) => item.id,
    indices: ["createdAt", "updatedAt", "id"],
    onInsert: async () => {},
    onUpdate: async () => {},
    onDelete: async () => {},
  }),
);

export const items = createCollection(
  queryCollectionOptions({
    id: "items",
    queryClient,
    queryKey: ["items"],
    queryFn: async () => {
      const response = await itemClient.listItems({});
      return response.items.map(mapItem);
    },
    getKey: (item: Item) => item.id,
    indices: ["createdAt", "updatedAt", "id"],
    onInsert: async () => {},
    onUpdate: async () => {},
    onDelete: async () => {},
  }),
);

export const db = {
  feeds,
  items,
  unreadItems,
  readItems,
};