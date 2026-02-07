import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import {
  createCollection,
  createLiveQueryCollection,
  eq,
} from "@tanstack/solid-db";
import type { ListFeed } from "../gen/feed/v1/feed_pb";
import { FeedService } from "../gen/feed/v1/feed_pb";
import { fetchingState } from "./fetching-state";
import { queryClient, transport } from "./query";
import { tags, type Tag } from "./tag-db";

export interface Feed {
  id: string;
  url: string;
  link?: string;
  title: string;
  unreadCount?: bigint;
  lastFetchedAt?: string;
  tags?: Tag[];
}

export interface FeedTag {
  id: string;
  feedId: string;
  tagId: string;
}

const feedClient = createClient(FeedService, transport);

export const manageFeedTags = async (params: {
  feedIds: string[];
  addTagIds: string[];
  removeTagIds: string[];
}) => {
  await feedClient.manageFeedTags(params);
  // Invalidate feeds, tags, and feed-tags as associations changed
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
  queryClient.invalidateQueries({ queryKey: ["tags"] });
  queryClient.invalidateQueries({ queryKey: ["feed-tags"] });
};

export const refreshFeeds = async (feedIds: string[]) => {
  fetchingState.startFetching(feedIds);
  try {
    const res = await feedClient.refreshFeeds({ ids: feedIds });
    fetchingState.finishFetching(
      feedIds,
      res.results.map((r) => ({
        feedId: r.feedId,
        errorMessage: r.errorMessage,
      })),
    );
    // Invalidate feeds, items, and tags as counts might have changed
    queryClient.invalidateQueries({ queryKey: ["feeds"] });
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    return res;
  } catch (err) {
    fetchingState.finishFetching(
      feedIds,
      feedIds.map((id) => ({
        feedId: id,
        errorMessage: err instanceof Error ? err.message : String(err),
      })),
    );
    throw err;
  }
};

export const feeds = createCollection(
  queryCollectionOptions({
    id: "feeds",
    queryClient,
    queryKey: ["feeds"],
    gcTime: 5 * 1000,
    queryFn: async () => {
      const response = await feedClient.listFeeds({});
      return response.feeds.map((feed: ListFeed) => ({
        id: feed.id,
        url: feed.url,
        link: feed.link,
        title: feed.title,
        lastFetchedAt: feed.lastFetchedAt,
        tags: feed.tags,
      }));
    },
    getKey: (feed: Feed) => feed.id,
    onInsert: async ({ transaction }) => {
      transaction.mutations.map(async (m) => {
        const url = m.modified.url;
        const tagIds = m.modified.tags.map((t) => t.id);
        await feedClient.createFeed({ url, tagIds });
      });
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

export const feedInsert = (url: string, tags: string[]) => {
  const dummyFeed = {
    id: "_dummy",
    url: "_dummy",
    link: "_dummy",
    title: "_dummy",
    lastFetchedAt: "",
    tags: [],
  };
  return feeds.insert({
    ...dummyFeed,
    url: url,
    tags: tags,
  });
};

export const feedTag = createCollection(
  queryCollectionOptions({
    id: "feed-tags",
    queryClient,
    queryKey: ["feed-tags"],
    queryFn: async () => {
      const response = await feedClient.listFeedTags({});
      return response.feedTags.map((ft) => ({
        id: `${ft.feedId}-${ft.tagId}`,
        feedId: ft.feedId,
        tagId: ft.tagId,
      }));
    },
    getKey: (feedTag: FeedTag) => feedTag.id,
  }),
);
