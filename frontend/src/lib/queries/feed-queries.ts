import {
  count,
  createLiveQueryCollection,
  eq,
  type InitialQueryBuilder,
  isUndefined,
} from "@tanstack/solid-db";
import { feeds, feedTag } from "../feed-db";
import { tags } from "../tag-db";

export type FeedSortOption =
  | "title_asc"
  | "title_desc"
  | "last_fetched"
  | "next_fetch";

interface FeedListQueryOptions {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  feedsCollection?: any;
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  feedTagCollection?: any;
  tagId?: string | null;
  sortBy?: FeedSortOption;
}

interface TagPickerQueryOptions {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  tagsCollection?: any;
}

interface TagsWithFeedCountOptions {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  tagsCollection?: any;
  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB collection types are too strict for shared builders
  feedTagCollection?: any;
}

export const buildTagsWithFeedCountQuery = (
  q: InitialQueryBuilder,
  options: TagsWithFeedCountOptions = {},
) => {
  const tagsCollection = options.tagsCollection ?? tags;
  const feedTagCollection = options.feedTagCollection ?? feedTag;

  return (
    q
      .from({ tag: tagsCollection })
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ ft: feedTagCollection }, ({ tag, ft }: any) =>
        eq(tag.id, ft.tagId),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB group types
      .groupBy(({ tag }: any) => [
        tag.id,
        tag.name,
        tag.unreadCount,
        tag.feedCount,
        tag.createdAt,
        tag.updatedAt,
      ])
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
      .select(({ tag, ft }: any) => ({
        id: tag.id,
        name: tag.name,
        unreadCount: tag.unreadCount,
        feedCount: tag.feedCount ?? count(ft?.feedId),
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }))
  );
};

export const tagsWithFeedCountQuery = createLiveQueryCollection((q) =>
  buildTagsWithFeedCountQuery(q),
);

export const buildTagPickerQuery = (
  q: InitialQueryBuilder,
  options: TagPickerQueryOptions = {},
) => {
  const tagsCollection = options.tagsCollection ?? tagsWithFeedCountQuery;

  return (
    q
      .from({ tag: tagsCollection })
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order/select types
      .orderBy(({ tag }: any) => tag.feedCount, "desc")
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
      .select(({ tag }: any) => ({ ...tag }))
  );
};

export const tagPickerQuery = createLiveQueryCollection((q) =>
  buildTagPickerQuery(q),
);

export const buildFeedListQuery = (
  q: InitialQueryBuilder,
  options: FeedListQueryOptions = {},
) => {
  const feedsCollection = options.feedsCollection ?? feeds;
  const feedTagCollection = options.feedTagCollection ?? feedTag;
  const tagId = options.tagId;
  const sortBy = options.sortBy ?? "title_asc";

  let query = q.from({ feed: feedsCollection });

  if (tagId === null) {
    query = query
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ ft: feedTagCollection }, ({ feed, ft }: any) =>
        eq(feed.id, ft.feedId),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
      .where(({ ft }: any) => isUndefined(ft));
  }

  if (tagId && tagId !== null) {
    query = query
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB join types
      .leftJoin({ ft: feedTagCollection }, ({ feed, ft }: any) =>
        eq(feed.id, ft.feedId),
      )
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB where types
      .where(({ ft }: any) => eq(ft?.tagId, tagId));
  }

  if (sortBy === "title_desc") {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order types
    query = query.orderBy(({ feed }: any) => feed.title, "desc");
  } else if (sortBy === "last_fetched") {
    query = query
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order types
      .orderBy(({ feed }: any) => feed.lastFetchedAt, "asc")
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order types
      .orderBy(({ feed }: any) => feed.title, "asc");
  } else if (sortBy === "next_fetch") {
    query = query
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order types
      .orderBy(({ feed }: any) => feed.nextFetchAt, "asc")
      // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order types
      .orderBy(({ feed }: any) => feed.title, "asc");
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: TanStack DB order types
    query = query.orderBy(({ feed }: any) => feed.title, "asc");
  }

  // biome-ignore lint/suspicious/noExplicitAny: TanStack DB select types
  return query.select(({ feed }: any) => ({ ...feed }));
};
