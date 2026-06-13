import type { Feed, FeedTag } from "../feed-db";
import type { Tag } from "../tag-db";

export type FeedSortOption =
  | "title_asc"
  | "title_desc"
  | "last_fetched"
  | "next_fetch";

export interface TagWithFeedCount extends Tag {
  feedCount: bigint;
}

export const getTagsWithFeedCount = (
  tagsList: Tag[],
  feedTagsList: FeedTag[],
): TagWithFeedCount[] => {
  const feedCountMap = new Map<string, number>();
  for (const ft of feedTagsList) {
    feedCountMap.set(ft.tagId, (feedCountMap.get(ft.tagId) ?? 0) + 1);
  }

  return tagsList.map((tag) => ({
    ...tag,
    feedCount: tag.feedCount ?? BigInt(feedCountMap.get(tag.id) ?? 0),
  }));
};

export const getTagPicker = (
  tagsWithCount: TagWithFeedCount[],
): TagWithFeedCount[] => {
  return [...tagsWithCount].sort((a, b) => {
    const diff = b.feedCount - a.feedCount;
    return diff > 0n ? 1 : diff < 0n ? -1 : 0;
  });
};

export const getFeedList = (
  feedsList: Feed[],
  feedTagsList: FeedTag[],
  options: { tagId?: string | null; sortBy?: FeedSortOption } = {},
): Feed[] => {
  let result = [...feedsList];
  const { tagId, sortBy } = options;

  if (tagId === null) {
    const taggedFeedIds = new Set(feedTagsList.map((ft) => ft.feedId));
    result = result.filter((feed) => !taggedFeedIds.has(feed.id));
  } else if (tagId) {
    const feedIdsWithTag = new Set(
      feedTagsList.filter((ft) => ft.tagId === tagId).map((ft) => ft.feedId),
    );
    result = result.filter((feed) => feedIdsWithTag.has(feed.id));
  }

  result.sort((a, b) => {
    if (sortBy === "title_desc") {
      return b.title.localeCompare(a.title);
    }
    if (sortBy === "last_fetched") {
      const timeA = a.lastFetchedAt?.getTime() ?? 0;
      const timeB = b.lastFetchedAt?.getTime() ?? 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "next_fetch") {
      const timeA = a.nextFetchAt?.getTime() ?? 0;
      const timeB = b.nextFetchAt?.getTime() ?? 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.title.localeCompare(b.title);
    }
    return a.title.localeCompare(b.title);
  });

  return result;
};
