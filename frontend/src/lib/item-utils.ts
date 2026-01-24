export interface Item {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  feedId: string;
  isRead: boolean;
  isSaved: boolean;
}

export enum SortOrder {
  UNSPECIFIED = 0,
  DESC = 1,
  ASC = 2,
}

export interface ItemFilters {
  feedId?: string;
  isRead?: boolean;
  isSaved?: boolean;
  sortOrder?: SortOrder;
}

export const filterAndSortItems = (
  items: Item[],
  filters: ItemFilters,
): Item[] => {
  let result = [...items];

  if (filters.feedId) {
    result = result.filter((item) => item.feedId === filters.feedId);
  }
  if (filters.isRead !== undefined) {
    result = result.filter((item) => item.isRead === filters.isRead);
  }
  if (filters.isSaved !== undefined) {
    result = result.filter((item) => item.isSaved === filters.isSaved);
  }

  if (filters.sortOrder === SortOrder.ASC) {
    result.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  } else if (
    filters.sortOrder === SortOrder.DESC ||
    filters.sortOrder === SortOrder.UNSPECIFIED
  ) {
    // Default to DESC
    result.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  return result;
};
