import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import type { ListFeed } from "../gen/feed/v1/feed_pb";
import { FeedService } from "../gen/feed/v1/feed_pb";
import { ItemService } from "../gen/item/v1/item_pb";
import type { Tag } from "../gen/tag/v1/tag_pb";
import { queryClient, transport } from "./query";

export type { Tag };

export interface Feed {
  id: string;
  url: string;
  title: string;
  unreadCount?: bigint;
  tags?: Tag[];
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  isRead: boolean;
  createdAt: string;
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
  await itemClient.updateItemStatus(params);
  queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const feeds = createCollection(
  queryCollectionOptions({
    id: "feeds",
    queryClient,
    queryKey: ["feeds"],
    queryFn: async () => {
      const response = await feedClient.listFeeds({});
      return response.feeds.map((feed: ListFeed) => ({
        id: feed.id,
        url: feed.url,
        title: feed.title,
        unreadCount: feed.unreadCount,
        tags: feed.tags,
      }));
    },
    getKey: (feed: Feed) => feed.id,
    onInsert: async () => {
      // In a real app, we might want to call the API here.
      // But the spec says "Minimal UX regression: Synchronization behavior should remain reliable."
      // For now we just sync with the query.
    },
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
      return response.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        publishedAt: item.publishedAt,
        isRead: item.isRead,
        createdAt: item.createdAt,
      }));
    },
    getKey: (item: Item) => item.id,
  }),
);

// We still export a "db" object if we want to follow the spec's "Initialize the TanStack DB instance"
// even if it's just a collection of collections.
export const db = {
  feeds,
  items,
};
