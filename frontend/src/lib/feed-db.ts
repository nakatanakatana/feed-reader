import { base64ToBytes } from "./api/base64";
import { apiClient } from "./api/client";
import { mapRefreshFeedsRequest } from "./api/mutation-mappers";
import type { components } from "./api/types";
import { type TimestampLike, toDate } from "./date-utils";
import { fetchingState } from "./fetching-state";
import { queryClient } from "./query";
import {
  type ConnectTagShape,
  mapConnectTag,
  mapOpenAPITag,
  type Tag,
} from "./tag-db";

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

type OpenAPIFeed = components["schemas"]["Feed"];
type ListFeedsResponse = components["schemas"]["ListFeedsResponse"];
type CreateFeedResponse = components["schemas"]["CreateFeedResponse"];
type RefreshFeedsResponse = components["schemas"]["RefreshFeedsResponse"];
type ExportOpmlResponse = components["schemas"]["ExportOpmlResponse"];
type ListFeedTagsResponse = components["schemas"]["ListFeedTagsResponse"];
type EmptyResponse = Record<string, never>;

export interface ConnectFeedShape {
  id: string;
  url: string;
  link?: string;
  title: string;
  unreadCount: bigint;
  lastFetchedAt?: Date | TimestampLike | string;
  nextFetchAt?: Date | TimestampLike | string;
  createdAt?: Date | TimestampLike | string;
  updatedAt?: Date | TimestampLike | string;
  tags: ConnectTagShape[];
}

export const mapConnectFeed = (feed: ConnectFeedShape): Feed => ({
  id: feed.id,
  url: feed.url,
  link: feed.link,
  title: feed.title,
  unreadCount: feed.unreadCount,
  lastFetchedAt: toDate(feed.lastFetchedAt),
  nextFetchAt: toDate(feed.nextFetchAt),
  createdAt: toDate(feed.createdAt),
  updatedAt: toDate(feed.updatedAt),
  tags: feed.tags.map(mapConnectTag),
});

export const mapOpenAPIFeed = (feed: OpenAPIFeed): Feed => ({
  id: feed.id,
  url: feed.url,
  link: feed.link,
  title: feed.title,
  unreadCount: BigInt(feed.unreadCount),
  lastFetchedAt: toDate(feed.lastFetchedAt),
  nextFetchAt: toDate(feed.nextFetchAt),
  createdAt: toDate(feed.createdAt),
  updatedAt: toDate(feed.updatedAt),
  tags: feed.tags.map(mapOpenAPITag),
});

export const manageFeedTags = async (params: {
  feedIds: string[];
  addTagIds: string[];
  removeTagIds: string[];
}) => {
  await apiClient.post<EmptyResponse>("/feed-tags/manage", params);
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
  queryClient.invalidateQueries({ queryKey: ["tags"] });
  queryClient.invalidateQueries({ queryKey: ["feed-tags"] });
};

export const refreshFeeds = async (feedIds: string[]) => {
  fetchingState.startFetching(feedIds);
  try {
    const res = await apiClient.post<RefreshFeedsResponse>(
      "/feeds/refresh",
      mapRefreshFeedsRequest(feedIds),
    );
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
  await apiClient.post<EmptyResponse>("/feeds/suspend", {
    ids: feedIds,
    suspendSeconds: String(suspendSeconds),
  });
  queryClient.invalidateQueries({ queryKey: ["feeds"] });
};

export const exportFeeds = async (feedIds: string[]) => {
  const res = await apiClient.post<ExportOpmlResponse>("/feeds/export-opml", {
    ids: feedIds,
  });
  const opmlContent = base64ToBytes(res.opmlContent);
  const opmlBuffer = new ArrayBuffer(opmlContent.byteLength);
  new Uint8Array(opmlBuffer).set(opmlContent);
  const blob = new Blob([opmlBuffer], {
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
    const response = await apiClient.get<ListFeedsResponse>("/feeds");
    return response.feeds.map(mapOpenAPIFeed);
  },
};

export const feedInsert = async (url: string, tags: Tag[]) => {
  const tagIds = tags.map((t) => t.id);
  await apiClient.post<CreateFeedResponse>("/feeds", { url, tagIds });
  await queryClient.invalidateQueries({ queryKey: ["feeds"] });
};

export const feedDelete = async (id: string) => {
  await apiClient.delete<EmptyResponse>(`/feeds/${id}`);
  await queryClient.invalidateQueries({ queryKey: ["feeds"] });
  await queryClient.invalidateQueries({ queryKey: ["tags"] });
  await queryClient.invalidateQueries({ queryKey: ["feed-tags"] });
};

export const feedTagsQueryOptions = {
  queryKey: ["feed-tags"] as const,
  queryFn: async () => {
    const response = await apiClient.get<ListFeedTagsResponse>("/feed-tags");
    return response.feedTags.map((ft) => ({
      id: `${ft.feedId}-${ft.tagId}`,
      feedId: ft.feedId,
      tagId: ft.tagId,
    }));
  },
};
