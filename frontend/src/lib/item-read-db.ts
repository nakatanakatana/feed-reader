import { itemClient } from "./api/client";
import { lastReadFetched, setLastReadFetched } from "./item-sync-state";
import { dateToTimestamp } from "./item-utils";
import { queryClient } from "./query";

export interface ItemRead {
  id: string;
  isRead: boolean;
  updatedAt: Date;
}

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
      const response = await itemClient.listItemRead({
        since: !pageToken && anchor ? dateToTimestamp(anchor) : undefined,
        pageToken: pageToken,
        pageSize: 1000,
      });

      for (const ir of response.itemReads || []) {
        let updatedAtDate: Date;

        if (ir.updatedAt) {
          updatedAtDate = new Date(
            Number(ir.updatedAt.seconds) * 1000 +
              Math.floor(ir.updatedAt.nanos / 1000000),
          );

          if (
            !maxServerUpdatedAt ||
            updatedAtDate.getTime() > maxServerUpdatedAt.getTime()
          ) {
            maxServerUpdatedAt = updatedAtDate;
          }
        } else {
          updatedAtDate = anchor ?? new Date(0);
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

  // Optimistic update
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
    await itemClient.updateItemStatus({
      ids: ids,
      isRead: isRead,
    });
  } catch (e) {
    console.warn("Failed to update item status on server, rolling back", e);

    // Rollback
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
