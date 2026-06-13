import { apiClient } from "./api/client";
import type { components } from "./api/types";
import { lastReadFetched, setLastReadFetched } from "./item-sync-state";
import { queryClient } from "./query";

export interface ItemRead {
  id: string;
  isRead: boolean;
  updatedAt: Date;
}

type ListItemReadResponse = components["schemas"]["ListItemReadResponse"];
type EmptyResponse = Record<string, never>;

export const itemReadQueryOptions = {
  queryKey: ["item-reads"] as const,
  refetchInterval: 1 * 60 * 1000,
  queryFn: async () => {
    const anchor = lastReadFetched();
    if (!anchor) {
      return [];
    }

    const existingData =
      queryClient.getQueryData<ItemRead[]>(["item-reads"]) || [];

    let pageToken = "";
    const allNewReads: ItemRead[] = [];
    let maxServerUpdatedAt: Date | undefined;

    do {
      const params = new URLSearchParams();
      params.set("pageSize", "1000");
      if (pageToken) {
        params.set("pageToken", pageToken);
      } else if (anchor) {
        params.set("since", anchor.toISOString());
      }
      const response = await apiClient.get<ListItemReadResponse>(
        `/item-reads?${params.toString()}`,
      );

      for (const ir of response.itemReads || []) {
        const parsedUpdatedAt = new Date(ir.updatedAt);
        const updatedAtDate = Number.isNaN(parsedUpdatedAt.getTime())
          ? (anchor ?? new Date(0))
          : parsedUpdatedAt;

        if (
          !maxServerUpdatedAt ||
          updatedAtDate.getTime() > maxServerUpdatedAt.getTime()
        ) {
          maxServerUpdatedAt = updatedAtDate;
        }

        allNewReads.push({
          id: ir.itemId,
          isRead: ir.isRead,
          updatedAt: updatedAtDate,
        });
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    if (maxServerUpdatedAt) {
      if (!anchor || maxServerUpdatedAt.getTime() > anchor.getTime()) {
        setLastReadFetched(maxServerUpdatedAt);
      }
    }

    const readMap = new Map<string, ItemRead>();
    for (const read of existingData) {
      readMap.set(read.id, read);
    }
    for (const read of allNewReads) {
      readMap.set(read.id, read);
    }

    return Array.from(readMap.values());
  },
};

export const updateItemReadStatus = async (ids: string[], isRead: boolean) => {
  const queryKey = ["item-reads"] as const;
  const existingData = queryClient.getQueryData<ItemRead[]>(queryKey) || [];
  const previousStates = existingData.filter((d) => ids.includes(d.id));

  queryClient.setQueryData(queryKey, (old: ItemRead[] | undefined) => {
    const readMap = new Map<string, ItemRead>();
    for (const read of old || []) {
      readMap.set(read.id, read);
    }
    for (const id of ids) {
      readMap.set(id, { id, isRead, updatedAt: new Date() });
    }
    return Array.from(readMap.values());
  });

  try {
    await apiClient.post<EmptyResponse>("/items/status", {
      ids,
      isRead,
    });
  } catch (e) {
    console.warn("Failed to update item status on server, rolling back", e);

    queryClient.setQueryData(queryKey, (old: ItemRead[] | undefined) => {
      const readMap = new Map<string, ItemRead>();
      for (const read of old || []) {
        readMap.set(read.id, read);
      }
      const previousIds = new Set(previousStates.map((s) => s.id));
      for (const id of ids) {
        if (previousIds.has(id)) {
          const prevState = previousStates.find((s) => s.id === id);
          if (prevState) readMap.set(id, prevState);
        } else {
          readMap.delete(id);
        }
      }
      return Array.from(readMap.values());
    });
    throw e;
  }
};

export const markItemsRead = updateItemReadStatus;
