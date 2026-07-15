import type { FeedTag } from "../feed-db";
import type { ListItem } from "../item-db";
import type { ItemRead } from "../item-read-db";
import type { Tag } from "../tag-db";

export interface MergedItem extends ListItem {
  isRead: boolean;
}

export interface TagUnreadCount {
  id: string;
  name: string;
  unreadCount: bigint;
}

const mergedItemCache = new WeakMap<
  ListItem,
  { isRead: boolean; merged: MergedItem }
>();

const sortedItemsCache = new WeakMap<ListItem[], ListItem[]>();

export const getItemsWithReadState = (
  itemsList: ListItem[],
  readsList: ItemRead[],
  feedTagsList: FeedTag[],
  options: { tagId?: string; itemId?: string; unreadOnly?: boolean } = {},
): MergedItem[] => {
  let sortedItems = sortedItemsCache.get(itemsList);
  if (!sortedItems) {
    sortedItems = [...itemsList].sort((a, b) => {
      const timeA = a.publishedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const timeB = b.publishedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (timeA !== timeB) return timeA - timeB;

      const createA = a.createdAt?.getTime() ?? 0;
      const createB = b.createdAt?.getTime() ?? 0;
      return createA - createB;
    });
    sortedItemsCache.set(itemsList, sortedItems);
  }

  const readMap = new Map<string, boolean>();
  for (const r of readsList) {
    readMap.set(r.id, r.isRead);
  }

  let result: MergedItem[] = sortedItems.map((item) => {
    const isRead = readMap.get(item.id) ?? item.isRead;
    const cached = mergedItemCache.get(item);
    if (cached && cached.isRead === isRead) {
      return cached.merged;
    }
    const merged = { ...item, isRead };
    mergedItemCache.set(item, { isRead, merged });
    return merged;
  });

  if (options.itemId) {
    result = result.filter((item) => item.id === options.itemId);
  }

  if (options.tagId) {
    const feedIdsWithTag = new Set(
      feedTagsList
        .filter((ft) => ft.tagId === options.tagId)
        .map((ft) => ft.feedId),
    );
    result = result.filter((item) => feedIdsWithTag.has(item.feedId));
  }

  if (options.unreadOnly) {
    result = result.filter((item) => !item.isRead);
  }

  return result;
};

/** Items visible in ItemList and eligible for modal prev/next navigation. */
export const filterVisibleListItems = (
  items: MergedItem[],
  transientRemovedIds: Record<string, boolean>,
): MergedItem[] => items.filter((item) => !transientRemovedIds[item.id]);

export const getTagUnreadCounts = (
  tagsList: Tag[],
  feedTagsList: FeedTag[],
  unreadItemsList: { feedId: string }[],
): TagUnreadCount[] => {
  const unreadCountByFeed = new Map<string, number>();
  for (const item of unreadItemsList) {
    unreadCountByFeed.set(
      item.feedId,
      (unreadCountByFeed.get(item.feedId) ?? 0) + 1,
    );
  }

  return tagsList.map((tag) => {
    const matchedFeedIds = feedTagsList
      .filter((ft) => ft.tagId === tag.id)
      .map((ft) => ft.feedId);
    let countVal = 0n;
    for (const feedId of matchedFeedIds) {
      countVal += BigInt(unreadCountByFeed.get(feedId) ?? 0);
    }
    return {
      id: tag.id,
      name: tag.name,
      unreadCount: countVal,
    };
  });
};

export const getTotalUnreadCount = (unreadItemsList: MergedItem[]): bigint => {
  return BigInt(unreadItemsList.length);
};
