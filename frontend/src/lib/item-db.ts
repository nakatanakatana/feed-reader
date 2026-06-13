import { itemClient } from "./api/client";
import { toDate } from "./date-utils";
import {
  lastFetchedMap,
  lastReadFetched,
  setLastFetchedMap,
  setLastItemsSyncedAt,
  setLastReadFetched,
} from "./item-sync-state";
import {
  type DateFilterValue,
  dateToTimestamp,
  getPublishedSince,
} from "./item-utils";
import { queryClient } from "./query";

export interface ListItem {
  id: string;
  title: string;
  description?: string;
  publishedAt?: Date;
  isRead: boolean;
  createdAt?: Date;
  feedId: string;
  url?: string;
}

export interface Item extends ListItem {
  author?: string;
  categories?: string;
  imageUrl?: string;
  content?: string;
}

export const getItemsQueryOptions = (
  showRead: boolean,
  since: DateFilterValue,
) => {
  const isReadParam = showRead ? {} : { isRead: false };
  const sinceTimestamp = since !== "all" ? getPublishedSince(since) : undefined;
  const queryKey = ["items", { since, showRead }] as const;
  const cacheKey = `${showRead}-${since}`;

  return {
    queryKey,
    refetchInterval: 1 * 60 * 1000,
    queryFn: async () => {
      const lastFetchedValue = lastFetchedMap()[cacheKey] ?? null;
      const existingData =
        lastFetchedValue === null
          ? []
          : queryClient.getQueryData<ListItem[]>(queryKey) || [];
      const searchSince =
        lastFetchedValue === null
          ? sinceTimestamp
          : dateToTimestamp(lastFetchedValue);

      let pageToken = "";
      const allNewItems: ListItem[] = [];

      do {
        const response = await itemClient.listItems({
          since: searchSince,
          pageSize: 1000,
          pageToken: pageToken,
          ...isReadParam,
        });

        if (response.items && response.items.length > 0) {
          allNewItems.push(
            ...response.items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              publishedAt: toDate(item.publishedAt),
              isRead: item.isRead,
              createdAt: toDate(item.createdAt),
              feedId: item.feedId,
              url: item.url,
            })),
          );
        }

        pageToken = response.nextPageToken;
      } while (pageToken);

      const syncTime = new Date();
      setLastItemsSyncedAt(syncTime);

      if (allNewItems.length > 0) {
        const validDates = allNewItems
          .map((item) => item.createdAt?.getTime())
          .filter((t): t is number => t !== undefined && !Number.isNaN(t));

        const maxTime = validDates.length > 0 ? Math.max(...validDates) : 0;

        if (!lastReadFetched() && maxTime > 0) {
          const overlapMs = 5 * 1000;
          const initialReadAnchor = new Date(maxTime - overlapMs);
          setLastReadFetched(initialReadAnchor);
        }

        if (validDates.length > 0) {
          const currentAnchorTime = lastFetchedValue
            ? lastFetchedValue.getTime()
            : 0;

          if (maxTime > currentAnchorTime) {
            setLastFetchedMap((prev) => ({
              ...prev,
              [cacheKey]: new Date(maxTime),
            }));
          } else if (lastFetchedValue !== null) {
            setLastFetchedMap((prev) => ({
              ...prev,
              [cacheKey]: lastFetchedValue,
            }));
          }
        } else if (lastFetchedValue !== null) {
          setLastFetchedMap((prev) => ({
            ...prev,
            [cacheKey]: lastFetchedValue,
          }));
        }
      } else if (lastFetchedValue !== null) {
        setLastFetchedMap((prev) => ({
          ...prev,
          [cacheKey]: lastFetchedValue,
        }));
      }

      const itemMap = new Map<string, ListItem>();
      for (const item of existingData) {
        itemMap.set(item.id, item);
      }
      for (const item of allNewItems) {
        itemMap.set(item.id, item);
      }

      return Array.from(itemMap.values());
    },
  };
};

export const updateItemStatus = async (
  ids: string[],
  isRead: boolean,
  queryKey: readonly unknown[],
) => {
  const previousData = queryClient.getQueryData<ListItem[]>(queryKey);

  queryClient.setQueryData(queryKey, (old: ListItem[] | undefined) => {
    if (!old) return old;
    const updated = [...old];
    const idSet = new Set(ids);
    for (let i = 0; i < updated.length; i++) {
      if (idSet.has(updated[i].id)) {
        updated[i] = { ...updated[i], isRead };
      }
    }
    return updated;
  });

  try {
    await itemClient.updateItemStatus({
      ids: ids,
      isRead: isRead,
    });
  } catch (e) {
    if (previousData) {
      queryClient.setQueryData(queryKey, previousData);
    }
    throw e;
  }
};

export const getItem = async (id: string): Promise<Item | null> => {
  const response = await itemClient.getItem({ id });
  if (!response.item) return null;
  return {
    id: response.item.id,
    title: response.item.title,
    description: response.item.description,
    publishedAt: toDate(response.item.publishedAt),
    isRead: response.item.isRead,
    createdAt: toDate(response.item.createdAt),
    feedId: response.item.feedId,
    url: response.item.url,
    author: response.item.author,
    categories: response.item.categories,
    imageUrl: response.item.imageUrl,
    content: response.item.content,
  };
};
