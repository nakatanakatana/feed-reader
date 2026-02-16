import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import type { ListFeed } from "../gen/feed/v1/feed_pb";
import { FeedService } from "../gen/feed/v1/feed_pb";
import type { Tag } from "../gen/tag/v1/tag_pb";
import { fetchingState } from "./fetching-state";
import { queryClient, transport } from "./query";

export interface Feed {
  id: string;
  url: string;
  link?: string;
  title: string;
  unreadCount?: bigint;
  lastFetchedAt?: string;
  nextFetch?: string;
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

export const suspendFeeds = async (
  feedIds: string[],
  suspendSeconds: number,
) => {
  await feedClient.suspendFeeds({
    ids: feedIds,
    suspendSeconds: BigInt(suspendSeconds),
  });
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
};

export const exportFeeds = async (feedIds: string[]) => {
  const res = await feedClient.exportOpml({ ids: feedIds });
  const blob = new Blob([res.opmlContent as BlobPart], {
    type: "application/xml",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feeds.opml";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const feeds = createCollection(
  queryCollectionOptions({
    id: "feeds",
    queryClient,
    queryKey: ["feeds"],
    gcTime: 5 * 1000,
    queryFn: async () => {
      console.log("DB: feeds queryFn called");
      const response = await feedClient.listFeeds({});
      console.log("DB: feeds response", response);
      return response.feeds.map((feed: ListFeed) => ({
        id: feed.id,
        url: feed.url,
        link: feed.link,
        title: feed.title,
        unreadCount: feed.unreadCount,
        lastFetchedAt: feed.lastFetchedAt,
        nextFetch: feed.nextFetch,
        tags: feed.tags,
      }));
    },
    getKey: (feed: Feed) => feed.id,
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        if (mutation.type === "delete") {
          await feedClient.deleteFeed({ id: mutation.key as string });
        }
      }
    },
  }),
);

export const feedInsert = async (url: string, tags: Tag[]) => {
  const tagIds = tags.map((t) => t.id);
  await feedClient.createFeed({ url, tagIds });
  await queryClient.invalidateQueries({ queryKey: ["feeds"] });
};

export const feedDelete = async (id: string) => {
  await feedClient.deleteFeed({ id });
  await queryClient.invalidateQueries({ queryKey: ["feeds"] });
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
  await queryClient.invalidateQueries({ queryKey: ["feed-tags"] });
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
