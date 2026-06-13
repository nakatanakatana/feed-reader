import { createClient } from "@connectrpc/connect";
import { FeedService } from "../gen/feed/v1/feed_pb";
import type { Tag } from "../gen/tag/v1/tag_pb";
import { toDate } from "./date-utils";
import { fetchingState } from "./fetching-state";
import { queryClient, transport } from "./query";

export interface Feed {
  id: string;
  url: string;
  link?: string;
  title: string;
  unreadCount?: bigint;
  lastFetchedAt?: Date;
  nextFetchAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
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
    queryClient.invalidateQueries({ queryKey: ["feeds"] });
    queryClient.invalidateQueries({ queryKey: ["items"] });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    queryClient.invalidateQueries({ queryKey: ["item-reads"] });
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

export const feedsQueryOptions = {
  queryKey: ["feeds"] as const,
  queryFn: async () => {
    const response = await feedClient.listFeeds({});
    return response.feeds.map((feed) => ({
      id: feed.id,
      url: feed.url,
      link: feed.link,
      title: feed.title,
      unreadCount: feed.unreadCount,
      lastFetchedAt: toDate(feed.lastFetchedAt),
      nextFetchAt: toDate(feed.nextFetchAt),
      createdAt: toDate(feed.createdAt),
      updatedAt: toDate(feed.updatedAt),
      tags: feed.tags,
    }));
  },
};

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

export const feedTagsQueryOptions = {
  queryKey: ["feed-tags"] as const,
  queryFn: async () => {
    const response = await feedClient.listFeedTags({});
    return response.feedTags.map((ft) => ({
      id: `${ft.feedId}-${ft.tagId}`,
      feedId: ft.feedId,
      tagId: ft.tagId,
    }));
  },
};
