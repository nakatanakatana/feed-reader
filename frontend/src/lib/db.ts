import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
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

export const mapItem = (item: {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  feedId: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}): Item => ({
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
    indices: ["createdAt", "updatedAt", "id", "isRead"],
    onInsert: async () => {},
    onUpdate: async () => {},
    onDelete: async () => {},
  }),
);

export const unreadItems = createLiveQueryCollection({
  query: (q) =>
    q.from({ items: items }).where(({ items }) => eq(items.isRead, false)),
  getKey: (item: Item) => item.id,
  onInsert: async () => {},
  onUpdate: async () => {},
  onDelete: async () => {},
});

export const readItems = createLiveQueryCollection({
  query: (q) =>
    q.from({ items: items }).where(({ items }) => eq(items.isRead, true)),
  getKey: (item: Item) => item.id,
  onInsert: async () => {},
  onUpdate: async () => {},
  onDelete: async () => {},
});

export const getMergedItemsQuery = () => {
  return createLiveQueryCollection((q) =>
    q.from({ items: items }).orderBy(({ items }) => items.createdAt, "asc"),
  );
};

export const updateItemStatus = async (params: {
  ids: string[];
  isRead?: boolean;
}) => {
  // Optimistic update
  const isRead = !!params.isRead;
  for (const id of params.ids) {
    if (items.has(id)) {
      items.update(id, (draft) => {
        draft.isRead = isRead;
      });
    }
  }

  try {
    await itemClient.updateItemStatus(params);
  } finally {
    queryClient.invalidateQueries({ queryKey: ["items"] });
  }
};

export const db = {
  feeds,
  items,
  unreadItems,
  readItems,
  getMergedItemsQuery,
  addFeed,
  updateItemStatus,
};
