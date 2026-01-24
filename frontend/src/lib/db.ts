import { createClient } from "@connectrpc/connect";
import { createCollection } from "@tanstack/solid-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { FeedService } from "../gen/feed/v1/feed_connect";
import { ItemService } from "../gen/item/v1/item_connect";
import { transport, queryClient } from "./query";

export interface Feed {
  uuid: string;
  url: string;
  link?: string;
  title: string;
  description?: string;
  language?: string;
  imageUrl?: string;
  copyright?: string;
  feedType?: string;
  feedVersion?: string;
  lastFetchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  feedId: string;
  isRead: boolean;
  isSaved: boolean;
}

// ... (imports)

// ... (feedClient creation)

export const addFeed = async (url: string) => {
  const response = await feedClient.createFeed({ url });
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
  return response.feed;
};

export const feeds = createCollection(
// ...
  queryCollectionOptions({
    id: "feeds",
    queryClient,
    queryKey: ["feeds"],
    queryFn: async () => {
      const response = await feedClient.listFeeds({});
      return response.feeds;
    },
    getKey: (feed: Feed) => feed.uuid,
    onInsert: async ({ transaction }) => {
      // In a real app, we might want to call the API here.
      // But the spec says "Minimal UX regression: Synchronization behavior should remain reliable."
      // For now we just sync with the query.
    },
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        if (mutation.type === "delete") {
          await feedClient.deleteFeed({ uuid: mutation.key as string });
        }
      }
    }
  })
);

export const items = createCollection(
  queryCollectionOptions({
    id: "items",
    queryClient,
    queryKey: ["items"],
    queryFn: async () => {
      const response = await itemClient.listItems({});
      return response.items;
    },
    getKey: (item: Item) => item.id,
  })
);

// We still export a "db" object if we want to follow the spec's "Initialize the TanStack DB instance"
// even if it's just a collection of collections.
export const db = {
  feeds,
  items,
};