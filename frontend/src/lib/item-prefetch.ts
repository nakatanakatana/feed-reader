import { queryClient } from "./query";
import { getItem } from "./item-db";

/**
 * Prefetches item data for the given item IDs to improve navigation speed.
 * Uses TanStack Query's prefetchQuery to cache the data.
 * Skips items that are already in the cache.
 * @param itemIds Array of item IDs to prefetch.
 */
export async function prefetchItems(itemIds: string[]) {
  if (!itemIds || itemIds.length === 0) return;

  const prefetchPromises = itemIds
    .filter((id) => id !== "end-of-list" && !queryClient.getQueryData(["item", id]))
    .map((id) => {
      return queryClient.prefetchQuery({
        queryKey: ["item", id],
        queryFn: async () => {
          return await getItem(id);
        },
        staleTime: 5 * 60 * 1000, // Consider prefetched data fresh for 5 minutes
      });
    });

  await Promise.all(prefetchPromises);
}

/**
 * Calculates the IDs of items to prefetch based on the current index.
 * Returns up to 3 items before and 3 items after the current index.
 * @param currentIndex The index of the item currently being viewed.
 * @param allItems The full list of items in the current view.
 * @returns Array of item IDs to prefetch.
 */
export function getPrefetchIds(
  currentIndex: number,
  allItems: { id: string }[],
): string[] {
  if (currentIndex < 0 || !allItems || allItems.length === 0) {
    return [];
  }

  const ids: string[] = [];
  const prefetchWindow = 3;

  // Items before
  for (
    let i = Math.max(0, currentIndex - prefetchWindow);
    i < currentIndex;
    i++
  ) {
    ids.push(allItems[i].id);
  }

  // Items after
  for (
    let i = currentIndex + 1;
    i <= Math.min(allItems.length - 1, currentIndex + prefetchWindow);
    i++
  ) {
    ids.push(allItems[i].id);
  }

  return ids;
}
