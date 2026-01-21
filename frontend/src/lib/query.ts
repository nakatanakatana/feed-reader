import { createConnectTransport } from "@connectrpc/connect-web";
import { createPromiseClient } from "@connectrpc/connect";
import { QueryClient } from "@tanstack/solid-query";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { Feed } from "../gen/feed/v1/feed_pb";
import { FeedService } from "../gen/feed/v1/feed_connect";

export const transport = createConnectTransport({
  baseUrl: "/api",
});

export const queryClient = new QueryClient();

const feedClient = createPromiseClient(FeedService, transport);

export const feedsCollection = createCollection<Feed>(
  queryCollectionOptions({
    queryKey: ["feeds"],
    queryFn: async () => {
      const response = await feedClient.listFeeds({});
      return response.feeds;
    },
    queryClient,
    getKey: (feed) => feed.uuid,
    onInsert: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        try {
          const response = await feedClient.createFeed(mutation.modified);
          if (response.feed) {
            feedsCollection.utils.writeUpdate(response.feed);
          }
        } catch (error) {
          console.error("Failed to persist insert to backend:", error);
          throw error;
        }
      }
    },
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        try {
          await feedClient.deleteFeed({ uuid: mutation.key });
        } catch (error) {
          console.error("Failed to persist delete to backend:", error);
          throw error;
        }
      }
    },
  })
);

export const useFeeds = () => {
  return feedsCollection.query().run();
};

export const db = {
  feeds: feedsCollection,
};
