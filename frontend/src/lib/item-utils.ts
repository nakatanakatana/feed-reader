export interface Item {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
  createdAt: string;
  feedId: string;
  isRead: boolean;
}

export enum SortOrder {
  UNSPECIFIED = 0,
  DESC = 1,
  ASC = 2,
}

export interface ItemFilters {
  feedId?: string;
  isRead?: boolean;
  sortOrder?: SortOrder;
}

export const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (_e) {
    return dateString;
  }
};

export const getItemDisplayDate = (
  item: Pick<Item, "publishedAt" | "createdAt">,
) => {
  if (item.publishedAt) {
    return {
      label: "Published",
      labelJa: "公開日",
      date: item.publishedAt,
    };
  }
  return {
    label: "Received",
    labelJa: "受信日",
    date: item.createdAt,
  };
};

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

  const getSortKey = (item: Item) => item.publishedAt || item.createdAt;

  if (filters.sortOrder === SortOrder.ASC) {
    result.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
  } else if (
    filters.sortOrder === SortOrder.DESC ||
    filters.sortOrder === SortOrder.UNSPECIFIED
  ) {
    // Default to DESC
    result.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
  }

  return result;
};
