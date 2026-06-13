import { apiClient } from "./api/client";
import { mapUpdateItemStatusRequest } from "./api/mutation-mappers";
import type { components } from "./api/types";
import { type TimestampLike, toDate } from "./date-utils";
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

type OpenAPIItem = components["schemas"]["Item"];
type ListItemsResponse = components["schemas"]["ListItemsResponse"];
type GetItemResponse = components["schemas"]["GetItemResponse"];
type EmptyResponse = Record<string, never>;

export interface ConnectItemShape {
  id: string;
  title: string;
  description: string;
  publishedAt?: Date | TimestampLike | string;
  isRead: boolean;
  createdAt?: Date | TimestampLike | string;
  feedId: string;
  url: string;
  author: string;
  categories: string;
  imageUrl: string;
  content: string;
}

export const mapConnectItem = (item: ConnectItemShape): Item => ({
  id: item.id,
  title: item.title,
  description: item.description,
  publishedAt: toDate(item.publishedAt),
  isRead: item.isRead,
  createdAt: toDate(item.createdAt),
  feedId: item.feedId,
  url: item.url,
  author: item.author,
  categories: item.categories,
  imageUrl: item.imageUrl,
  content: item.content,
});

export const mapOpenAPIItem = (item: OpenAPIItem): Item => ({
  id: item.id,
  title: item.title,
  description: item.description,
  publishedAt: toDate(item.publishedAt),
  isRead: item.isRead,
  createdAt: toDate(item.createdAt),
  feedId: item.feedId,
  url: item.url,
  author: item.author,
  categories: item.categories,
  imageUrl: item.imageUrl,
  content: item.content,
});

const timestampToISOString = (
  value: ReturnType<typeof dateToTimestamp> | undefined,
) => toDate(value)?.toISOString();

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
        const params = new URLSearchParams();
        const sinceValue = timestampToISOString(searchSince);
        if (sinceValue) params.set("since", sinceValue);
        params.set("pageSize", "1000");
        if (pageToken) params.set("pageToken", pageToken);
        if (isReadParam.isRead !== undefined) {
          params.set("isRead", String(isReadParam.isRead));
        }

        const response = await apiClient.get<ListItemsResponse>(
          `/items?${params.toString()}`,
        );

        if (response.items && response.items.length > 0) {
          allNewItems.push(...response.items.map(mapOpenAPIItem));
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
    await apiClient.post<EmptyResponse>(
      "/items/status",
      mapUpdateItemStatusRequest(ids, isRead),
    );
  } catch (e) {
    if (previousData) {
      queryClient.setQueryData(queryKey, previousData);
    }
    throw e;
  }
};

export const getItem = async (id: string): Promise<Item | null> => {
  const response = await apiClient.get<GetItemResponse>(`/items/${id}`);
  if (!response.item) return null;
  return mapOpenAPIItem(response.item);
};
